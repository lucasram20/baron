use crate::providers::http_get_json;
use crate::providers::lolalytics::{
    fetch_lolalytics_champion_build, fetch_lolalytics_tier_list, LolalyticsBuildResponse,
};
use crate::providers::meraki::{fetch_meraki_champion_detail, MerakiChampionDetail};
use crate::providers::opgg::call_opgg_tool_json;
use crate::providers::ugg::{
    fetch_ugg_champion_overview_with_catalog, fetch_ugg_tier_list, UggBuildResponse,
};
use baron_core::models::Role;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap};
use std::sync::{Mutex, OnceLock};

const OPGG_MCP_URL: &str = "https://mcp-api.op.gg/mcp";
const OPGG_CHAMPION_API: &str = "https://lol-api-champion.op.gg/api";

static CATALOG_CACHE: OnceLock<Mutex<Option<Vec<OpggCatalogEntry>>>> = OnceLock::new();
static AUGMENTS_CACHE: OnceLock<Mutex<Option<HashMap<u32, Value>>>> = OnceLock::new();

/// Clears all in-memory OP.GG & live patch caches so a manual refresh pulls fresh data.
pub fn clear_opgg_caches() {
    if let Some(lock) = CATALOG_CACHE.get() {
        let mut guard = lock.lock().unwrap_or_else(|e| e.into_inner());
        *guard = None;
    }
    if let Some(lock) = AUGMENTS_CACHE.get() {
        let mut guard = lock.lock().unwrap_or_else(|e| e.into_inner());
        *guard = None;
    }
    crate::assets::clear_patch_metadata_cache();
    crate::fallback::clear_opgg_regions_cache();
}

fn resolve_opgg_api_version(requested: Option<&str>) -> Option<String> {
    let meta = crate::assets::fetch_live_patch_metadata(false);
    if let Some(req) = requested.map(str::trim).filter(|s| !s.is_empty()) {
        if meta.opgg_patches.iter().any(|v| v == req) {
            return Some(req.to_string());
        }
    }
    meta.opgg_patches.first().cloned()
}

fn mode_tracks_ranked_patch(mode: &str) -> bool {
    matches!(mode, "ranked" | "flex" | "aram" | "classic")
}

fn append_version_param(url: &str, version: Option<&str>) -> String {
    match version.filter(|v| crate::assets::is_valid_short_patch(v)) {
        Some(ver) => {
            let sep = if url.contains('?') { '&' } else { '?' };
            format!("{url}{sep}version={ver}")
        }
        None => url.to_string(),
    }
}

/// Fetches an OP.GG Desktop JSON endpoint with an optional `version` query param, automatically
/// falling back to the unversioned latest endpoint if OP.GG returns an error (e.g. HTTP 422
/// for a rotating mode or mid-rollout patch).
fn http_get_opgg_json(base_url: &str, version: Option<&str>) -> Result<Value, String> {
    let versioned = append_version_param(base_url, version);
    match http_get_json(&versioned) {
        Ok(val) => Ok(val),
        Err(err) if versioned != base_url => http_get_json(base_url).map_err(|_| err),
        Err(err) => Err(err),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OpggCatalogEntry {
    pub champion_id: u32,
    pub key: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpggModeTierEntry {
    pub champion_id: u32,
    pub champion_key: String,
    pub champion_name: String,
    pub mode: String,
    pub role: Role,
    pub tier: String,
    pub rank: u32,
    pub win_rate: f64,
    pub pick_rate: f64,
    pub ban_rate: f64,
    pub kda: f64,
    pub play: u64,
    pub avg_place: Option<f64>,
    pub first_rate: Option<f64>,
    pub top2_rate: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderDiagnostic {
    pub id: String,
    pub name: String,
    pub tier_list_status: String,
    pub build_data_status: String,
    pub summary: String,
    pub sample_endpoint: String,
}

/// Normalize mode strings from UI/API into canonical Baron OP.GG mode slugs.
pub fn normalize_opgg_mode(mode: &str) -> &'static str {
    match mode.trim().to_ascii_lowercase().as_str() {
        "flex" | "ranked_flex" => "flex",
        "aram" => "aram",
        "aram_mayhem" | "mayhem" | "aram-mayhem" | "aram: mayhem" | "aram_mayhem_classic" => {
            "aram_mayhem"
        }
        "arena" => "arena",
        "urf" => "urf",
        "nexus_blitz" | "nexus-blitz" => "nexus_blitz",
        "brawl" => "brawl",
        "classic" | "normal" => "classic",
        "doom" | "doom_bots" => "doom",
        _ => "ranked",
    }
}

/// Normalize UI/MCP tier filter into OP.GG Desktop API `tier` query value.
pub fn normalize_opgg_tier_slug(tier: &str) -> &'static str {
    match tier.trim().to_ascii_lowercase().as_str() {
        "all" => "all",
        "challenger" => "challenger",
        "grandmaster" => "grandmaster",
        "master_plus" | "master+" => "master_plus",
        "master" => "master",
        "diamond_plus" | "diamond+" => "diamond_plus",
        "diamond" => "diamond",
        "platinum_plus" | "platinum+" => "platinum_plus",
        "gold_plus" | "gold+" => "gold_plus",
        _ => "emerald_plus",
    }
}

fn normalize_opgg_mcp_tier(tier: &str) -> &'static str {
    match normalize_opgg_tier_slug(tier) {
        "all" => "ALL",
        "challenger" => "CHALLENGER",
        "grandmaster" => "GRANDMASTER",
        "master_plus" => "MASTER_PLUS",
        "master" => "MASTER",
        "diamond_plus" => "DIAMOND_PLUS",
        "diamond" => "DIAMOND",
        "platinum_plus" => "PLATINUM_PLUS",
        "gold_plus" => "GOLD_PLUS",
        _ => "EMERALD_PLUS",
    }
}

fn role_to_opgg_pos(role: Role) -> &'static str {
    match role {
        Role::Top => "TOP",
        Role::Jungle => "JUNGLE",
        Role::Middle | Role::Unknown => "MID",
        Role::Bottom => "ADC",
        Role::Utility => "SUPPORT",
    }
}

