use crate::draft_payloads::build_lcu_rune_page;
use crate::lockfile::{candidate_lockfile_paths, map_riot_region_to_opgg, LcuLockfile};
use crate::skin_vault::{OwnedSkinEntry, SkinRarity};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

/// Ranked queue standing directly read from the local League Client.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuRankedQueueDto {
    pub queue_type: String,
    pub tier: String,
    pub division: String,
    pub league_points: i32,
    pub wins: u32,
    pub losses: u32,
}

/// Active Champion Select state read strictly from official `/lol-champ-select/v1/session`.
/// Preserves ranked lobby anonymity by never reading enemy identity fields.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuChampSelectContext {
    pub phase: String,
    pub assigned_position: String,
    pub champion_id: i32,
    pub spell1_id: i32,
    pub spell2_id: i32,
    pub enemy_champion_ids: Vec<i32>,
}

/// Logged-in League of Legends account context detected automatically via LCU.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuPlayerContext {
    pub connected: bool,
    pub base_url: Option<String>,
    pub port: Option<u16>,
    pub game_name: String,
    pub tag_line: String,
    pub summoner_id: i64,
    pub puuid: String,
    pub summoner_level: u32,
    pub profile_icon_id: i32,
    pub region: String,
    pub opgg_region: String,
    pub solo_ranked: Option<LcuRankedQueueDto>,
    pub flex_ranked: Option<LcuRankedQueueDto>,
    pub champ_select: Option<LcuChampSelectContext>,
}

/// Result returned when importing OP.GG runes directly into LCU `/lol-perks/v1/pages`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuRuneImportResult {
    pub imported: bool,
    pub page_name: String,
    pub page_id: Option<i64>,
    pub message: String,
}

fn lcu_http_client(lock: &LcuLockfile) -> Result<(Client, String, String), String> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(4))
        .build()
        .map_err(|e| format!("Failed to construct LCU client: {e}"))?;
    Ok((client, lock.base_url(), lock.basic_auth_header()))
}

