//! URLs and patch version helpers for Data Dragon and CommunityDragon static League assets.

/// Current live League of Legends short patch (`16.22`).
pub const LATEST_PATCH: &str = "16.22";

/// Current live Data Dragon full asset version (`16.22.1`).
pub const LATEST_DDRAGON_VERSION: &str = "16.22.1";

/// Selectable rolling time periods in the Patch/Period selector popover (`7 days`, `14 days`, `30 days`).
pub const AVAILABLE_PERIODS: [&str; 3] = ["7 days", "14 days", "30 days"];

/// Selectable Season 16 patches (`16.22` down to `16.10`) fetched from Data Dragon / OP.GG / LoLalytics.
pub const AVAILABLE_PATCHES: [&str; 13] = [
    "16.22", "16.21", "16.20", "16.19", "16.18", "16.17", "16.16", "16.15", "16.14", "16.13",
    "16.12", "16.11", "16.10",
];

/// Data Dragon API endpoint returning all released League patch versions (`["16.22.1", "16.21.1", ...]`).
pub fn ddragon_versions_url() -> &'static str {
    "https://ddragon.leagueoflegends.com/api/versions.json"
}

/// Converts Data Dragon version strings (e.g. `"16.22.1"`) into deduplicated `major.minor` patch strings (`"16.22"`).
pub fn normalize_ddragon_versions_to_patches(versions: &[&str]) -> Vec<String> {
    let mut out = Vec::new();
    for v in versions {
        let mut parts = v.split('.');
        if let (Some(maj), Some(min)) = (parts.next(), parts.next()) {
            if maj.chars().all(|c| c.is_ascii_digit()) && min.chars().all(|c| c.is_ascii_digit()) {
                let short = format!("{maj}.{min}");
                if !out.contains(&short) {
                    out.push(short);
                }
            }
        }
    }
    out
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
        assert_eq!(LATEST_PATCH, "16.22");
        assert_eq!(AVAILABLE_PATCHES[0], "16.22");
        assert_eq!(AVAILABLE_PATCHES[12], "16.10");
        assert_eq!(AVAILABLE_PERIODS, ["7 days", "14 days", "30 days"]);

        let normalized =
            normalize_ddragon_versions_to_patches(&["16.22.1", "16.21.1", "16.20.1", "16.20.2"]);
        assert_eq!(normalized, vec!["16.22", "16.21", "16.20"]);

        assert_eq!(
            ddragon_versions_url(),
            "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        assert_eq!(
            ddragon_champion_icon_url("16.22", "Ahri"),
            "https://ddragon.leagueoflegends.com/cdn/16.22.1/img/champion/Ahri.png"
        );
        assert_eq!(
            ddragon_item_icon_url("16.22.1", 3078),
            "https://ddragon.leagueoflegends.com/cdn/16.22.1/img/item/3078.png"
        );
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
