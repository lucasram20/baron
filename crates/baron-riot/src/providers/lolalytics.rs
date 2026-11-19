use crate::opgg_modes::{normalize_ddragon_champion_key, OpggCatalogEntry, OpggModeTierEntry};
use baron_core::models::Role;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

const LOLALYTICS_MEGA_BASE: &str = "https://a1.lolalytics.com/mega/";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LolalyticsRuneSet {
    pub primary_style: u64,
    pub sub_style: u64,
    pub primary_perks: Vec<u64>,
    pub secondary_perks: Vec<u64>,
    pub stat_shards: Vec<u64>,
    pub win_rate: f64,
    pub games: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LolalyticsItemBuild {
    pub item_ids: Vec<u64>,
    pub games: u64,
    pub wins: u64,
    pub win_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LolalyticsCounterEntry {
    pub champion_id: u32,
    pub champion_key: String,
    pub champion_name: String,
    pub win_rate: f64,
    pub games: u64,
    pub delta1: f64,
    pub delta2: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LolalyticsSynergyEntry {
    pub champion_id: u32,
    pub champion_key: String,
    pub champion_name: String,
    pub role: Role,
    pub win_rate: f64,
    pub delta1: f64,
    pub games: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LolalyticsBuildResponse {
    pub champion_id: u32,
    pub champion_key: String,
    pub champion_name: String,
    pub patch: String,
    pub role: Role,
    pub tier_label: String,
    pub win_rate: f64,
    pub pick_rate: f64,
    pub ban_rate: f64,
    pub games: u64,
    pub avg_win_rate: f64,
    pub most_common_runes: Option<LolalyticsRuneSet>,
    pub highest_wr_runes: Option<LolalyticsRuneSet>,
    pub core_paths: Vec<LolalyticsItemBuild>,
    pub first_items: Vec<LolalyticsItemBuild>,
    pub second_items: Vec<LolalyticsItemBuild>,
    pub third_items: Vec<LolalyticsItemBuild>,
    pub strong_against: Vec<LolalyticsCounterEntry>,
    pub weak_against: Vec<LolalyticsCounterEntry>,
    pub synergies: Vec<LolalyticsSynergyEntry>,
    pub endpoint_url: String,
}

/// Convert a DDragon champion key or display name into a LoLalytics `c=` query slug.
pub fn lolalytics_champ_slug(key_or_name: &str) -> String {
    let clean: String = key_or_name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect();
    match clean.as_str() {
        "monkeyking" => "wukong".to_string(),
        "nunuwillump" => "nunu".to_string(),
        "renataglasc" => "renata".to_string(),
        _ => clean,
    }
}

/// Verified mapping from LoLalytics `page.{pri,sec}` tree index (0..4) to Riot perk style IDs.
pub fn lolalytics_tree_to_riot_style_id(tree_idx: u64) -> u64 {
    match tree_idx {
        0 => 8000, // Precision
        1 => 8100, // Domination
        2 => 8200, // Sorcery
        3 => 8400, // Resolve
        4 => 8300, // Inspiration
        other => other,
    }
}

pub fn lolalytics_lane_slug(role: Role) -> &'static str {
    match role {
        Role::Top => "top",
        Role::Jungle => "jungle",
        Role::Middle | Role::Unknown => "middle",
        Role::Bottom => "bottom",
        Role::Utility => "support",
    }
}

fn parse_lolalytics_role(slug: &str) -> Role {
    match slug.trim().to_ascii_lowercase().as_str() {
        "top" => Role::Top,
        "jungle" => Role::Jungle,
        "middle" | "mid" => Role::Middle,
        "bottom" | "adc" => Role::Bottom,
        "support" | "utility" => Role::Utility,
        _ => Role::Unknown,
    }
}

pub fn lolalytics_tier_slug(tier: &str) -> &'static str {
    let norm = tier.trim().to_ascii_lowercase().replace([' ', '-'], "_");
    match norm.as_str() {
        "all" | "overall" => "all",
        "iron" => "iron",
        "bronze" => "bronze",
        "silver" => "silver",
        "gold" | "gold_plus" => "gold_plus",
        "platinum" | "platinum_plus" => "platinum_plus",
        "emerald" | "emerald_plus" => "emerald_plus",
        "diamond" | "diamond_plus" => "diamond_plus",
        "master" | "master_plus" => "master_plus",
        "grandmaster" | "grandmaster_plus" => "grandmaster_plus",
        "challenger" => "challenger",
        _ => "emerald_plus",
    }
}

fn lolalytics_tier_display(slug: &str) -> String {
    match slug {
        "all" => "All Ranks".to_string(),
        "emerald_plus" => "Emerald+".to_string(),
        "diamond_plus" => "Diamond+".to_string(),
        "master_plus" => "Master+".to_string(),
        "platinum_plus" => "Platinum+".to_string(),
        "gold_plus" => "Gold+".to_string(),
        other => other.replace('_', " "),
    }
}

pub fn lolalytics_bucket_to_label(bucket: u32) -> &'static str {
    match bucket {
        1 => "S+",
        2 => "S",
        3 => "S-",
        4 => "A+",
        5 => "A",
        6 => "A-",
        7 => "B+",
        8 => "B",
        9 => "B-",
        10 => "C+",
        11 => "C",
        12 => "C-",
        13 => "D+",
        14 => "D",
        _ => "D-",
    }
}

fn value_f64(v: Option<&Value>) -> f64 {
    v.and_then(|x| {
        x.as_f64()
            .or_else(|| x.as_str().and_then(|s| s.parse::<f64>().ok()))
    })
    .unwrap_or(0.0)
}

fn value_u64(v: Option<&Value>) -> u64 {
    v.and_then(|x| {
        x.as_u64()
            .or_else(|| x.as_str().and_then(|s| s.parse::<u64>().ok()))
    })
    .unwrap_or(0)
}

fn value_u64_vec(v: Option<&Value>) -> Vec<u64> {
    v.and_then(|x| x.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|i| {
                    i.as_u64()
                        .or_else(|| i.as_str().and_then(|s| s.parse::<u64>().ok()))
                })
                .collect()
        })
        .unwrap_or_default()
}