fn role_to_mcp_pos(role: Role) -> &'static str {
    match role {
        Role::Top => "top",
        Role::Jungle => "jungle",
        Role::Middle | Role::Unknown => "mid",
        Role::Bottom => "adc",
        Role::Utility => "support",
    }
}

fn parse_pos_role(pos: &str) -> Role {
    match pos.trim().to_ascii_uppercase().as_str() {
        "TOP" => Role::Top,
        "JUNGLE" => Role::Jungle,
        "MID" | "MIDDLE" => Role::Middle,
        "ADC" | "BOTTOM" | "BOT" => Role::Bottom,
        "SUPPORT" | "UTILITY" | "SUP" => Role::Utility,
        _ => Role::Unknown,
    }
}

/// Convert display names / keys into UPPER_SNAKE_CASE format accepted by OP.GG MCP tools.
pub fn opgg_mcp_champion_slug(name_or_key: &str) -> String {
    let trimmed = name_or_key.trim();
    if trimmed.eq_ignore_ascii_case("Wukong") {
        return "MONKEY_KING".to_string();
    }
    let mut out = String::with_capacity(trimmed.len() + 4);
    let mut prev_lower = false;
    for ch in trimmed.chars() {
        if ch == '\'' {
            prev_lower = false;
        } else if matches!(ch, ' ' | '-' | '.' | '_') {
            if !out.ends_with('_') && !out.is_empty() {
                out.push('_');
            }
            prev_lower = false;
        } else if ch.is_ascii_alphanumeric() {
            if ch.is_ascii_uppercase() && prev_lower && !out.ends_with('_') {
                out.push('_');
            }
            out.push(ch.to_ascii_uppercase());
            prev_lower = ch.is_ascii_lowercase();
        }
    }
    out
}

/// Fetch and cache the complete live League champion catalog (`champion_id`, `key`, `name`) via OP.GG MCP.
pub fn fetch_opgg_champions_catalog() -> Result<Vec<OpggCatalogEntry>, String> {
    let lock = CATALOG_CACHE.get_or_init(|| Mutex::new(None));
    {
        let guard = lock.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(cached) = guard.as_ref().filter(|c| !c.is_empty()) {
            return Ok(cached.clone());
        }
    }

    let val = call_opgg_tool_json(
        OPGG_MCP_URL,
        "lol_list_champions",
        json!({
            "lang": "en_US",
            "desired_output_fields": ["data.champions[].{champion_id,key,name}"]
        }),
    )?;

    let champs = val
        .get("data")
        .and_then(|d| d.get("champions"))
        .and_then(|c| c.as_array())
        .ok_or_else(|| "OP.GG lol_list_champions returned empty champions array".to_string())?;

    let mut entries = Vec::with_capacity(champs.len());
    for item in champs {
        let Some(champion_id) = item
            .get("champion_id")
            .and_then(|v| v.as_u64())
            .map(|v| v as u32)
        else {
            continue;
        };
        let key = item
            .get("key")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let name = item
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&key)
            .to_string();
        if !key.is_empty() {
            entries.push(OpggCatalogEntry {
                champion_id,
                key,
                name,
            });
        }
    }

    if entries.is_empty() {
        return Err("OP.GG champion catalog parsed zero entries".to_string());
    }

    let mut guard = lock.lock().unwrap_or_else(|e| e.into_inner());
    *guard = Some(entries.clone());
    Ok(entries)
}

/// Strips OP.GG mode-variant champion key prefixes (e.g. Classic mode's `Jade_Gangplank` -> `Gangplank`)
/// and normalizes Data Dragon aliases (`Jade_Wukong` -> `MonkeyKing`) so icons & splash art never 404.
pub fn normalize_ddragon_champion_key(key: &str) -> String {
    let trimmed = key.trim();
    let stripped = trimmed
        .split_once('_')
        .map(|(_, rest)| rest)
        .filter(|rest| !rest.is_empty())
        .unwrap_or(trimmed);
    if stripped.eq_ignore_ascii_case("Wukong") {
        "MonkeyKing".to_string()
    } else {
        stripped.to_string()
    }
}

