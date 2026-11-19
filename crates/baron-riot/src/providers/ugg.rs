use crate::opgg_modes::{normalize_ddragon_champion_key, OpggCatalogEntry, OpggModeTierEntry};
use baron_core::models::Role;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

const UGG_VERSIONS_URL: &str =
    "https://static.bigbrain.gg/assets/lol/riot_patch_update/prod/versions.json";

static UGG_LATEST_PATCH_CACHE: OnceLock<Mutex<Option<String>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UggOptionStat {
    pub item_id: u64,
    pub wins: u64,
    pub games: u64,
    pub win_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UggCounterEntry {
    pub champion_id: u32,
    pub champion_key: String,
    pub champion_name: String,
    pub wins: u64,
    pub games: u64,
    pub win_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UggBuildResponse {
    pub champion_id: u32,
    pub patch: String,
    pub role: Role,
    pub tier_label: String,
    pub endpoint_url: String,
    pub games: u64,
    pub wins: u64,
    pub win_rate: f64,
    pub role_games: u64,
    pub role_wins: u64,
    pub role_win_rate: f64,
    pub primary_style: u64,
    pub sub_style: u64,
    pub runes: Vec<u64>,
    pub stat_shards: Vec<u64>,
    pub spells: Vec<u64>,
    pub starter_items: Vec<u64>,
    pub core_items: Vec<u64>,
    pub fourth_items: Vec<UggOptionStat>,
    pub fifth_items: Vec<UggOptionStat>,
    pub sixth_items: Vec<UggOptionStat>,
    pub skill_order: Vec<String>,
    pub skill_priority: String,
    #[serde(default)]
    pub best_against: Vec<UggCounterEntry>,
    #[serde(default)]
    pub worst_against: Vec<UggCounterEntry>,
}

/// Normalize Baron patch string (e.g. `"16.22"` or `"16.22.1"`) into U.GG's `"16_22"` slug.
pub fn ugg_patch_slug(patch: &str) -> String {
    let clean = patch.trim();
    let mut parts = clean.split('.').take(2);
    match (parts.next(), parts.next()) {
        (Some(maj), Some(min)) if !maj.is_empty() && !min.is_empty() => format!("{maj}_{min}"),
        _ => clean.replace('.', "_"),
    }
}

fn role_from_ugg_key(key: &str) -> Role {
    match key {
        "1" => Role::Jungle,
        "2" => Role::Utility,
        "3" => Role::Bottom,
        "4" => Role::Top,
        "5" => Role::Middle,
        _ => Role::Unknown,
    }
}

fn ugg_role_key(role: Role) -> &'static str {
    match role {
        Role::Jungle => "1",
        Role::Utility => "2",
        Role::Bottom => "3",
        Role::Top => "4",
        Role::Middle | Role::Unknown => "5",
    }
}

fn value_u64(v: Option<&Value>) -> u64 {
    v.and_then(|x| {
        x.as_u64()
            .or_else(|| x.as_str().and_then(|s| s.parse::<u64>().ok()))
    })
    .unwrap_or(0)
}

fn parse_u64_array(v: Option<&Value>) -> Vec<u64> {
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

fn parse_late_item_options(v: Option<&Value>) -> Vec<UggOptionStat> {
    let mut out = v
        .and_then(|x| x.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|row| {
                    let cols = row.as_array()?;
                    let item_id = value_u64(cols.first());
                    let wins = value_u64(cols.get(1));
                    let games = value_u64(cols.get(2));
                    if item_id == 0 || games == 0 {
                        return None;
                    }
                    let win_rate = (wins as f64 / games as f64) * 100.0;
                    Some(UggOptionStat {
                        item_id,
                        wins,
                        games,
                        win_rate,
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    out.sort_by_key(|a| std::cmp::Reverse(a.games));
    out.truncate(6);
    out
}

/// Parse a `stats2.u.gg/lol/1.5/overview/...` JSON payload for a champion & role.
pub fn parse_ugg_overview_json(
    root: &Value,
    champion_id: u32,
    patch: &str,
    requested_role: Role,
    endpoint_url: &str,
) -> Result<UggBuildResponse, String> {
    let world = root
        .get("1")
        .and_then(|v| v.as_object())
        .ok_or_else(|| "U.GG overview response missing world region '1'".to_string())?;

    // Tier bucket "10" = Emerald+ on U.GG overview v1.5; fall back to first non-empty rank bucket.
    let (tier_label, role_map) = if let Some(m) = world.get("10").and_then(|v| v.as_object()) {
        ("Emerald+".to_string(), m)
    } else {
        world
            .iter()
            .find_map(|(k, v)| v.as_object().map(|m| (format!("Tier {k}"), m)))
            .ok_or_else(|| "U.GG overview response contained no rank buckets".to_string())?
    };

    let preferred_key = ugg_role_key(requested_role);
    let selected_key = if requested_role != Role::Unknown && role_map.contains_key(preferred_key) {
        preferred_key.to_string()
    } else {
        role_map
            .iter()
            .max_by_key(|(_, bucket)| {
                bucket
                    .as_array()
                    .and_then(|arr| arr.first())
                    .and_then(|t| t.as_array())
                    .and_then(|t| t.get(6))
                    .and_then(|tot| tot.as_array())
                    .map(|tot| value_u64(tot.get(1)))
                    .unwrap_or(0)
            })
            .map(|(k, _)| k.clone())
            .ok_or_else(|| "U.GG overview contained no populated role data".to_string())?
    };

    let tuple = role_map
        .get(&selected_key)
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_array())
        .ok_or_else(|| "U.GG overview missing role tuple[0]".to_string())?;

    let rune_block = tuple.first().and_then(|v| v.as_array());
    let games = value_u64(rune_block.and_then(|b| b.first()));
    let wins = value_u64(rune_block.and_then(|b| b.get(1)));
    let primary_style = value_u64(rune_block.and_then(|b| b.get(2)));
    let sub_style = value_u64(rune_block.and_then(|b| b.get(3)));
    let runes = parse_u64_array(rune_block.and_then(|b| b.get(4)));

    let spell_block = tuple.get(1).and_then(|v| v.as_array());
    let spells = parse_u64_array(spell_block.and_then(|b| b.get(2)));

    let starter_block = tuple.get(2).and_then(|v| v.as_array());
    let starter_items = parse_u64_array(starter_block.and_then(|b| b.get(2)));

    let core_block = tuple.get(3).and_then(|v| v.as_array());
    let core_items = parse_u64_array(core_block.and_then(|b| b.get(2)));

    let skill_block = tuple.get(4).and_then(|v| v.as_array());
    let skill_order = skill_block
        .and_then(|b| b.get(2))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|s| s.as_str().map(str::to_string))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let skill_priority = skill_block
        .and_then(|b| b.get(3))
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let late_items = tuple.get(5).and_then(|v| v.as_array());
    let fourth_items = parse_late_item_options(late_items.and_then(|l| l.first()));
    let fifth_items = parse_late_item_options(late_items.and_then(|l| l.get(1)));
    let sixth_items = parse_late_item_options(late_items.and_then(|l| l.get(2)));

    let totals = tuple.get(6).and_then(|v| v.as_array());
    let role_wins = value_u64(totals.and_then(|t| t.first()));
    let role_games = value_u64(totals.and_then(|t| t.get(1)));
    let role_win_rate = if role_games > 0 {
        (role_wins as f64 / role_games as f64) * 100.0
    } else {
        0.0
    };

    let stat_shards = parse_u64_array(
        tuple
            .get(8)
            .and_then(|v| v.as_array())
            .and_then(|b| b.get(2)),
    );

    let win_rate = if games > 0 {
        (wins as f64 / games as f64) * 100.0
    } else {
        role_win_rate
    };

    Ok(UggBuildResponse {
        champion_id,
        patch: patch.to_string(),
        role: role_from_ugg_key(&selected_key),
        tier_label,
        endpoint_url: endpoint_url.to_string(),
        games,
        wins,
        win_rate,
        role_games,
        role_wins,
        role_win_rate,
        primary_style,
        sub_style,
        runes,
        stat_shards,
        spells,
        starter_items,
        core_items,
        fourth_items,
        fifth_items,
        sixth_items,
        skill_order,
        skill_priority,
        best_against: Vec::new(),
        worst_against: Vec::new(),
    })
}

/// Resolve the latest live U.GG patch string (e.g. `"16.23"`) from `static.bigbrain.gg`.
pub fn fetch_ugg_latest_patch() -> Option<String> {
    let lock = UGG_LATEST_PATCH_CACHE.get_or_init(|| Mutex::new(None));
    if let Ok(guard) = lock.lock() {
        if let Some(cached) = guard.as_ref() {
            return Some(cached.clone());
        }
    }
    let json = crate::providers::http_get_json(UGG_VERSIONS_URL).ok()?;
    let latest = json
        .as_array()?
        .first()?
        .as_str()?
        .split('.')
        .take(2)
        .collect::<Vec<_>>()
        .join(".");
    if latest.is_empty() {
        return None;
    }
    if let Ok(mut guard) = lock.lock() {
        *guard = Some(latest.clone());
    }
    Some(latest)
}

pub fn ugg_ranking_mode_slug(mode: &str) -> &'static str {
    match mode.trim().to_ascii_lowercase().as_str() {
        "flex" | "ranked_flex" | "ranked_flex_sr" => "ranked_flex_sr",
        "aram" | "normal_aram" => "normal_aram",
        _ => "ranked_solo_5x5",
    }
}

pub fn ugg_ranking_tier_slug(mode_slug: &str, tier: &str) -> &'static str {
    if mode_slug == "normal_aram" {
        return "overall";
    }
    let norm = tier.trim().to_ascii_lowercase().replace([' ', '-'], "_");
    match norm.as_str() {
        "all" | "overall" => "overall",
        "platinum" | "platinum_plus" => "platinum_plus",
        "emerald" | "emerald_plus" => "emerald_plus",
        "diamond" | "diamond_plus" => "diamond_plus",
        "master" | "master_plus" => "master_plus",
        "grandmaster" => "grandmaster",
        "challenger" => "challenger",
        _ => "emerald_plus",
    }
}

fn ugg_ranking_role_key(mode_slug: &str, role: Role) -> &'static str {
    if mode_slug == "normal_aram" {
        return "none";
    }
    match role {
        Role::Top => "top",
        Role::Jungle => "jungle",
        Role::Middle | Role::Unknown => "mid",
        Role::Bottom => "adc",
        Role::Utility => "supp",
    }
}

fn ugg_tier_from_percentile(idx: usize, total: usize) -> &'static str {
    if total == 0 {
        return "B";
    }
    let pct = (idx as f64) / (total as f64);
    if pct < 0.08 {
        "S+"
    } else if pct < 0.22 {
        "S"
    } else if pct < 0.45 {
        "A"
    } else if pct < 0.72 {
        "B"
    } else if pct < 0.90 {
        "C"
    } else {
        "D"
    }
}

