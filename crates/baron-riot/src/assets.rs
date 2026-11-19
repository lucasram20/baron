//! URLs and patch version helpers for Data Dragon and CommunityDragon static League assets.

use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

/// Compile-time fallback League of Legends short patch (`16.23`) used only when offline.
pub const LATEST_PATCH: &str = "16.23";

/// Compile-time fallback Data Dragon full asset version (`16.23.1`) used only when offline.
pub const LATEST_DDRAGON_VERSION: &str = "16.23.1";

/// Selectable rolling time periods in the Patch/Period selector popover (`7 days`, `14 days`, `30 days`).
pub const AVAILABLE_PERIODS: [&str; 3] = ["7 days", "14 days", "30 days"];

/// Compile-time fallback Season 16 patches (`16.23` down to `16.11`) used when live version discovery is offline.
pub const AVAILABLE_PATCHES: [&str; 13] = [
    "16.23", "16.22", "16.21", "16.20", "16.19", "16.18", "16.17", "16.16", "16.15", "16.14",
    "16.13", "16.12", "16.11",
];

const PATCH_CACHE_TTL: Duration = Duration::from_secs(15 * 60);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LivePatchMetadata {
    pub latest_patch: String,
    pub ddragon_version: String,
    pub patches: Vec<String>,
    pub opgg_patches: Vec<String>,
    pub fetched_live: bool,
}

struct CachedPatchMetadata {
    fetched_at: Instant,
    meta: LivePatchMetadata,
}

static LIVE_PATCH_CACHE: OnceLock<Mutex<Option<CachedPatchMetadata>>> = OnceLock::new();

/// Clears cached live patch metadata so the next bootstrap/refresh re-queries Riot Data Dragon & OP.GG.
pub fn clear_patch_metadata_cache() {
    if let Some(lock) = LIVE_PATCH_CACHE.get() {
        let mut guard = lock.lock().unwrap_or_else(|e| e.into_inner());
        *guard = None;
    }
}

/// Data Dragon API endpoint returning all released League patch versions (`["16.23.1", "16.22.1", ...]`).
pub fn ddragon_versions_url() -> &'static str {
    "https://ddragon.leagueoflegends.com/api/versions.json"
}

/// Returns true when a short patch string has the form `<digits>.<digits>` (e.g. `"16.23"`).
pub fn is_valid_short_patch(patch: &str) -> bool {
    let mut parts = patch.trim().split('.');
    match (parts.next(), parts.next(), parts.next()) {
        (Some(maj), Some(min), None) => {
            !maj.is_empty()
                && !min.is_empty()
                && maj.chars().all(|c| c.is_ascii_digit())
                && min.chars().all(|c| c.is_ascii_digit())
        }
        _ => false,
    }
}

/// Converts Data Dragon version strings (e.g. `"16.23.1"`) into deduplicated `major.minor` patch strings (`"16.23"`).
pub fn normalize_ddragon_versions_to_patches(versions: &[&str]) -> Vec<String> {
    let mut out = Vec::new();
    for v in versions {
        let mut parts = v.split('.');
        if let (Some(maj), Some(min)) = (parts.next(), parts.next()) {
            if !maj.is_empty()
                && !min.is_empty()
                && maj.chars().all(|c| c.is_ascii_digit())
                && min.chars().all(|c| c.is_ascii_digit())
            {
                let short = format!("{maj}.{min}");
                if !out.contains(&short) {
                    out.push(short);
                }
            }
        }
    }
    out
}

/// Extracts valid `major.minor` versions from OP.GG's `{"data":["16.23","16.22"]}` payload.
pub fn parse_opgg_versions_json(val: &serde_json::Value) -> Vec<String> {
    let mut out = Vec::new();
    if let Some(arr) = val.get("data").and_then(|d| d.as_array()) {
        for item in arr {
            if let Some(s) = item.as_str() {
                let trimmed = s.trim();
                if is_valid_short_patch(trimmed) && !out.iter().any(|x| x == trimmed) {
                    out.push(trimmed.to_string());
                }
            }
        }
    }
    out
}

/// Assembles normalized `LivePatchMetadata` from raw Data Dragon and OP.GG version lists.
pub fn build_live_patch_metadata(
    ddragon_versions: &[String],
    opgg_versions: &[String],
    fetched_live: bool,
) -> LivePatchMetadata {
    let valid_dd: Vec<&str> = ddragon_versions
        .iter()
        .map(String::as_str)
        .filter(|v| {
            let mut parts = v.split('.');
            matches!(
                (parts.next(), parts.next()),
                (Some(maj), Some(min))
                    if !maj.is_empty()
                        && !min.is_empty()
                        && maj.chars().all(|c| c.is_ascii_digit())
                        && min.chars().all(|c| c.is_ascii_digit())
            )
        })
        .collect();

    let ddragon_version = valid_dd
        .first()
        .map(|s| (*s).to_string())
        .unwrap_or_else(|| LATEST_DDRAGON_VERSION.to_string());

    let mut patches = normalize_ddragon_versions_to_patches(&valid_dd);
    if patches.is_empty() {
        patches = AVAILABLE_PATCHES.iter().map(|s| (*s).to_string()).collect();
    }

    let opgg_patches: Vec<String> = opgg_versions
        .iter()
        .filter(|v| is_valid_short_patch(v))
        .cloned()
        .collect();

    for opgg_patch in opgg_patches.iter().rev() {
        if !patches.contains(opgg_patch) {
            patches.insert(0, opgg_patch.clone());
        }
    }
    patches.truncate(13);

    let latest_patch = opgg_patches
        .first()
        .cloned()
        .or_else(|| patches.first().cloned())
        .unwrap_or_else(|| LATEST_PATCH.to_string());

    LivePatchMetadata {
        latest_patch,
        ddragon_version,
        patches,
        opgg_patches,
        fetched_live,
    }
}