fn resolve_champion_entry(champion_input: &str) -> Result<OpggCatalogEntry, String> {
    let catalog = fetch_opgg_champions_catalog()?;
    let norm = |s: &str| -> String {
        s.chars()
            .filter(|c| c.is_ascii_alphanumeric())
            .collect::<String>()
            .to_ascii_lowercase()
    };
    let needle = norm(champion_input);
    if let Ok(num_id) = champion_input.trim().parse::<u32>() {
        if let Some(found) = catalog.iter().find(|c| c.champion_id == num_id) {
            return Ok(found.clone());
        }
    }
    // Prefer standard Summoner's Rift champion IDs (< 60000) over mode clones like Jade_* (60000+).
    let mut matches = catalog.into_iter().filter(|c| {
        let clean_key = normalize_ddragon_champion_key(&c.key);
        norm(&c.name) == needle || norm(&c.key) == needle || norm(&clean_key) == needle
    });
    let mut best: Option<OpggCatalogEntry> = None;
    for entry in matches.by_ref() {
        if entry.champion_id < 60_000 {
            return Ok(entry);
        }
        if best.is_none() {
            best = Some(entry);
        }
    }
    best.ok_or_else(|| format!("Champion '{champion_input}' not found in live OP.GG catalog"))
}

/// Fetch and cache OP.GG's Arena/Mayhem augment catalog (`id -> {id,name,key,largeIcon,smallIcon,rarity,desc,tooltip}`).
pub fn fetch_opgg_augments_catalog() -> Result<HashMap<u32, Value>, String> {
    let lock = AUGMENTS_CACHE.get_or_init(|| Mutex::new(None));
    {
        let guard = lock.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(cached) = guard.as_ref().filter(|c| !c.is_empty()) {
            return Ok(cached.clone());
        }
    }

    let json = http_get_json(&format!("{OPGG_CHAMPION_API}/meta/augments"))?;
    let list = json
        .get("data")
        .and_then(|d| d.as_array())
        .ok_or_else(|| "OP.GG /api/meta/augments missing data array".to_string())?;

    let mut map = HashMap::with_capacity(list.len());
    for aug in list {
        if let Some(id) = aug.get("id").and_then(|v| v.as_u64()) {
            map.insert(id as u32, aug.clone());
        }
    }
    if map.is_empty() {
        return Err("OP.GG /api/meta/augments returned empty dataset".to_string());
    }
    let mut guard = lock.lock().unwrap_or_else(|e| e.into_inner());
    *guard = Some(map.clone());
    Ok(map)
}

fn pct(v: f64) -> f64 {
    if (0.0..=1.0).contains(&v) {
        v * 100.0
    } else {
        v
    }
}