fn lcu_get_json(client: &Client, base: &str, auth: &str, path: &str) -> Result<Value, String> {
    let url = format!("{base}{path}");
    let resp = client
        .get(&url)
        .header("Authorization", auth)
        .send()
        .map_err(|e| format!("LCU GET {path} failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("LCU GET {path} returned HTTP {}", resp.status()));
    }
    resp.json::<Value>()
        .map_err(|e| format!("Invalid LCU JSON from {path}: {e}"))
}

fn lcu_post_json<T: Serialize>(
    client: &Client,
    base: &str,
    auth: &str,
    path: &str,
    body: &T,
) -> Result<Value, String> {
    let url = format!("{base}{path}");
    let resp = client
        .post(&url)
        .header("Authorization", auth)
        .json(body)
        .send()
        .map_err(|e| format!("LCU POST {path} failed: {e}"))?;
    let status = resp.status();
    let text = resp.text().unwrap_or_default();
    if !status.is_success() {
        return Err(format!("LCU POST {path} returned HTTP {status}: {text}"));
    }
    Ok(serde_json::from_str::<Value>(&text).unwrap_or(Value::Null))
}

fn lcu_delete(client: &Client, base: &str, auth: &str, path: &str) -> Result<(), String> {
    let url = format!("{base}{path}");
    let resp = client
        .delete(&url)
        .header("Authorization", auth)
        .send()
        .map_err(|e| format!("LCU DELETE {path} failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("LCU DELETE {path} returned HTTP {}", resp.status()));
    }
    Ok(())
}

fn find_active_lcu_lockfile() -> Option<(LcuLockfile, Client, Value)> {
    for path in candidate_lockfile_paths() {
        let Ok(raw) = std::fs::read_to_string(&path) else {
            continue;
        };
        let Ok(lock) = LcuLockfile::parse(&raw) else {
            continue;
        };
        let Ok((client, base, auth)) = lcu_http_client(&lock) else {
            continue;
        };
        let Ok(summoner) = lcu_get_json(&client, &base, &auth, "/lol-summoner/v1/current-summoner")
        else {
            continue;
        };
        if summoner.get("summonerId").is_some()
            || summoner.get("gameName").is_some()
            || summoner.get("displayName").is_some()
        {
            return Some((lock, client, summoner));
        }
    }
    None
}

fn json_i32(val: &Value) -> Option<i32> {
    val.as_i64().and_then(|n| i32::try_from(n).ok())
}

fn json_u32(val: &Value) -> Option<u32> {
    val.as_u64().and_then(|n| u32::try_from(n).ok())
}

/// Parses Solo/Duo and Flex queues from LCU `/lol-ranked/v1/current-ranked-stats`.
pub fn parse_lcu_ranked_stats(
    json: &Value,
) -> (Option<LcuRankedQueueDto>, Option<LcuRankedQueueDto>) {
    let Some(queues) = json.get("queues").and_then(|q| q.as_array()) else {
        return (None, None);
    };

    let mut solo = None;
    let mut flex = None;
    for q in queues {
        let queue_type = q["queueType"].as_str().unwrap_or("");
        let tier = q["tier"].as_str().unwrap_or("");
        if tier.is_empty()
            || tier.eq_ignore_ascii_case("NONE")
            || tier.eq_ignore_ascii_case("UNRANKED")
        {
            continue;
        }
        let dto = LcuRankedQueueDto {
            queue_type: queue_type.to_string(),
            tier: tier.to_string(),
            division: q["division"].as_str().unwrap_or("").to_string(),
            league_points: json_i32(&q["leaguePoints"]).unwrap_or(0),
            wins: json_u32(&q["wins"]).unwrap_or(0),
            losses: json_u32(&q["losses"]).unwrap_or(0),
        };
        if queue_type == "RANKED_SOLO_5x5" {
            solo = Some(dto);
        } else if queue_type == "RANKED_FLEX_SR" {
            flex = Some(dto);
        }
    }
    (solo, flex)
}

fn find_action_champion_id(json: &Value, local_cell: i64) -> i32 {
    let Some(actions) = json.get("actions").and_then(|v| v.as_array()) else {
        return 0;
    };
    let mut found = 0;
    for items in actions.iter().filter_map(|group| group.as_array()) {
        for action in items {
            if action["actorCellId"].as_i64() == Some(local_cell)
                && action["type"].as_str() == Some("pick")
            {
                let act_champ = json_i32(&action["championId"]).unwrap_or(0);
                if act_champ > 0 {
                    found = act_champ;
                }
            }
        }
    }
    found
}

/// Parses active champion select picks cleanly from `/lol-champ-select/v1/session`.
pub fn parse_lcu_champ_select(json: &Value) -> Option<LcuChampSelectContext> {
    let local_cell = json["localPlayerCellId"].as_i64()?;
    let my_team = json.get("myTeam").and_then(|v| v.as_array())?;
    let local_member = my_team
        .iter()
        .find(|m| m["cellId"].as_i64() == Some(local_cell))?;

    let mut champion_id = json_i32(&local_member["championId"]).unwrap_or(0);
    if champion_id <= 0 {
        champion_id = json_i32(&local_member["championPickIntent"]).unwrap_or(0);
    }
    if champion_id <= 0 {
        champion_id = find_action_champion_id(json, local_cell);
    }

    let enemy_champion_ids = json
        .get("theirTeam")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| json_i32(&m["championId"]))
                .filter(|id| *id > 0)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Some(LcuChampSelectContext {
        phase: json["timer"]["phase"]
            .as_str()
            .unwrap_or("CHAMP_SELECT")
            .to_string(),
        assigned_position: local_member["assignedPosition"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        champion_id,
        spell1_id: json_i32(&local_member["spell1Id"]).unwrap_or(0),
        spell2_id: json_i32(&local_member["spell2Id"]).unwrap_or(0),
        enemy_champion_ids,
    })
}

/// Parses owned skins from LCU `/lol-champions/v1/inventories/{summonerId}/champions-minimal`.
pub fn parse_lcu_owned_skins(json: &Value) -> Vec<OwnedSkinEntry> {
    let Some(champions) = json.as_array() else {
        return Vec::new();
    };
    let mut owned = Vec::new();
    for champ in champions {
        let champ_name = champ["name"].as_str().unwrap_or("").to_string();
        let Some(skins) = champ.get("skins").and_then(|s| s.as_array()) else {
            continue;
        };
        for skin in skins {
            let is_owned = skin["ownership"]["owned"].as_bool().unwrap_or(false);
            let is_base = skin["isBase"].as_bool().unwrap_or(false);
            if !is_owned || is_base {
                continue;
            }
            let rarity_str = skin["rarityGemPath"]
                .as_str()
                .or_else(|| skin["rarity"].as_str())
                .unwrap_or("NoRarity");
            owned.push(OwnedSkinEntry {
                skin_id: json_i32(&skin["id"]).unwrap_or(0),
                champion_name: champ_name.clone(),
                name: skin["name"].as_str().unwrap_or("Unknown Skin").to_string(),
                is_base,
                owned: is_owned,
                rarity: SkinRarity::from_cdragon_str(rarity_str),
            });
        }
    }
    owned
}

/// Probes the local League Client and returns the currently logged-in account & lobby context.
pub fn fetch_lcu_player_context() -> Option<LcuPlayerContext> {
    let (lock, client, summoner) = find_active_lcu_lockfile()?;
    let base = lock.base_url();
    let auth = lock.basic_auth_header();

    let raw_game_name = summoner["gameName"]
        .as_str()
        .filter(|s| !s.is_empty())
        .or_else(|| summoner["displayName"].as_str())
        .unwrap_or("")
        .to_string();
    let tag_line = summoner["tagLine"].as_str().unwrap_or("").to_string();
    let summoner_id = summoner["summonerId"].as_i64().unwrap_or(0);
    let puuid = summoner["puuid"].as_str().unwrap_or("").to_string();
    let summoner_level = json_u32(&summoner["summonerLevel"]).unwrap_or(0);
    let profile_icon_id = json_i32(&summoner["profileIconId"]).unwrap_or(1);

    let region_raw = lcu_get_json(&client, &base, &auth, "/riotclient/region-locale")
        .ok()
        .and_then(|v| {
            v["region"]
                .as_str()
                .or_else(|| v["webRegion"].as_str())
                .map(ToOwned::to_owned)
        })
        .or_else(|| {
            lcu_get_json(&client, &base, &auth, "/lol-chat/v1/me")
                .ok()
                .and_then(|v| v["platformId"].as_str().map(ToOwned::to_owned))
        })
        .unwrap_or_else(|| "KR".to_string());
    let opgg_region = map_riot_region_to_opgg(&region_raw).to_string();

    let (solo_ranked, flex_ranked) =
        lcu_get_json(&client, &base, &auth, "/lol-ranked/v1/current-ranked-stats")
            .ok()
            .map(|v| parse_lcu_ranked_stats(&v))
            .unwrap_or((None, None));

    let champ_select = lcu_get_json(&client, &base, &auth, "/lol-champ-select/v1/session")
        .ok()
        .and_then(|v| parse_lcu_champ_select(&v));

    Some(LcuPlayerContext {
        connected: true,
        base_url: Some(base),
        port: Some(lock.port),
        game_name: raw_game_name,
        tag_line,
        summoner_id,
        puuid,
        summoner_level,
        profile_icon_id,
        region: region_raw,
        opgg_region,
        solo_ranked,
        flex_ranked,
        champ_select,
    })
}

/// Imports an OP.GG rune setup straight into League Client `/lol-perks/v1/pages`.
pub fn import_rune_page_to_lcu(
    champion_name: &str,
    primary_style_id: i32,
    sub_style_id: i32,
    selected_perk_ids: [i32; 9],
) -> Result<LcuRuneImportResult, String> {
    if primary_style_id <= 0 || sub_style_id <= 0 || selected_perk_ids[0] <= 0 {
        return Err(
            "Invalid rune IDs. Load an OP.GG champion build before importing runes.".to_string(),
        );
    }

    let (lock, client, _summoner) = find_active_lcu_lockfile().ok_or_else(|| {
        "League Client is not running. Open League of Legends to import OP.GG runes directly."
            .to_string()
    })?;
    let base = lock.base_url();
    let auth = lock.basic_auth_header();

    let pages = lcu_get_json(&client, &base, &auth, "/lol-perks/v1/pages")?;
    let mut editable_ids = Vec::new();
    if let Some(arr) = pages.as_array() {
        for page in arr {
            let id = page["id"].as_i64();
            let name = page["name"].as_str().unwrap_or("");
            let is_editable = page["isEditable"].as_bool().unwrap_or(false);
            let is_temporary = page["isTemporary"].as_bool().unwrap_or(false);
            if let Some(pid) = id {
                if is_editable && name.starts_with("Baron:") {
                    let _ =
                        lcu_delete(&client, &base, &auth, &format!("/lol-perks/v1/pages/{pid}"));
                } else if is_editable && !is_temporary {
                    editable_ids.push(pid);
                }
            }
        }
    }

    let payload = build_lcu_rune_page(
        champion_name,
        primary_style_id,
        sub_style_id,
        selected_perk_ids,
    );

    let created = match lcu_post_json(&client, &base, &auth, "/lol-perks/v1/pages", &payload) {
        Ok(val) => val,
        Err(first_err) => {
            if let Some(fallback_id) = editable_ids.last().copied() {
                lcu_delete(
                    &client,
                    &base,
                    &auth,
                    &format!("/lol-perks/v1/pages/{fallback_id}"),
                )?;
                lcu_post_json(&client, &base, &auth, "/lol-perks/v1/pages", &payload)?
            } else {
                return Err(first_err);
            }
        }
    };

    let page_id = created["id"].as_i64();
    Ok(LcuRuneImportResult {
        imported: true,
        page_name: payload.name.clone(),
        page_id,
        message: format!("Imported \"{}\" into League Client", payload.name),
    })
}

/// Fetches owned champion skins directly from the running League Client inventory.
pub fn fetch_lcu_owned_skins() -> Result<Vec<OwnedSkinEntry>, String> {
    let (lock, client, summoner) = find_active_lcu_lockfile().ok_or_else(|| {
        "League Client is offline. Launch League of Legends to sync your personal skin vault."
            .to_string()
    })?;
    let summoner_id = summoner["summonerId"]
        .as_i64()
        .ok_or_else(|| "Connected LCU account missing summonerId.".to_string())?;
    let base = lock.base_url();
    let auth = lock.basic_auth_header();
    let json = lcu_get_json(
        &client,
        &base,
        &auth,
        &format!("/lol-champions/v1/inventories/{summoner_id}/champions-minimal"),
    )?;
    Ok(parse_lcu_owned_skins(&json))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ranked_stats_and_filters_unranked_queues() {
        let json = serde_json::json!({
            "queues": [
                {
                    "queueType": "RANKED_SOLO_5x5",
                    "tier": "EMERALD",
                    "division": "II",
                    "leaguePoints": 64,
                    "wins": 58,
                    "losses": 49
                },
                {
                    "queueType": "RANKED_FLEX_SR",
                    "tier": "NONE",
                    "division": "",
                    "leaguePoints": 0,
                    "wins": 0,
                    "losses": 0
                }
            ]
        });
        let (solo, flex) = parse_lcu_ranked_stats(&json);
        let solo = solo.expect("solo ranked queue parsed");
        assert_eq!(solo.tier, "EMERALD");
        assert_eq!(solo.division, "II");
        assert_eq!(solo.league_points, 64);
        assert!(flex.is_none());
    }

    #[test]
    fn parses_champ_select_pick_and_intent_safely() {
        let json = serde_json::json!({
            "localPlayerCellId": 2,
            "timer": { "phase": "FINALIZATION" },
            "myTeam": [
                {
                    "cellId": 2,
                    "assignedPosition": "middle",
                    "championId": 0,
                    "championPickIntent": 103,
                    "spell1Id": 4,
                    "spell2Id": 14
                }
            ],
            "theirTeam": [
                { "cellId": 5, "championId": 777 },
                { "cellId": 6, "championId": 0 }
            ]
        });
        let cs = parse_lcu_champ_select(&json).expect("champ select parsed");
        assert_eq!(cs.champion_id, 103);
        assert_eq!(cs.assigned_position, "middle");
        assert_eq!(cs.enemy_champion_ids, vec![777]);
    }

    #[test]
    fn parses_owned_non_base_skins_from_lcu_inventory() {
        let json = serde_json::json!([
            {
                "id": 103,
                "name": "Ahri",
                "skins": [
                    { "id": 103000, "championId": 103, "name": "Ahri", "isBase": true, "ownership": { "owned": true } },
                    { "id": 103027, "championId": 103, "name": "Spirit Blossom Ahri", "isBase": false, "rarityGemPath": "kLegendary", "ownership": { "owned": true } },
                    { "id": 103085, "championId": 103, "name": "Immortalized Legend Ahri", "isBase": false, "rarityGemPath": "kTranscendent", "ownership": { "owned": false } }
                ]
            }
        ]);
        let skins = parse_lcu_owned_skins(&json);
        assert_eq!(skins.len(), 1);
        assert_eq!(skins[0].name, "Spirit Blossom Ahri");
        assert_eq!(skins[0].rarity, SkinRarity::Legendary);
    }
}