/// Parse an observed `stats2.u.gg/lol/1.5/champion_ranking/world/{patch}/{mode}/{tier}/1.5.0.json` payload.
pub fn parse_ugg_champion_ranking_json(
    root: &Value,
    mode: &str,
    role: Role,
    catalog_by_id: &HashMap<u32, OpggCatalogEntry>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    let arr = root.as_array().filter(|a| a.len() >= 4).ok_or_else(|| {
        "U.GG champion_ranking response did not match 4-element tuple".to_string()
    })?;

    let roles_map = arr[0]
        .as_object()
        .ok_or_else(|| "U.GG champion_ranking missing role map at index 0".to_string())?;
    let bans_map = arr[1].as_object();
    let total_matches = value_u64(arr.get(3)).max(1) as f64;

    let mode_slug = ugg_ranking_mode_slug(mode);
    let role_key = ugg_ranking_role_key(mode_slug, role);
    let rows = roles_map
        .get(role_key)
        .and_then(|v| v.as_array())
        .ok_or_else(|| format!("U.GG champion_ranking missing role bucket '{role_key}'"))?;

    let min_games = if mode_slug == "normal_aram" {
        30
    } else {
        ((total_matches * 0.004) as u64).max(30)
    };

    let mut scored: Vec<(f64, OpggModeTierEntry)> = Vec::new();
    for row in rows {
        let Some(cols) = row.as_array() else { continue };
        let cid = value_u64(cols.first()) as u32;
        let wins = value_u64(cols.get(2));
        let matches = value_u64(cols.get(3));
        if cid == 0 || matches < min_games {
            continue;
        }
        let kills = value_u64(cols.get(6)) as f64;
        let assists = value_u64(cols.get(7)) as f64;
        let deaths = value_u64(cols.get(8)).max(1) as f64;
        let win_rate = (wins as f64 / matches as f64) * 100.0;
        let pick_rate = (matches as f64 / total_matches) * 100.0;
        let bans = bans_map
            .and_then(|m| m.get(&cid.to_string()))
            .map(|v| value_u64(Some(v)))
            .unwrap_or(0);
        let ban_rate = (bans as f64 / total_matches) * 100.0;
        let kda = (kills + assists) / deaths;

        let (champ_key, champ_name) = catalog_by_id
            .get(&cid)
            .map(|m| (normalize_ddragon_champion_key(&m.key), m.name.clone()))
            .unwrap_or_else(|| (format!("Champion{cid}"), format!("Champion #{cid}")));

        // Composite meta score blends win rate with log-weighted sample presence (matching standard tier lists).
        let composite =
            (win_rate - 50.0) * 1.65 + (pick_rate.max(0.1)).ln() * 1.1 + ban_rate * 0.04;
        scored.push((
            composite,
            OpggModeTierEntry {
                champion_id: cid,
                champion_key: champ_key,
                champion_name: champ_name,
                mode: mode.to_string(),
                role: if mode_slug == "normal_aram" {
                    Role::Unknown
                } else {
                    role
                },
                tier: "B".to_string(),
                rank: 0,
                win_rate,
                pick_rate,
                ban_rate,
                kda,
                play: matches,
                avg_place: None,
                first_rate: None,
                top2_rate: None,
            },
        ));
    }

    if scored.is_empty() {
        return Err(format!(
            "U.GG returned zero qualifying champions for {role_key}"
        ));
    }

    scored.sort_by(|a, b| {
        b.0.partial_cmp(&a.0)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.1.play.cmp(&a.1.play))
    });
    let total = scored.len();
    let out: Vec<OpggModeTierEntry> = scored
        .into_iter()
        .enumerate()
        .map(|(idx, (_, mut entry))| {
            entry.rank = (idx + 1) as u32;
            entry.tier = ugg_tier_from_percentile(idx, total).to_string();
            entry
        })
        .collect();
    Ok(out)
}