/// Fetch live tier list for ANY League of Legends game mode from OP.GG APIs.
pub fn fetch_opgg_mode_tier_list(
    mode: &str,
    role: Role,
    tier: &str,
    version: Option<&str>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    let norm_mode = normalize_opgg_mode(mode);
    let norm_tier = normalize_opgg_tier_slug(tier);
    let resolved_version = resolve_opgg_api_version(version);
    let catalog = fetch_opgg_champions_catalog()?;
    let by_id: HashMap<u32, &OpggCatalogEntry> =
        catalog.iter().map(|c| (c.champion_id, c)).collect();

    if matches!(norm_mode, "aram_mayhem" | "brawl") {
        let url = if norm_mode == "aram_mayhem" {
            format!("{OPGG_CHAMPION_API}/contents/tiers?type=aram_mayhem")
        } else {
            format!("{OPGG_CHAMPION_API}/contents/tiers")
        };
        let json = http_get_json(&url)?;
        let rows = json
            .get("data")
            .and_then(|d| d.as_array())
            .ok_or_else(|| format!("OP.GG {norm_mode} tier response missing data array"))?;

        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            let champ_id = row
                .get("champion_id")
                .or_else(|| row.get("id"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as u32;
            let Some(meta) = by_id.get(&champ_id) else {
                continue;
            };
            let tier_num = row.get("tier").and_then(|v| v.as_u64()).unwrap_or(5);
            let rank_num = row.get("rank").and_then(|v| v.as_u64()).unwrap_or(999) as u32;
            out.push(OpggModeTierEntry {
                champion_id: champ_id,
                champion_key: normalize_ddragon_champion_key(&meta.key),
                champion_name: meta.name.clone(),
                mode: norm_mode.to_string(),
                role: Role::Unknown,
                tier: if tier_num == 0 {
                    "OP".to_string()
                } else {
                    tier_num.to_string()
                },
                rank: rank_num,
                win_rate: 0.0,
                pick_rate: 0.0,
                ban_rate: 0.0,
                kda: 0.0,
                play: 0,
                avg_place: None,
                first_rate: None,
                top2_rate: None,
            });
        }
        out.sort_by_key(|e| e.rank);
        return Ok(out);
    }

    let api_mode = match norm_mode {
        "flex" => "flex",
        "aram" => "aram",
        "arena" => "arena",
        "urf" => "urf",
        "nexus_blitz" => "nexus_blitz",
        "classic" => "classic",
        "doom" => "doom",
        _ => "ranked",
    };

    let base_url = match api_mode {
        "ranked" | "flex" | "aram" => {
            format!("{OPGG_CHAMPION_API}/global/champions/{api_mode}?tier={norm_tier}")
        }
        _ => format!("{OPGG_CHAMPION_API}/global/champions/{api_mode}"),
    };
    let effective_version = if mode_tracks_ranked_patch(api_mode) {
        resolved_version.as_deref()
    } else {
        None
    };

    let json = http_get_opgg_json(&base_url, effective_version)?;
    let rows = json
        .get("data")
        .and_then(|d| d.as_array())
        .ok_or_else(|| format!("OP.GG {api_mode} tier response missing data array"))?;

    let is_lane_mode = matches!(api_mode, "ranked" | "flex" | "classic");
    let target_pos = role_to_opgg_pos(role);
    let mut out = Vec::new();

    for row in rows {
        let champ_id = row.get("id").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let Some(meta) = by_id.get(&champ_id) else {
            continue;
        };

        if is_lane_mode && role != Role::Unknown {
            if let Some(pos_obj) = row
                .get("positions")
                .and_then(|p| p.as_array())
                .and_then(|arr| {
                    arr.iter()
                        .find(|p| p.get("name").and_then(|n| n.as_str()) == Some(target_pos))
                })
            {
                let stats = pos_obj.get("stats").unwrap_or(&Value::Null);
                let td = stats.get("tier_data").unwrap_or(&Value::Null);
                let t = td.get("tier").and_then(|v| v.as_u64()).unwrap_or(5);
                let rank = td.get("rank").and_then(|v| v.as_u64()).unwrap_or(999) as u32;
                out.push(OpggModeTierEntry {
                    champion_id: champ_id,
                    champion_key: normalize_ddragon_champion_key(&meta.key),
                    champion_name: meta.name.clone(),
                    mode: norm_mode.to_string(),
                    role: parse_pos_role(target_pos),
                    tier: if t == 0 {
                        "OP".to_string()
                    } else {
                        t.to_string()
                    },
                    rank,
                    win_rate: pct(stats
                        .get("win_rate")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0)),
                    pick_rate: pct(stats
                        .get("pick_rate")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0)),
                    ban_rate: pct(stats
                        .get("ban_rate")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0)),
                    kda: stats.get("kda").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    play: stats.get("play").and_then(|v| v.as_u64()).unwrap_or(0),
                    avg_place: None,
                    first_rate: None,
                    top2_rate: None,
                });
            }
            continue;
        }

        let avg = row.get("average_stats").unwrap_or(&Value::Null);
        let play = avg.get("play").and_then(|v| v.as_u64()).unwrap_or(0);
        if play == 0 && api_mode != "doom" {
            continue;
        }
        let td = avg.get("tier_data").unwrap_or(&Value::Null);
        let tier_num = avg
            .get("tier")
            .or_else(|| td.get("tier"))
            .and_then(|v| v.as_u64())
            .unwrap_or(5);
        let rank_num = avg
            .get("rank")
            .or_else(|| td.get("rank"))
            .and_then(|v| v.as_u64())
            .unwrap_or(999) as u32;

        let (win_rate, avg_place, first_rate, top2_rate) = if api_mode == "arena" && play > 0 {
            let total_place = avg
                .get("total_place")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let first = avg
                .get("first_place")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let top2 = avg.get("win").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let top2_pct = (top2 / play as f64) * 100.0;
            (
                top2_pct,
                Some(total_place / play as f64),
                Some((first / play as f64) * 100.0),
                Some(top2_pct),
            )
        } else {
            (
                pct(avg.get("win_rate").and_then(|v| v.as_f64()).unwrap_or(0.0)),
                None,
                None,
                None,
            )
        };

        out.push(OpggModeTierEntry {
            champion_id: champ_id,
            champion_key: normalize_ddragon_champion_key(&meta.key),
            champion_name: meta.name.clone(),
            mode: norm_mode.to_string(),
            role: row
                .get("positions")
                .and_then(|p| p.as_array())
                .and_then(|a| a.first())
                .and_then(|p| p.get("name"))
                .and_then(|s| s.as_str())
                .map(parse_pos_role)
                .unwrap_or(Role::Unknown),
            tier: if tier_num == 0 {
                "OP".to_string()
            } else {
                tier_num.to_string()
            },
            rank: rank_num,
            win_rate,
            pick_rate: pct(avg.get("pick_rate").and_then(|v| v.as_f64()).unwrap_or(0.0)),
            ban_rate: pct(avg.get("ban_rate").and_then(|v| v.as_f64()).unwrap_or(0.0)),
            kda: avg.get("kda").and_then(|v| v.as_f64()).unwrap_or(0.0),
            play,
            avg_place,
            first_rate,
            top2_rate,
        });
    }

    out.sort_by_key(|e| (e.rank == 0, e.rank, std::cmp::Reverse(e.play)));
    Ok(out)
}

