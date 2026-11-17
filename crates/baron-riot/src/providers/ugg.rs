use baron_core::models::Role;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
    })
}

/// Fetch live U.GG Ranked Solo/Duo champion overview build from `stats2.u.gg`.
pub fn fetch_ugg_champion_overview(
    champion_id: u32,
    patch: &str,
    role: Role,
) -> Result<UggBuildResponse, String> {
    let slug = ugg_patch_slug(patch);
    let url = format!(
        "https://stats2.u.gg/lol/1.5/overview/{slug}/ranked_solo_5x5/{champion_id}/1.5.0.json"
    );
    let json = crate::providers::http_get_json(&url)?;
    parse_ugg_overview_json(&json, champion_id, patch, role, &url)
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
}