fn normalize_patch_param(patch: Option<&str>, period: Option<&str>) -> String {
    if let Some(p) = period.map(str::trim).filter(|s| !s.is_empty()) {
        let lower = p.to_ascii_lowercase();
        if lower == "7d" || lower == "7" {
            return "7".to_string();
        }
        if lower == "14d" || lower == "14" {
            return "14".to_string();
        }
        if lower == "30d" || lower == "30" {
            return "30".to_string();
        }
    }
    if let Some(p) = patch.map(str::trim).filter(|s| !s.is_empty()) {
        let mut parts = p.split('.').take(2);
        if let (Some(maj), Some(min)) = (parts.next(), parts.next()) {
            if !maj.is_empty() && !min.is_empty() {
                return format!("{maj}.{min}");
            }
        }
        return p.to_string();
    }
    "7".to_string()
}

/// Parse an observed `a1.lolalytics.com/mega/?ep=tier...` JSON payload into normalized tier rows.
pub fn parse_lolalytics_tier_json(
    root: &Value,
    role: Role,
    catalog_by_id: &HashMap<u32, OpggCatalogEntry>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    let valid = root
        .get("response")
        .and_then(|r| r.get("valid"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let Some(tier_map) = root.get("tier").and_then(|v| v.as_object()) else {
        return Err(if valid {
            "LoLalytics tier response contained no tier buckets".to_string()
        } else {
            "LoLalytics tier response was invalid or empty".to_string()
        });
    };

    let lane_key = lolalytics_lane_slug(role);
    let mut out = Vec::new();

    for (bucket_str, bucket_val) in tier_map {
        let bucket_num = bucket_str.parse::<u32>().unwrap_or(15);
        let tier_label = lolalytics_bucket_to_label(bucket_num).to_string();
        let Some(cid_map) = bucket_val
            .get("lane")
            .and_then(|l| l.get(lane_key))
            .and_then(|l| l.get("cid"))
            .and_then(|c| c.as_object())
        else {
            continue;
        };

        for (cid_str, stats) in cid_map {
            let Ok(cid) = cid_str.parse::<u32>() else {
                continue;
            };
            let games = value_u64(stats.get("games"));
            if games == 0 {
                continue;
            }
            let (champ_key, champ_name) = if let Some(meta) = catalog_by_id.get(&cid) {
                (normalize_ddragon_champion_key(&meta.key), meta.name.clone())
            } else {
                (format!("Champion{cid}"), format!("Champion #{cid}"))
            };
            let rank = value_u64(stats.get("rank")) as u32;
            out.push(OpggModeTierEntry {
                champion_id: cid,
                champion_key: champ_key,
                champion_name: champ_name,
                mode: "ranked".to_string(),
                role,
                tier: tier_label.clone(),
                rank,
                win_rate: value_f64(stats.get("wr")),
                pick_rate: value_f64(stats.get("pr")),
                ban_rate: value_f64(stats.get("br")),
                kda: 0.0,
                play: games,
                avg_place: None,
                first_rate: None,
                top2_rate: None,
            });
        }
    }

    if out.is_empty() {
        return Err("LoLalytics tier response contained zero champions for this lane".to_string());
    }

    out.sort_by_key(|e| (e.rank == 0, e.rank, std::cmp::Reverse(e.play)));
    Ok(out)
}

/// Fetch live Ranked Solo/Duo lane tier list directly from `a1.lolalytics.com/mega/?ep=tier`.
pub fn fetch_lolalytics_tier_list(
    role: Role,
    tier: &str,
    patch: Option<&str>,
    period: Option<&str>,
    catalog_by_id: &HashMap<u32, OpggCatalogEntry>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    let target_role = if role == Role::Unknown {
        Role::Top
    } else {
        role
    };
    let lane = lolalytics_lane_slug(target_role);
    let tier_slug = lolalytics_tier_slug(tier);
    let patch_param = normalize_patch_param(patch, period);

    let url = format!(
        "{LOLALYTICS_MEGA_BASE}?ep=tier&p=d&v=1&patch={patch_param}&lane={lane}&tier={tier_slug}&queue=ranked&region=all"
    );
    match crate::providers::http_get_json(&url)
        .and_then(|json| parse_lolalytics_tier_json(&json, target_role, catalog_by_id))
    {
        Ok(rows) => Ok(rows),
        Err(_) if patch_param != "7" => {
            let fallback_url = format!(
                "{LOLALYTICS_MEGA_BASE}?ep=tier&p=d&v=1&patch=7&lane={lane}&tier={tier_slug}&queue=ranked&region=all"
            );
            let json = crate::providers::http_get_json(&fallback_url)?;
            parse_lolalytics_tier_json(&json, target_role, catalog_by_id)
        }
        Err(e) => Err(e),
    }
}

pub fn parse_lolalytics_rune_block(block: Option<&Value>) -> Option<LolalyticsRuneSet> {
    let obj = block?.as_object()?;
    let page = obj.get("page")?;
    let set = obj.get("set")?;
    let pri_idx = value_u64(page.get("pri"));
    let sec_idx = value_u64(page.get("sec"));
    let primary_perks = value_u64_vec(set.get("pri"));
    let secondary_perks = value_u64_vec(set.get("sec"));
    let stat_shards = value_u64_vec(set.get("mod"));
    if primary_perks.is_empty() {
        return None;
    }
    Some(LolalyticsRuneSet {
        primary_style: lolalytics_tree_to_riot_style_id(pri_idx),
        sub_style: lolalytics_tree_to_riot_style_id(sec_idx),
        primary_perks,
        secondary_perks,
        stat_shards,
        win_rate: value_f64(obj.get("wr")),
        games: value_u64(obj.get("n")),
    })
}

fn parse_item_ids_key(raw: &str) -> Vec<u64> {
    raw.split('_')
        .filter_map(|s| s.parse::<u64>().ok())
        .filter(|&id| id > 0)
        .collect()
}

/// Parse LoLalytics `ep=build-itemset` (`[item_ids_joined, games, wins]`) into core paths & 1st/2nd/3rd item rankings.
pub fn parse_lolalytics_itemsets(
    root: &Value,
) -> (
    Vec<LolalyticsItemBuild>,
    Vec<LolalyticsItemBuild>,
    Vec<LolalyticsItemBuild>,
    Vec<LolalyticsItemBuild>,
) {
    let Some(sets) = root.get("itemSets").and_then(|v| v.as_object()) else {
        return (vec![], vec![], vec![], vec![]);
    };

    // Core paths: prefer itemBootSet4 (boots + 3 legendaries) merged with itemSet3 when sparse.
    let mut core_paths: Vec<LolalyticsItemBuild> = Vec::new();
    for key in ["itemBootSet4", "itemSet3"] {
        if !core_paths.is_empty() {
            break;
        }
        if let Some(rows) = sets.get(key).and_then(|v| v.as_array()) {
            for row in rows {
                let Some(cols) = row.as_array() else { continue };
                let Some(id_str) = cols.first().and_then(|v| v.as_str()) else {
                    continue;
                };
                let games = value_u64(cols.get(1));
                let wins = value_u64(cols.get(2));
                if games < 10 {
                    continue;
                }
                let item_ids = parse_item_ids_key(id_str);
                if item_ids.len() < 3 {
                    continue;
                }
                core_paths.push(LolalyticsItemBuild {
                    item_ids,
                    games,
                    wins,
                    win_rate: (wins as f64 / games as f64) * 100.0,
                });
            }
        }
    }
    core_paths.sort_by_key(|b| std::cmp::Reverse(b.games));
    core_paths.truncate(6);

    // Aggregate 1st, 2nd, and 3rd completed legendary items across itemSet1..5.
    let mut slot_totals: [HashMap<u64, (u64, u64)>; 3] =
        [HashMap::new(), HashMap::new(), HashMap::new()];
    for key in ["itemSet1", "itemSet2", "itemSet3", "itemSet4", "itemSet5"] {
        let Some(rows) = sets.get(key).and_then(|v| v.as_array()) else {
            continue;
        };
        for row in rows {
            let Some(cols) = row.as_array() else { continue };
            let Some(id_str) = cols.first().and_then(|v| v.as_str()) else {
                continue;
            };
            let games = value_u64(cols.get(1));
            let wins = value_u64(cols.get(2));
            if games == 0 {
                continue;
            }
            let ids = parse_item_ids_key(id_str);
            for (idx, &item_id) in ids.iter().take(3).enumerate() {
                let entry = slot_totals[idx].entry(item_id).or_insert((0, 0));
                entry.0 += games;
                entry.1 += wins;
            }
        }
    }

    let to_sorted_slot = |map: HashMap<u64, (u64, u64)>| -> Vec<LolalyticsItemBuild> {
        let mut list: Vec<LolalyticsItemBuild> = map
            .into_iter()
            .filter(|(_, (g, _))| *g >= 10)
            .map(|(id, (games, wins))| LolalyticsItemBuild {
                item_ids: vec![id],
                games,
                wins,
                win_rate: (wins as f64 / games as f64) * 100.0,
            })
            .collect();
        list.sort_by_key(|b| std::cmp::Reverse(b.games));
        list.truncate(5);
        list
    };

    let [s1, s2, s3] = slot_totals;
    (
        core_paths,
        to_sorted_slot(s1),
        to_sorted_slot(s2),
        to_sorted_slot(s3),
    )
}

/// Fetch a full live LoLalytics champion build (runes, item sets, counters & ally synergies) in parallel.
pub fn fetch_lolalytics_champion_build(
    entry: &OpggCatalogEntry,
    role: Role,
    tier: &str,
    patch: Option<&str>,
    catalog_by_id: &HashMap<u32, OpggCatalogEntry>,
) -> Result<LolalyticsBuildResponse, String> {
    let target_role = if role == Role::Unknown {
        Role::Middle
    } else {
        role
    };
    let clean_key = normalize_ddragon_champion_key(&entry.key);
    let slug = lolalytics_champ_slug(&clean_key);
    let lane = lolalytics_lane_slug(target_role);
    let tier_slug = lolalytics_tier_slug(tier);
    let patch_param = normalize_patch_param(patch, None);

    let qs = format!(
        "p=d&v=1&patch={patch_param}&c={slug}&lane={lane}&tier={tier_slug}&queue=ranked&region=all"
    );
    let rune_url = format!("{LOLALYTICS_MEGA_BASE}?ep=rune&{qs}");
    let item_url = format!("{LOLALYTICS_MEGA_BASE}?ep=build-itemset&{qs}");
    let counter_url = format!("{LOLALYTICS_MEGA_BASE}?ep=counter&{qs}");
    let team_url = format!("{LOLALYTICS_MEGA_BASE}?ep=build-team&{qs}");

    let (rune_res, item_res, counter_res, team_res) = std::thread::scope(|s| {
        let h_rune = s.spawn(|| crate::providers::http_get_json(&rune_url));
        let h_item = s.spawn(|| crate::providers::http_get_json(&item_url));
        let h_counter = s.spawn(|| crate::providers::http_get_json(&counter_url));
        let h_team = s.spawn(|| crate::providers::http_get_json(&team_url));
        (
            h_rune
                .join()
                .unwrap_or_else(|_| Err("LoLalytics rune thread panicked".into())),
            h_item
                .join()
                .unwrap_or_else(|_| Err("LoLalytics itemset thread panicked".into())),
            h_counter
                .join()
                .unwrap_or_else(|_| Err("LoLalytics counter thread panicked".into())),
            h_team
                .join()
                .unwrap_or_else(|_| Err("LoLalytics team thread panicked".into())),
        )
    });

    let rune_json = rune_res.unwrap_or(Value::Null);
    let item_json = item_res.unwrap_or(Value::Null);
    let counter_json = counter_res.unwrap_or(Value::Null);
    let team_json = team_res.unwrap_or(Value::Null);

    let most_common_runes = parse_lolalytics_rune_block(
        rune_json
            .get("summary")
            .and_then(|s| s.get("runes"))
            .and_then(|r| r.get("pick")),
    );
    let highest_wr_runes = parse_lolalytics_rune_block(
        rune_json
            .get("summary")
            .and_then(|s| s.get("runes"))
            .and_then(|r| r.get("win")),
    );
    let (core_paths, first_items, second_items, third_items) =
        parse_lolalytics_itemsets(&item_json);

    let stats = counter_json.get("stats").unwrap_or(&Value::Null);
    let win_rate = value_f64(stats.get("wr"));
    let pick_rate = value_f64(stats.get("pr"));
    let ban_rate = value_f64(stats.get("br"));
    let avg_win_rate = value_f64(stats.get("avgWr").or_else(|| rune_json.get("avgWinRate")));
    let games = value_u64(rune_json.get("header").and_then(|h| h.get("n")));

    if most_common_runes.is_none() && core_paths.is_empty() && win_rate <= 0.0 {
        return Err(format!(
            "LoLalytics returned no live build data for {} ({lane}, patch {patch_param})",
            entry.name
        ));
    }

    let mut all_counters: Vec<LolalyticsCounterEntry> = counter_json
        .get("counters")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|row| {
                    let cid = value_u64(row.get("cid")) as u32;
                    let n = value_u64(row.get("n"));
                    if cid == 0 || n < 20 {
                        return None;
                    }
                    let (k, name) = catalog_by_id
                        .get(&cid)
                        .map(|m| (normalize_ddragon_champion_key(&m.key), m.name.clone()))
                        .unwrap_or_else(|| (format!("Champion{cid}"), format!("Champion #{cid}")));
                    Some(LolalyticsCounterEntry {
                        champion_id: cid,
                        champion_key: k,
                        champion_name: name,
                        win_rate: value_f64(row.get("vsWr")),
                        games: n,
                        delta1: value_f64(row.get("d1")),
                        delta2: value_f64(row.get("d2")),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    all_counters.sort_by(|a, b| {
        b.win_rate
            .partial_cmp(&a.win_rate)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let strong_against: Vec<LolalyticsCounterEntry> =
        all_counters.iter().take(6).cloned().collect();
    let weak_against: Vec<LolalyticsCounterEntry> =
        all_counters.iter().rev().take(6).cloned().collect();

    let mut synergies: Vec<LolalyticsSynergyEntry> = Vec::new();
    if let Some(team_obj) = team_json.get("team").and_then(|v| v.as_object()) {
        for (role_str, rows_val) in team_obj {
            let syn_role = parse_lolalytics_role(role_str);
            let Some(rows) = rows_val.as_array() else {
                continue;
            };
            for row in rows {
                let Some(cols) = row.as_array() else { continue };
                let cid = value_u64(cols.first()) as u32;
                let wr = value_f64(cols.get(1));
                let d1 = value_f64(cols.get(2));
                let n = value_u64(cols.get(5));
                if cid == 0 || n < 50 {
                    continue;
                }
                let (k, name) = catalog_by_id
                    .get(&cid)
                    .map(|m| (normalize_ddragon_champion_key(&m.key), m.name.clone()))
                    .unwrap_or_else(|| (format!("Champion{cid}"), format!("Champion #{cid}")));
                synergies.push(LolalyticsSynergyEntry {
                    champion_id: cid,
                    champion_key: k,
                    champion_name: name,
                    role: syn_role,
                    win_rate: wr,
                    delta1: d1,
                    games: n,
                });
            }
        }
    }
    synergies.sort_by(|a, b| {
        b.delta1
            .partial_cmp(&a.delta1)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    synergies.truncate(8);

    Ok(LolalyticsBuildResponse {
        champion_id: entry.champion_id,
        champion_key: clean_key,
        champion_name: entry.name.clone(),
        patch: patch_param,
        role: target_role,
        tier_label: lolalytics_tier_display(tier_slug),
        win_rate,
        pick_rate,
        ban_rate,
        games,
        avg_win_rate,
        most_common_runes,
        highest_wr_runes,
        core_paths,
        first_items,
        second_items,
        third_items,
        strong_against,
        weak_against,
        synergies,
        endpoint_url: rune_url,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_lolalytics_slugs_and_rune_trees() {
        assert_eq!(lolalytics_champ_slug("MonkeyKing"), "wukong");
        assert_eq!(lolalytics_champ_slug("Lee Sin"), "leesin");
        assert_eq!(lolalytics_champ_slug("K'Sante"), "ksante");
        assert_eq!(lolalytics_champ_slug("Renata Glasc"), "renata");
        assert_eq!(lolalytics_tree_to_riot_style_id(0), 8000);
        assert_eq!(lolalytics_tree_to_riot_style_id(1), 8100);
        assert_eq!(lolalytics_tree_to_riot_style_id(2), 8200);
        assert_eq!(lolalytics_tree_to_riot_style_id(3), 8400);
        assert_eq!(lolalytics_tree_to_riot_style_id(4), 8300);
    }

    #[test]
    fn parses_observed_lolalytics_tier_and_itemsets() {
        let mut catalog = HashMap::new();
        catalog.insert(
            54,
            OpggCatalogEntry {
                champion_id: 54,
                key: "Malphite".to_string(),
                name: "Malphite".to_string(),
            },
        );
        let tier_payload = serde_json::json!({
            "queue": 420,
            "avgWr": 51.27,
            "analysed": 2217980,
            "tier": {
                "1": {
                    "lane": {
                        "top": {
                            "cid": {
                                "54": { "rank": 1, "wr": 53.14, "pr": 6.75, "br": 17.8, "games": 14928 }
                            }
                        }
                    }
                }
            },
            "response": { "valid": true }
        });
        let rows = parse_lolalytics_tier_json(&tier_payload, Role::Top, &catalog).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].champion_name, "Malphite");
        assert_eq!(rows[0].tier, "S+");
        assert_eq!(rows[0].play, 14928);

        let item_payload = serde_json::json!({
            "itemSets": {
                "itemSet1": [["3068", 678, 277], ["3118", 370, 143]],
                "itemBootSet4": [["3047_3068_3110_2504", 255, 143]]
            }
        });
        let (core, first, _, _) = parse_lolalytics_itemsets(&item_payload);
        assert_eq!(core.len(), 1);
        assert_eq!(core[0].item_ids, vec![3047, 3068, 3110, 2504]);
        assert!((core[0].win_rate - 56.078).abs() < 0.05);
        assert_eq!(first[0].item_ids, vec![3068]);
    }
}