/// Fetch a complete OP.GG Desktop + MCP bundle for one champion, game mode, lane, rank tier & server region.
pub fn fetch_opgg_champion_bundle(
    champion: &str,
    mode: &str,
    role: Role,
    tier: &str,
    region: &str,
    version: Option<&str>,
) -> Result<Value, String> {
    let entry = resolve_champion_entry(champion)?;
    let norm_mode = normalize_opgg_mode(mode);
    let norm_tier = normalize_opgg_tier_slug(tier);
    let mcp_tier = normalize_opgg_mcp_tier(tier);
    let resolved_version = resolve_opgg_api_version(version);
    let opgg_pos = role_to_opgg_pos(role);
    let mcp_pos = role_to_mcp_pos(role);
    let mcp_slug = opgg_mcp_champion_slug(&entry.key);
    let region_code = if region.trim().is_empty() {
        "NA".to_string()
    } else {
        region.trim().to_ascii_uppercase()
    };

    let desktop_base_url = match norm_mode {
        "arena" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/arena/{}",
            entry.champion_id
        )),
        "ranked" | "flex" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/{norm_mode}/{}/{opgg_pos}?tier={norm_tier}&is_more=true",
            entry.champion_id
        )),
        "classic" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/classic/{}/{opgg_pos}",
            entry.champion_id
        )),
        "aram" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/aram/{}/none?tier={norm_tier}&is_more=true",
            entry.champion_id
        )),
        "aram_mayhem" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/aram_mayhem_classic/{}/none?tier=all&is_more=true",
            entry.champion_id
        )),
        "urf" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/urf/{}/none",
            entry.champion_id
        )),
        "nexus_blitz" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/nexus_blitz/{}/none",
            entry.champion_id
        )),
        "doom" => Some(format!(
            "{OPGG_CHAMPION_API}/global/champions/doom/{}/none",
            entry.champion_id
        )),
        _ => None, // "brawl" exposes OP.GG tier rankings without per-champion item/rune tables.
    };
    let effective_version = if mode_tracks_ranked_patch(norm_mode) {
        resolved_version.as_deref()
    } else {
        None
    };
    let desktop_url = desktop_base_url
        .as_deref()
        .map(|base| append_version_param(base, effective_version));

    let (
        desktop_res,
        details_res,
        skins_res,
        leaderboard_res,
        mcp_analysis_res,
        aram_augments_res,
        arena_aug_meta_res,
    ) = std::thread::scope(|s| {
        let h_desktop = desktop_base_url
            .as_deref()
            .map(|base| s.spawn(move || http_get_opgg_json(base, effective_version)));
        let h_details = s.spawn(|| {
            call_opgg_tool_json(
                OPGG_MCP_URL,
                "lol_list_champion_details",
                json!({
                    "champions": [mcp_slug],
                    "lang": "en_US",
                    "desired_output_fields": [
                        "data.champions[].{ally_tips[],blurb,enemy_tips[],id,key,lore,name,partype,release_date,tags[],title}",
                        "data.champions[].passive.{description,name}",
                        "data.champions[].spells[].{cooldown_burn[],cost_burn[],description,key,name}"
                    ]
                }),
            )
        });
        let h_skins = s.spawn(|| {
            call_opgg_tool_json(
                OPGG_MCP_URL,
                "lol_list_skin_stats_for_champion",
                json!({
                    "champion": mcp_slug,
                    "lang": "en_US",
                    "desired_output_fields": [
                        "champion_id",
                        "champion_key",
                        "champion_name",
                        "data[].{rank,skin_id,skin_name}"
                    ]
                }),
            )
        });
        let h_leaderboard = s.spawn(|| {
            call_opgg_tool_json(
                OPGG_MCP_URL,
                "lol_list_champion_leaderboard",
                json!({
                    "region": region_code,
                    "champion": mcp_slug,
                    "desired_output_fields": [
                        "champion",
                        "region",
                        "leaderboard[].rank",
                        "leaderboard[].summoner.{game_name,tagline,level,profile_image_url}",
                        "leaderboard[].summoner.league_stats[].{game_type,win,lose}",
                        "leaderboard[].summoner.league_stats[].tier_info.{tier,division,lp}",
                        "leaderboard[].most_champion_stat.{play,win,lose,kill,death,assist,op_score}"
                    ]
                }),
            )
        });

        let h_mcp_analysis = if matches!(norm_mode, "ranked" | "flex") {
            Some(s.spawn(|| {
                call_opgg_tool_json(
                    OPGG_MCP_URL,
                    "lol_get_champion_analysis",
                    json!({
                        "game_mode": norm_mode,
                        "champion": mcp_slug,
                        "position": mcp_pos,
                        "tier": mcp_tier,
                        "lang": "en_US",
                        "desired_output_fields": [
                            "champion",
                            "position",
                            "data.damage_type",
                            "data.skill_combos[].{name,video_url}",
                            "data.strong_counters[].{champion_id,champion_name,counter_win_rate,my_win_rate,play,win,win_rate}",
                            "data.weak_counters[].{champion_id,champion_name,counter_win_rate,my_win_rate,play,win,win_rate}",
                            "data.synergies.adc[].{champion_id,champion_name,play,position,score,score_rank,synergy_champion_id,synergy_champion_name,synergy_position,win,win_rate}",
                            "data.synergies.jungle[].{champion_id,champion_name,play,position,score,score_rank,synergy_champion_id,synergy_champion_name,synergy_position,win,win_rate}",
                            "data.synergies.mid[].{champion_id,champion_name,play,position,score,score_rank,synergy_champion_id,synergy_champion_name,synergy_position,win,win_rate}",
                            "data.synergies.support[].{champion_id,champion_name,play,position,score,score_rank,synergy_champion_id,synergy_champion_name,synergy_position,win,win_rate}",
                            "data.trends.total_position_rank",
                            "data.trends.total_rank",
                            "data.trends.win.{created_at,rank,rate,version}",
                            "data.trends.pick.{created_at,rank,rate,version}",
                            "data.trends.ban.{created_at,rank,rate,version}"
                        ]
                    }),
                )
            }))
        } else {
            None
        };

        let h_aram_augments = if matches!(norm_mode, "aram" | "aram_mayhem") {
            Some(s.spawn(|| {
                call_opgg_tool_json(
                    OPGG_MCP_URL,
                    "lol_list_aram_augments",
                    json!({
                        "champion_id": entry.champion_id,
                        "lang": "en_US",
                        "desired_output_fields": [
                            "champion_id",
                            "data.augments[].{desc,id,name,performance,popular,tier}"
                        ]
                    }),
                )
            }))
        } else {
            None
        };

        let h_arena_aug_meta = if norm_mode == "arena" {
            Some(s.spawn(fetch_opgg_augments_catalog))
        } else {
            None
        };

        let desktop_res = match h_desktop {
            Some(h) => match h.join() {
                Ok(res) => res,
                Err(_) => Err("Desktop fetch thread panicked".to_string()),
            },
            None => Err("No build endpoint for Brawl tier-only mode".to_string()),
        };
        let details_res = match h_details.join() {
            Ok(res) => res,
            Err(_) => Err("Details thread panicked".to_string()),
        };
        let skins_res = match h_skins.join() {
            Ok(res) => res,
            Err(_) => Err("Skins thread panicked".to_string()),
        };
        let leaderboard_res = match h_leaderboard.join() {
            Ok(res) => res,
            Err(_) => Err("Leaderboard thread panicked".to_string()),
        };
        let mcp_analysis_res = h_mcp_analysis.map(|h| match h.join() {
            Ok(res) => res,
            Err(_) => Err("MCP analysis thread panicked".to_string()),
        });
        let aram_augments_res = h_aram_augments.map(|h| match h.join() {
            Ok(res) => res,
            Err(_) => Err("ARAM augments thread panicked".to_string()),
        });
        let arena_aug_meta_res = h_arena_aug_meta.map(|h| match h.join() {
            Ok(res) => res,
            Err(_) => Err("Arena meta augments thread panicked".to_string()),
        });

        (
            desktop_res,
            details_res,
            skins_res,
            leaderboard_res,
            mcp_analysis_res,
            aram_augments_res,
            arena_aug_meta_res,
        )
    });

    let mut errors = Vec::new();
    let served_patch = desktop_res
        .as_ref()
        .ok()
        .and_then(|v| v.get("meta"))
        .and_then(|m| m.get("version"))
        .and_then(|v| v.as_str())
        .map(str::to_owned)
        .or(resolved_version);
    let desktop_data = match desktop_res {
        Ok(v) => v.get("data").cloned().unwrap_or(v),
        Err(e) => {
            if norm_mode != "brawl" {
                errors.push(format!("desktop_api: {e}"));
            }
            Value::Null
        }
    };
    let champion_details = match details_res {
        Ok(v) => v
            .get("data")
            .and_then(|d| d.get("champions"))
            .and_then(|c| c.as_array())
            .and_then(|arr| {
                arr.iter()
                    .find(|item| {
                        item.get("id").and_then(|id| id.as_u64()) == Some(entry.champion_id as u64)
                    })
                    .or_else(|| arr.first())
            })
            .cloned()
            .unwrap_or(Value::Null),
        Err(e) => {
            errors.push(format!("champion_details: {e}"));
            Value::Null
        }
    };
    let skins = match skins_res {
        Ok(v) => v.get("data").cloned().unwrap_or(Value::Array(vec![])),
        Err(e) => {
            errors.push(format!("skins: {e}"));
            Value::Array(vec![])
        }
    };
    let mastery_leaderboard = match leaderboard_res {
        Ok(v) => v
            .get("leaderboard")
            .cloned()
            .unwrap_or(Value::Array(vec![])),
        Err(e) => {
            errors.push(format!("leaderboard: {e}"));
            Value::Array(vec![])
        }
    };
    let mcp_analysis = match mcp_analysis_res {
        Some(Ok(v)) => v,
        Some(Err(e)) => {
            errors.push(format!("mcp_analysis: {e}"));
            Value::Null
        }
        None => Value::Null,
    };
    let aram_augments = match aram_augments_res {
        Some(Ok(v)) => v
            .get("data")
            .and_then(|d| d.get("augments"))
            .cloned()
            .unwrap_or(Value::Array(vec![])),
        Some(Err(e)) => {
            errors.push(format!("aram_augments: {e}"));
            Value::Array(vec![])
        }
        None => Value::Array(vec![]),
    };

    // Enrich Arena augment groups directly with name/desc/icons from OP.GG /api/meta/augments.
    let mut arena_augments_meta = BTreeMap::new();
    if let (Some(Ok(aug_catalog)), Some(groups)) = (
        arena_aug_meta_res,
        desktop_data.get("augment_group").and_then(|g| g.as_array()),
    ) {
        for aug in groups
            .iter()
            .filter_map(|group| group.get("augments").and_then(|a| a.as_array()))
            .flatten()
        {
            if let Some(id) = aug.get("id").and_then(|v| v.as_u64()).map(|v| v as u32) {
                if let Some(meta) = aug_catalog.get(&id) {
                    arena_augments_meta.insert(id.to_string(), meta.clone());
                }
            }
        }
    }

    // Also include a lightweight id->catalog map so Arena synergies & counters resolve names/icons without guessing.
    let catalog_by_id: BTreeMap<String, Value> = fetch_opgg_champions_catalog()
        .unwrap_or_default()
        .into_iter()
        .map(|c| {
            let clean_key = normalize_ddragon_champion_key(&c.key);
            (
                c.champion_id.to_string(),
                json!({ "id": c.champion_id, "key": clean_key, "name": c.name }),
            )
        })
        .collect();

    Ok(json!({
        "championId": entry.champion_id,
        "key": normalize_ddragon_champion_key(&entry.key),
        "name": entry.name,
        "mode": norm_mode,
        "role": role,
        "tier": norm_tier,
        "region": region_code,
        "patch": served_patch,
        "endpointUrl": desktop_url.unwrap_or_default(),
        "desktopData": desktop_data,
        "mcpAnalysis": mcp_analysis,
        "championDetails": champion_details,
        "aramAugments": aram_augments,
        "arenaAugmentsMeta": arena_augments_meta,
        "skins": skins,
        "masteryLeaderboard": mastery_leaderboard,
        "championCatalogById": catalog_by_id,
        "errors": errors,
    }))
}