/// Fetch live U.GG champion tier list (`ranked`, `flex`, or `aram`) directly from `stats2.u.gg`.
pub fn fetch_ugg_tier_list(
    mode: &str,
    role: Role,
    tier: &str,
    patch: &str,
    catalog_by_id: &HashMap<u32, OpggCatalogEntry>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    let mode_slug = ugg_ranking_mode_slug(mode);
    let tier_slug = ugg_ranking_tier_slug(mode_slug, tier);
    let target_role = if mode_slug == "normal_aram" {
        Role::Unknown
    } else if role == Role::Unknown {
        Role::Top
    } else {
        role
    };

    let slug = ugg_patch_slug(patch);
    let primary_url = format!(
        "https://stats2.u.gg/lol/1.5/champion_ranking/world/{slug}/{mode_slug}/{tier_slug}/1.5.0.json"
    );
    match crate::providers::http_get_json(&primary_url)
        .and_then(|j| parse_ugg_champion_ranking_json(&j, mode, target_role, catalog_by_id))
    {
        Ok(rows) => Ok(rows),
        Err(first_err) => {
            if let Some(latest) = fetch_ugg_latest_patch() {
                let latest_slug = ugg_patch_slug(&latest);
                if latest_slug != slug {
                    let fallback_url = format!(
                        "https://stats2.u.gg/lol/1.5/champion_ranking/world/{latest_slug}/{mode_slug}/{tier_slug}/1.5.0.json"
                    );
                    if let Ok(json) = crate::providers::http_get_json(&fallback_url) {
                        return parse_ugg_champion_ranking_json(
                            &json,
                            mode,
                            target_role,
                            catalog_by_id,
                        );
                    }
                }
            }
            Err(first_err)
        }
    }
}

