use crate::web_api::RiotApiParseError;
use baron_core::models::{ChampionTierEntry, DraftRecommendation, Role};
use serde::{Deserialize, Serialize};

/// Third-party / community data providers used as fallback mirrors.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FallbackProvider {
    Lolalytics,
    UGg,
    OpGg,
    DpmLol,
    MetaSrc,
    MerakiCdn,
}

fn role_slug(role: Role) -> &'static str {
    match role {
        Role::Top => "top",
        Role::Jungle => "jungle",
        Role::Middle => "middle",
        Role::Bottom => "bottom",
        Role::Utility => "support",
        Role::Unknown => "middle",
    }
}

impl FallbackProvider {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Lolalytics => "LoLalytics",
            Self::UGg => "U.GG",
            Self::OpGg => "OP.GG",
            Self::DpmLol => "DPM.LOL",
            Self::MetaSrc => "MetaSRC",
            Self::MerakiCdn => "Meraki CDN",
        }
    }

    pub fn build_endpoint_url(&self, patch: &str, champion_key: &str, role: Role) -> String {
        let champ = champion_key.to_ascii_lowercase();
        let lane = role_slug(role);
        match self {
            Self::Lolalytics => format!(
                "https://a1.lolalytics.com/mega/?ep=champion&v=1&patch={patch}&c={champ}&lane={lane}&tier=emerald_plus&queue=420&region=all"
            ),
            Self::UGg => format!(
                "https://stats2.u.gg/lol/1.5/overview/{patch}/ranked_solo_5x5/{champion_key}/1.5.0.json"
            ),
            Self::OpGg => format!(
                "https://op.gg/api/v1.0/internal/bypass/champions/{champion_key}/build?patch={patch}"
            ),
            Self::DpmLol => format!(
                "https://dpm.lol/api/v1/champions/{champion_key}/build?patch={patch}"
            ),
            Self::MetaSrc => format!("https://www.metasrc.com/lol/{patch}/build/{champ}/{lane}"),
            Self::MerakiCdn => format!(
                "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/{champion_key}.json"
            ),
        }
    }

    pub fn tier_list_endpoint_url(&self, patch: &str) -> String {
        match self {
            Self::Lolalytics => format!(
                "https://a1.lolalytics.com/mega/?ep=tier&v=1&patch={patch}&tier=emerald_plus&queue=420&region=all"
            ),
            Self::UGg => {
                format!("https://stats2.u.gg/lol/1.5/tier_list/{patch}/ranked_solo_5x5.json")
            }
            Self::OpGg => {
                format!("https://op.gg/api/v1.0/internal/bypass/champions/tier-list?patch={patch}")
            }
            Self::DpmLol => format!("https://dpm.lol/api/v1/tier-list?patch={patch}"),
            Self::MetaSrc => format!("https://www.metasrc.com/lol/{patch}/tier-list"),
            Self::MerakiCdn => {
                "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json"
                    .to_string()
            }
        }
    }
}

pub const DEFAULT_FALLBACK_ORDER: [FallbackProvider; 6] = [
    FallbackProvider::Lolalytics,
    FallbackProvider::MerakiCdn,
    FallbackProvider::UGg,
    FallbackProvider::OpGg,
    FallbackProvider::DpmLol,
    FallbackProvider::MetaSrc,
];

/// Extracts embedded Qwik SSR JSON payload (`<script type="qwik/json">...</script>`) from LoLalytics HTML.
pub fn extract_lolalytics_qwik_json(html: &str) -> Option<&str> {
    let marker = "<script type=\"qwik/json\">";
    let start = html.find(marker)? + marker.len();
    let end = html[start..].find("</script>")? + start;
    Some(html[start..end].trim())
}

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
        assert_eq!(DEFAULT_FALLBACK_ORDER.len(), 6);
        assert_eq!(DEFAULT_FALLBACK_ORDER[0], FallbackProvider::Lolalytics);
        assert_eq!(FallbackProvider::Lolalytics.label(), "LoLalytics");
        assert_eq!(FallbackProvider::MetaSrc.label(), "MetaSRC");
        assert_eq!(FallbackProvider::UGg.label(), "U.GG");
        assert_eq!(FallbackProvider::OpGg.label(), "OP.GG");

        let lola_url =
            FallbackProvider::Lolalytics.build_endpoint_url("16.22", "Ahri", Role::Middle);
        assert!(lola_url.contains("a1.lolalytics.com") && lola_url.contains("c=ahri"));

        let meta_url = FallbackProvider::MetaSrc.build_endpoint_url("16.22", "Ahri", Role::Utility);
        assert!(meta_url.contains("metasrc.com") && meta_url.ends_with("/ahri/support"));

        let build_url = FallbackProvider::UGg.build_endpoint_url("14.10", "Ahri", Role::Middle);
        assert!(build_url.contains("u.gg") && build_url.contains("Ahri"));

        let tier_url = FallbackProvider::DpmLol.tier_list_endpoint_url("14.10");
        assert!(tier_url.contains("dpm.lol") && tier_url.contains("tier-list"));
    }

    #[test]
    fn test_extract_lolalytics_qwik_json_and_parsers() {
        let html = r#"<html><script type="qwik/json">{"patch":"16.22"}</script></html>"#;
        assert_eq!(
            extract_lolalytics_qwik_json(html),
            Some(r#"{"patch":"16.22"}"#)
        );
        assert_eq!(extract_lolalytics_qwik_json("<html></html>"), None);

        let sample = baron_core::models::sample_dashboard_data();
        let build_json = serde_json::to_string(&sample.draft).unwrap();
        let draft = parse_fallback_build_json(FallbackProvider::Lolalytics, &build_json)
            .expect("valid draft parse");
        assert_eq!(draft.champion_name, "Ahri");

        let tier_json = serde_json::to_string(&sample.tier_list).unwrap();
        let list = parse_fallback_tier_list_json(FallbackProvider::MetaSrc, &tier_json)
            .expect("valid tier list parse");
        assert_eq!(list.len(), 8);
        assert_eq!(list[0].champion_name, "Ahri");
    }
}
