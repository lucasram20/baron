//! URLs for Data Dragon and CommunityDragon static League assets.

/// Data Dragon API endpoint returning all released League patch versions.
pub fn ddragon_versions_url() -> &'static str {
    "https://ddragon.leagueoflegends.com/api/versions.json"
}

/// Data Dragon square champion avatar icon URL.
pub fn ddragon_champion_icon_url(patch: &str, champion_key: &str) -> String {
    format!("https://ddragon.leagueoflegends.com/cdn/{patch}/img/champion/{champion_key}.png")
}

/// Data Dragon in-game item square icon URL.
pub fn ddragon_item_icon_url(patch: &str, item_id: i32) -> String {
    format!("https://ddragon.leagueoflegends.com/cdn/{patch}/img/item/{item_id}.png")
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
    fn test_ddragon_urls() {
        assert_eq!(
            ddragon_versions_url(),
            "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        assert_eq!(
            ddragon_champion_icon_url("14.10.1", "Ahri"),
            "https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Ahri.png"
        );
        assert_eq!(
            ddragon_item_icon_url("14.10.1", 3078),
            "https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/3078.png"
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