fn parse_ugg_counter_list(
    arr: Option<&Value>,
    catalog_by_id: &HashMap<u32, OpggCatalogEntry>,
) -> Vec<UggCounterEntry> {
    arr.and_then(|v| v.as_array())
        .map(|rows| {
            rows.iter()
                .filter_map(|row| {
                    let cols = row.as_array()?;
                    let cid = value_u64(cols.first()) as u32;
                    let wins = value_u64(cols.get(2));
                    let games = value_u64(cols.get(3));
                    if cid == 0 || games == 0 {
                        return None;
                    }
                    let (key, name) = catalog_by_id
                        .get(&cid)
                        .map(|m| (normalize_ddragon_champion_key(&m.key), m.name.clone()))
                        .unwrap_or_else(|| (format!("Champion{cid}"), format!("Champion #{cid}")));
                    Some(UggCounterEntry {
                        champion_id: cid,
                        champion_key: key,
                        champion_name: name,
                        wins,
                        games,
                        win_rate: (wins as f64 / games as f64) * 100.0,
                    })
                })
                .take(6)
                .collect()
        })
        .unwrap_or_default()
}

/// Fetch live U.GG Ranked Solo/Duo champion overview build + lane counters from `stats2.u.gg`.
pub fn fetch_ugg_champion_overview_with_catalog(
    champion_id: u32,
    patch: &str,
    role: Role,
    catalog_by_id: &HashMap<u32, OpggCatalogEntry>,
) -> Result<UggBuildResponse, String> {
    let mut active_patch = patch.to_string();
    let mut slug = ugg_patch_slug(&active_patch);
    let mut url = format!(
        "https://stats2.u.gg/lol/1.5/overview/{slug}/ranked_solo_5x5/{champion_id}/1.5.0.json"
    );

    let json = match crate::providers::http_get_json(&url) {
        Ok(j) => j,
        Err(first_err) => {
            if let Some(latest) = fetch_ugg_latest_patch() {
                let latest_slug = ugg_patch_slug(&latest);
                if latest_slug != slug {
                    active_patch = latest;
                    slug = latest_slug;
                    url = format!(
                        "https://stats2.u.gg/lol/1.5/overview/{slug}/ranked_solo_5x5/{champion_id}/1.5.0.json"
                    );
                    crate::providers::http_get_json(&url)?
                } else {
                    return Err(first_err);
                }
            } else {
                return Err(first_err);
            }
        }
    };

    let mut parsed = parse_ugg_overview_json(&json, champion_id, &active_patch, role, &url)?;

    // Also pull U.GG live lane counters when available (best-effort so build never fails if counters are sparse).
    let counters_url = format!(
        "https://stats2.u.gg/lol/1.5/counters/{slug}/ranked_solo_5x5/{champion_id}/1.5.0.json"
    );
    if let Ok(cj) = crate::providers::http_get_json(&counters_url) {
        let rk = ugg_role_key(parsed.role);
        if let Some(groups) = cj
            .get("1")
            .and_then(|w| w.get("10"))
            .and_then(|t| t.get(rk))
            .and_then(|v| v.as_array())
            .and_then(|a| a.get(1))
            .and_then(|g| g.as_array())
        {
            parsed.best_against = parse_ugg_counter_list(groups.first(), catalog_by_id);
            parsed.worst_against = parse_ugg_counter_list(groups.get(1), catalog_by_id);
        }
    }

    Ok(parsed)
}