fn champion_catalog_map() -> HashMap<u32, OpggCatalogEntry> {
    fetch_opgg_champions_catalog()
        .unwrap_or_default()
        .into_iter()
        .map(|c| (c.champion_id, c))
        .collect()
}

/// Fetch live U.GG Ranked Solo/Duo champion build & lane counters by resolving name/key via live catalog.
pub fn fetch_ugg_champion_build(
    champion: &str,
    patch: &str,
    role: Role,
) -> Result<UggBuildResponse, String> {
    let entry = resolve_champion_entry(champion)?;
    let catalog = champion_catalog_map();
    fetch_ugg_champion_overview_with_catalog(entry.champion_id, patch, role, &catalog)
}

/// Fetch live U.GG champion tier list (`ranked`, `flex`, or `aram`) directly from `stats2.u.gg`.
pub fn fetch_ugg_tier_list_for_mode(
    mode: &str,
    role: Role,
    tier: &str,
    patch: Option<&str>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    let resolved_patch = patch
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| crate::assets::fetch_live_patch_metadata(false).latest_patch);
    let catalog = champion_catalog_map();
    fetch_ugg_tier_list(mode, role, tier, &resolved_patch, &catalog)
}

/// Fetch live LoLalytics Ranked Solo/Duo tier list directly from `a1.lolalytics.com/mega/?ep=tier`.
pub fn fetch_lolalytics_tier_list_for_role(
    role: Role,
    tier: &str,
    patch: Option<&str>,
    period: Option<&str>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    let catalog = champion_catalog_map();
    fetch_lolalytics_tier_list(role, tier, patch, period, &catalog)
}

