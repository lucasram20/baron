use serde::{Deserialize, Serialize};

/// Riot Skin Rarity tier mapped from CommunityDragon metadata.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SkinRarity {
    Exalted,
    Ultimate,
    Mythic,
    Legendary,
    Epic,
    Standard,
}

impl SkinRarity {
    /// Maps CDragon rarity strings (e.g. "kUltimate", "LEGENDARY", "kEpic") to `SkinRarity`.
    pub fn from_cdragon_str(s: &str) -> Self {
        match s.trim().to_ascii_lowercase().as_str() {
            "kexalted" | "exalted" => Self::Exalted,
            "kultimate" | "ultimate" => Self::Ultimate,
            "kmythic" | "mythic" => Self::Mythic,
            "klegendary" | "legendary" => Self::Legendary,
            "kepic" | "epic" => Self::Epic,
            _ => Self::Standard,
        }
    }

    /// Estimated RP purchase cost / nominal collection valuation.
    pub fn estimated_rp(&self) -> u32 {
        match self {
            Self::Exalted => 32000,
            Self::Ultimate => 3250,
            Self::Mythic => 2500,
            Self::Legendary => 1820,
            Self::Epic => 1350,
            Self::Standard => 975,
        }
    }

    /// Clean display label for UI badges.
    pub fn label(&self) -> &'static str {
        match self {
            Self::Exalted => "Exalted",
            Self::Ultimate => "Ultimate",
            Self::Mythic => "Mythic",
            Self::Legendary => "Legendary",
            Self::Epic => "Epic",
            Self::Standard => "Standard",
        }
    }
}

/// A champion skin owned or unowned in the player's account inventory.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OwnedSkinEntry {
    pub skin_id: i32,
    pub champion_name: String,
    pub name: String,
    pub is_base: bool,
    pub owned: bool,
    pub rarity: SkinRarity,
}

/// Aggregated metrics for the Skin Collection Vault calculator.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct SkinVaultSummary {
    pub total_owned_skins: usize,
    pub total_estimated_rp: u32,
    pub ultimate_count: usize,
    pub mythic_count: usize,
    pub legendary_count: usize,
    pub epic_count: usize,
    pub standard_count: usize,
}

/// Computes collection statistics, excluding unowned and base champion skins.
pub fn evaluate_skin_collection(skins: &[OwnedSkinEntry]) -> SkinVaultSummary {
    let mut summary = SkinVaultSummary::default();
    for skin in skins.iter().filter(|s| s.owned && !s.is_base) {
        summary.total_owned_skins += 1;
        summary.total_estimated_rp += skin.rarity.estimated_rp();
        match skin.rarity {
            SkinRarity::Ultimate | SkinRarity::Exalted => summary.ultimate_count += 1,
            SkinRarity::Mythic => summary.mythic_count += 1,
            SkinRarity::Legendary => summary.legendary_count += 1,
            SkinRarity::Epic => summary.epic_count += 1,
            SkinRarity::Standard => summary.standard_count += 1,
        }
    }
    summary
}

/// Test-only sample owned skin fixture. Live inventory requires League Client LCU.
#[cfg(test)]
pub fn sample_owned_skins() -> Vec<OwnedSkinEntry> {
    // ponytail: sample dataset; live inventory fetched from /lol-champions/v1/inventories/...
    vec![
        OwnedSkinEntry {
            skin_id: 103000,
            champion_name: "Ahri".into(),
            name: "Ahri".into(),
            is_base: true,
            owned: true,
            rarity: SkinRarity::Standard,
        },
        OwnedSkinEntry {
            skin_id: 103027,
            champion_name: "Ahri".into(),
            name: "Spirit Blossom Ahri".into(),
            is_base: false,
            owned: true,
            rarity: SkinRarity::Legendary,
        },
        OwnedSkinEntry {
            skin_id: 99007,
            champion_name: "Lux".into(),
            name: "Elementalist Lux".into(),
            is_base: false,
            owned: true,
            rarity: SkinRarity::Ultimate,
        },
        OwnedSkinEntry {
            skin_id: 103085,
            champion_name: "Ahri".into(),
            name: "Immortalized Legend Ahri".into(),
            is_base: false,
            owned: false,
            rarity: SkinRarity::Exalted,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skin_rarity_parsing_and_rp() {
        assert_eq!(
            SkinRarity::from_cdragon_str("kUltimate"),
            SkinRarity::Ultimate
        );
        assert_eq!(
            SkinRarity::from_cdragon_str("LEGENDARY"),
            SkinRarity::Legendary
        );
        assert_eq!(SkinRarity::from_cdragon_str("epic"), SkinRarity::Epic);
        assert_eq!(
            SkinRarity::from_cdragon_str("unknown"),
            SkinRarity::Standard
        );

        assert_eq!(SkinRarity::Ultimate.estimated_rp(), 3250);
        assert_eq!(SkinRarity::Legendary.estimated_rp(), 1820);
        assert_eq!(SkinRarity::Standard.label(), "Standard");
    }

    #[test]
    fn test_evaluate_skin_collection() {
        let skins = sample_owned_skins();
        let summary = evaluate_skin_collection(&skins);

        // Ahri base (is_base=true) and unowned Exalted (owned=false) are excluded
        assert_eq!(summary.total_owned_skins, 2);
        assert_eq!(summary.total_estimated_rp, 1820 + 3250);
        assert_eq!(summary.legendary_count, 1);
        assert_eq!(summary.ultimate_count, 1);
        assert_eq!(summary.mythic_count, 0);
    }
}
