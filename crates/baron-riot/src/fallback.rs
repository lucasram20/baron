use baron_core::models::{ChampionTierEntry, DraftRecommendation, Role};
use serde::{Deserialize, Serialize};
use crate::web_api::RiotApiParseError;

/// Third-party / community data providers used as fallback mirrors.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FallbackProvider {
    UGg,
    OpGg,
    DpmLol,
    MerakiCdn,
}

impl FallbackProvider {
    pub fn label(&self) -> &'static str {
        match self {
            Self::UGg => "U.GG",
            Self::OpGg => "OP.GG",
            Self::DpmLol => "DPM.LOL",
            Self::MerakiCdn => "Meraki CDN",
        }
    }

    pub fn build_endpoint_url(&self, patch: &str, champion_key: &str, _role: Role) -> String {
        match self {
            Self::UGg => format!("https://stats2.u.gg/lol/1.5/overview/{patch}/ranked_solo_5x5/{champion_key}/1.5.0.json"),
            Self::OpGg => format!("https://op.gg/api/v1.0/internal/bypass/champions/{champion_key}/build?patch={patch}"),
            Self::DpmLol => format!("https://dpm.lol/api/v1/champions/{champion_key}/build?patch={patch}"),
            Self::MerakiCdn => format!("https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/{champion_key}.json"),
        }
    }

    pub fn tier_list_endpoint_url(&self, patch: &str) -> String {
        match self {
            Self::UGg => format!("https://stats2.u.gg/lol/1.5/tier_list/{patch}/ranked_solo_5x5.json"),
            Self::OpGg => format!("https://op.gg/api/v1.0/internal/bypass/champions/tier-list?patch={patch}"),
            Self::DpmLol => format!("https://dpm.lol/api/v1/tier-list?patch={patch}"),
            Self::MerakiCdn => "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json".to_string(),
        }
    }
}

pub const DEFAULT_FALLBACK_ORDER: [FallbackProvider; 4] = [
    FallbackProvider::UGg,
    FallbackProvider::OpGg,
    FallbackProvider::DpmLol,
    FallbackProvider::MerakiCdn,
];

/// Parses provider / normalized JSON into `DraftRecommendation`.
pub fn parse_fallback_build_json(
    _provider: FallbackProvider,
    raw_json: &str,
) -> Result<DraftRecommendation, RiotApiParseError> {
    // ponytail: normalized build adapter; REA MCP passive updates can adapt remote schema changes
    serde_json::from_str(raw_json)
        .map_err(|e| RiotApiParseError::InvalidPayload(format!("build parse error: {e}")))
}

/// Parses provider / normalized JSON into a list of `ChampionTierEntry`.
pub fn parse_fallback_tier_list_json(
    _provider: FallbackProvider,
    raw_json: &str,
) -> Result<Vec<ChampionTierEntry>, RiotApiParseError> {
    // ponytail: normalized tier list adapter; REA MCP passive updates can adapt remote schema changes
    serde_json::from_str(raw_json)
        .map_err(|e| RiotApiParseError::InvalidPayload(format!("tier list parse error: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fallback_providers_and_urls() {
        assert_eq!(DEFAULT_FALLBACK_ORDER.len(), 4);
        assert_eq!(FallbackProvider::UGg.label(), "U.GG");
        assert_eq!(FallbackProvider::OpGg.label(), "OP.GG");

        let build_url = FallbackProvider::UGg.build_endpoint_url("14.10", "Ahri", Role::Middle);
        assert!(build_url.contains("u.gg") && build_url.contains("Ahri"));

        let tier_url = FallbackProvider::DpmLol.tier_list_endpoint_url("14.10");
        assert!(tier_url.contains("dpm.lol") && tier_url.contains("tier-list"));
    }

    #[test]
    fn test_fallback_parsers() {
        let sample = baron_core::models::sample_dashboard_data();
        let build_json = serde_json::to_string(&sample.draft).unwrap();
        let draft = parse_fallback_build_json(FallbackProvider::UGg, &build_json).expect("valid draft parse");
        assert_eq!(draft.champion_name, "Ahri");

        let tier_json = serde_json::to_string(&sample.tier_list).unwrap();
        let list = parse_fallback_tier_list_json(FallbackProvider::OpGg, &tier_json).expect("valid tier list parse");
        assert_eq!(list.len(), 8);
        assert_eq!(list[0].champion_name, "Ahri");
    }
}