/// Fetch live LoLalytics champion build (runes, core item sets, counters & ally synergies).
pub fn fetch_lolalytics_champion_build_by_name(
    champion: &str,
    role: Role,
    tier: &str,
    patch: Option<&str>,
) -> Result<LolalyticsBuildResponse, String> {
    let entry = resolve_champion_entry(champion)?;
    let catalog = champion_catalog_map();
    fetch_lolalytics_champion_build(&entry, role, tier, patch, &catalog)
}

/// Unified multi-provider live tier-list dispatcher supporting OP.GG, U.GG, and LoLalytics.
pub fn fetch_unified_provider_tier_list(
    provider_id: &str,
    mode: &str,
    role: Role,
    tier: &str,
    patch: Option<&str>,
    period: Option<&str>,
) -> Result<Vec<OpggModeTierEntry>, String> {
    match provider_id.trim().to_ascii_lowercase().as_str() {
        "ugg" => fetch_ugg_tier_list_for_mode(mode, role, tier, patch),
        "lolalytics" => fetch_lolalytics_tier_list_for_role(role, tier, patch, period),
        "opgg" | "" => fetch_opgg_mode_tier_list(mode, role, tier, patch),
        other => Err(format!(
            "Provider '{other}' does not provide a live open tier-list endpoint."
        )),
    }
}

/// Fetch live Meraki Analytics CDN champion kit & scaling reference by resolving name/key via OP.GG live catalog.
pub fn fetch_meraki_champion_kit(champion: &str) -> Result<MerakiChampionDetail, String> {
    let entry = resolve_champion_entry(champion)?;
    fetch_meraki_champion_detail(&normalize_ddragon_champion_key(&entry.key))
}