/// Fetch live U.GG Ranked Solo/Duo champion overview build from `stats2.u.gg`.
pub fn fetch_ugg_champion_overview(
    champion_id: u32,
    patch: &str,
    role: Role,
) -> Result<UggBuildResponse, String> {
    fetch_ugg_champion_overview_with_catalog(champion_id, patch, role, &HashMap::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_real_ugg_overview_shape() {
        let sample = serde_json::json!({
            "1": {
                "10": {
                    "4": [[
                        [12289, 6329, 8200, 8400, [8229, 8210, 8226, 8237, 8444, 8451]],
                        [5386, 2845, [4, 12]],
                        [17710, 9114, [1056, 2003, 2003]],
                        [1118, 652, [3047, 3068, 3110]],
                        [8708, 4438, ["Q", "E", "W", "Q", "Q", "R"], "QEW"],
                        [
                            [[6665, 1137, 1995], [3075, 1254, 2228]],
                            [[6665, 646, 1045]],
                            [[3050, 19, 30]],
                            []
                        ],
                        [21000, 40000],
                        null,
                        [9000, 4600, ["5007", "5008", "5001"]]
                    ]]
                }
            }
        });
        let parsed =
            parse_ugg_overview_json(&sample, 54, "16.22", Role::Top, "https://stats2.u.gg/test")
                .unwrap();
        assert_eq!(parsed.champion_id, 54);
        assert_eq!(parsed.role, Role::Top);
        assert_eq!(parsed.primary_style, 8200);
        assert_eq!(parsed.sub_style, 8400);
        assert_eq!(parsed.runes, vec![8229, 8210, 8226, 8237, 8444, 8451]);
        assert_eq!(parsed.stat_shards, vec![5007, 5008, 5001]);
        assert_eq!(parsed.core_items, vec![3047, 3068, 3110]);
        assert_eq!(parsed.skill_priority, "QEW");
        assert_eq!(parsed.role_games, 40000);
        assert_eq!(parsed.fourth_items[0].item_id, 3075);
    }

    #[test]
    fn ugg_patch_slug_normalizes_two_and_three_segments() {
        assert_eq!(ugg_patch_slug("16.22"), "16_22");
        assert_eq!(ugg_patch_slug("16.22.1"), "16_22");
    }

    #[test]
    fn parses_real_ugg_champion_ranking_shape() {
        let mut catalog = HashMap::new();
        catalog.insert(
            54,
            OpggCatalogEntry {
                champion_id: 54,
                key: "Malphite".to_string(),
                name: "Malphite".to_string(),
            },
        );
        let sample = serde_json::json!([
            {
                "top": [
                    ["54", [[36, 205, 342]], 6596, 12685, 264735081, 133096076, 54013, 95428, 60535, 2249368]
                ]
            },
            { "54": 33000 },
            "2026-11-19T08:32:17Z",
            187463
        ]);
        let rows = parse_ugg_champion_ranking_json(&sample, "ranked", Role::Top, &catalog).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].champion_name, "Malphite");
        assert_eq!(rows[0].rank, 1);
        assert_eq!(rows[0].play, 12685);
        assert!((rows[0].win_rate - 52.0).abs() < 0.05);
        assert!((rows[0].pick_rate - 6.76).abs() < 0.05);
        assert!((rows[0].ban_rate - 17.6).abs() < 0.1);
    }
}