/// Dynamically fetches the latest League of Legends patch versions from Riot Data Dragon and OP.GG,
/// caching the result for 15 minutes (or refreshing immediately when `force_refresh` is true).
pub fn fetch_live_patch_metadata(force_refresh: bool) -> LivePatchMetadata {
    let lock = LIVE_PATCH_CACHE.get_or_init(|| Mutex::new(None));
    if !force_refresh {
        let guard = lock.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(cached) = guard.as_ref() {
            if cached.fetched_at.elapsed() < PATCH_CACHE_TTL {
                return cached.meta.clone();
            }
        }
    }

    let (dd_res, opgg_res) = std::thread::scope(|s| {
        let h_dd = s.spawn(|| crate::providers::http_get_json(ddragon_versions_url()));
        let h_opgg = s.spawn(|| {
            crate::providers::http_get_json(crate::fallback::opgg_versions_endpoint_url())
        });
        let dd = h_dd
            .join()
            .unwrap_or_else(|_| Err("DDragon versions thread panicked".to_string()));
        let opgg = h_opgg
            .join()
            .unwrap_or_else(|_| Err("OP.GG versions thread panicked".to_string()));
        (dd, opgg)
    });

    let dd_versions: Vec<String> = dd_res
        .ok()
        .and_then(|v| v.as_array().cloned())
        .map(|arr| {
            arr.into_iter()
                .filter_map(|item| item.as_str().map(str::to_owned))
                .take(40)
                .collect()
        })
        .unwrap_or_default();

    let opgg_versions: Vec<String> = opgg_res
        .ok()
        .map(|v| parse_opgg_versions_json(&v))
        .unwrap_or_default();

    let fetched_live = !dd_versions.is_empty() || !opgg_versions.is_empty();
    let meta = build_live_patch_metadata(&dd_versions, &opgg_versions, fetched_live);

    if fetched_live {
        let mut guard = lock.lock().unwrap_or_else(|e| e.into_inner());
        *guard = Some(CachedPatchMetadata {
            fetched_at: Instant::now(),
            meta: meta.clone(),
        });
    }

    meta
}

/// Data Dragon square champion avatar icon URL.
pub fn ddragon_champion_icon_url(patch: &str, champion_key: &str) -> String {
    let full = if patch.matches('.').count() == 1 {
        format!("{patch}.1")
    } else {
        patch.to_string()
    };
    format!("https://ddragon.leagueoflegends.com/cdn/{full}/img/champion/{champion_key}.png")
}

/// Data Dragon in-game item square icon URL.
pub fn ddragon_item_icon_url(patch: &str, item_id: i32) -> String {
    let full = if patch.matches('.').count() == 1 {
        format!("{patch}.1")
    } else {
        patch.to_string()
    };
    format!("https://ddragon.leagueoflegends.com/cdn/{full}/img/item/{item_id}.png")
}

/// CommunityDragon raw skins metadata containing tier/rarity tags.
pub fn cdragon_skins_metadata_url() -> &'static str {
    "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json"
}

/// CommunityDragon Arena / ARAM Mayhem augment definitions and icons.
pub fn cdragon_arena_augments_url() -> &'static str {
    "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/arena-augments.json"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ddragon_urls_and_patch_normalization() {
        assert_eq!(LATEST_PATCH, "16.23");
        assert_eq!(AVAILABLE_PATCHES[0], "16.23");
        assert_eq!(AVAILABLE_PATCHES[12], "16.11");
        assert_eq!(AVAILABLE_PERIODS, ["7 days", "14 days", "30 days"]);

        let normalized =
            normalize_ddragon_versions_to_patches(&["16.23.1", "16.22.1", "16.21.1", "16.21.2"]);
        assert_eq!(normalized, vec!["16.23", "16.22", "16.21"]);

        assert_eq!(
            ddragon_versions_url(),
            "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        assert_eq!(
            ddragon_champion_icon_url("16.23", "Ahri"),
            "https://ddragon.leagueoflegends.com/cdn/16.23.1/img/champion/Ahri.png"
        );
        assert_eq!(
            ddragon_item_icon_url("16.23.1", 3078),
            "https://ddragon.leagueoflegends.com/cdn/16.23.1/img/item/3078.png"
        );
    }

    #[test]
    fn test_live_patch_metadata_assembly() {
        let dd = vec![
            "16.24.1".to_string(),
            "16.23.1".to_string(),
            "16.22.1".to_string(),
        ];
        let opgg = parse_opgg_versions_json(&serde_json::json!({
            "data": ["16.24", "16.23"]
        }));
        let meta = build_live_patch_metadata(&dd, &opgg, true);
        assert_eq!(meta.latest_patch, "16.24");
        assert_eq!(meta.ddragon_version, "16.24.1");
        assert_eq!(meta.patches, vec!["16.24", "16.23", "16.22"]);
        assert_eq!(meta.opgg_patches, vec!["16.24", "16.23"]);
        assert!(meta.fetched_live);

        let offline = build_live_patch_metadata(&[], &[], false);
        assert_eq!(offline.latest_patch, LATEST_PATCH);
        assert_eq!(offline.ddragon_version, LATEST_DDRAGON_VERSION);
        assert!(!offline.fetched_live);
    }

    #[test]
    fn test_cdragon_urls() {
        assert_eq!(
            cdragon_skins_metadata_url(),
            "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json"
        );
        assert_eq!(
            cdragon_arena_augments_url(),
            "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/arena-augments.json"
        );
    }
}