/// Honest, empirically tested API capability matrix across all third-party providers.
pub fn get_provider_diagnostics(patch: &str) -> Vec<ProviderDiagnostic> {
    let clean_patch = patch.trim();
    let slug = crate::providers::ugg::ugg_patch_slug(clean_patch);
    vec![
        ProviderDiagnostic {
            id: "opgg".to_string(),
            name: "OP.GG".to_string(),
            tier_list_status: "Live".to_string(),
            build_data_status: "Live".to_string(),
            summary: "Full official MCP + OP.GG Desktop JSON APIs covering all 10 game modes, 15-region leaderboards, summoner history, matchup guides & esports.".to_string(),
            sample_endpoint: format!(
                "https://lol-api-champion.op.gg/api/global/champions/ranked?tier=emerald_plus&version={clean_patch}"
            ),
        },
        ProviderDiagnostic {
            id: "ugg".to_string(),
            name: "U.GG".to_string(),
            tier_list_status: "Live".to_string(),
            build_data_status: "Live".to_string(),
            summary: "stats2.u.gg serves open JSON tier lists (Ranked Solo/Duo, Flex, ARAM via champion_ranking/world/...), per-champion builds (runes, items, skills), lane counters, and automated patch manifests via static.bigbrain.gg.".to_string(),
            sample_endpoint: format!(
                "https://stats2.u.gg/lol/1.5/champion_ranking/world/{slug}/ranked_solo_5x5/emerald_plus/1.5.0.json"
            ),
        },
        ProviderDiagnostic {
            id: "lolalytics".to_string(),
            name: "LoLalytics".to_string(),
            tier_list_status: "Live".to_string(),
            build_data_status: "Live".to_string(),
            summary: "a1.lolalytics.com/mega/ serves open JSON Ranked tier lists (ep=tier with S+..D- tiers & 7d/14d/30d windows), runes (ep=rune), core item sets (ep=build-itemset), counters (ep=counter) & ally synergies (ep=build-team).".to_string(),
            sample_endpoint: format!(
                "https://a1.lolalytics.com/mega/?ep=tier&p=d&v=1&patch={clean_patch}&lane=top&tier=emerald_plus&queue=ranked&region=all"
            ),
        },
        ProviderDiagnostic {
            id: "merakicdn".to_string(),
            name: "Meraki CDN".to_string(),
            tier_list_status: "Not Provided".to_string(),
            build_data_status: "Live".to_string(),
            summary: "cdn.merakianalytics.com serves open JSON champion kits (champions/{Key}.json), attack/adaptive types, ability scaling & item encyclopedia (items.json); does not publish match winrate tier lists.".to_string(),
            sample_endpoint: "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Malphite.json".to_string(),
        },
        ProviderDiagnostic {
            id: "dpmlol".to_string(),
            name: "DPM.LOL".to_string(),
            tier_list_status: "Blocked (CF 403)".to_string(),
            build_data_status: "Blocked (CF 403)".to_string(),
            summary: "dpm.lol endpoints are protected behind Cloudflare Managed Challenge (HTTP 403, no public API subdomain); Baron never bypasses anti-bot challenges.".to_string(),
            sample_endpoint: "https://dpm.lol/tierlist".to_string(),
        },
        ProviderDiagnostic {
            id: "metasrc".to_string(),
            name: "MetaSRC".to_string(),
            tier_list_status: "Blocked (CF 403)".to_string(),
            build_data_status: "Blocked (CF 403)".to_string(),
            summary: "metasrc.com is gated by Cloudflare Managed Challenge (HTTP 403, no public JSON API); Baron never bypasses anti-bot challenges.".to_string(),
            sample_endpoint: "https://www.metasrc.com/lol/5v5/tier-list".to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_modes_and_tiers() {
        assert_eq!(normalize_opgg_mode("ARAM: Mayhem"), "aram_mayhem");
        assert_eq!(normalize_opgg_mode("mayhem"), "aram_mayhem");
        assert_eq!(normalize_opgg_mode("aram_mayhem"), "aram_mayhem");
        assert_eq!(normalize_opgg_mode("nexus-blitz"), "nexus_blitz");
        assert_eq!(normalize_opgg_mode("Arena"), "arena");
        assert_eq!(normalize_opgg_tier_slug("Diamond+"), "diamond_plus");
        assert_eq!(normalize_opgg_mcp_tier("master+"), "MASTER_PLUS");
    }

    #[test]
    fn converts_champion_names_to_opgg_mcp_slugs() {
        assert_eq!(opgg_mcp_champion_slug("Malphite"), "MALPHITE");
        assert_eq!(opgg_mcp_champion_slug("Lee Sin"), "LEE_SIN");
        assert_eq!(opgg_mcp_champion_slug("LeeSin"), "LEE_SIN");
        assert_eq!(opgg_mcp_champion_slug("Wukong"), "MONKEY_KING");
        assert_eq!(opgg_mcp_champion_slug("K'Sante"), "KSANTE");
        assert_eq!(
            normalize_ddragon_champion_key("Jade_Gangplank"),
            "Gangplank"
        );
        assert_eq!(normalize_ddragon_champion_key("Jade_DrMundo"), "DrMundo");
        assert_eq!(normalize_ddragon_champion_key("Jade_Wukong"), "MonkeyKing");
        assert_eq!(
            normalize_ddragon_champion_key("Fiddlesticks"),
            "Fiddlesticks"
        );
    }
}
