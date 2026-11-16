use crate::web_api::RiotApiParseError;
use baron_core::models::{ChampionTierEntry, DraftRecommendation, Role};
use serde::{Deserialize, Serialize};

/// Third-party / community data providers used for live builds, tier lists, and patch metadata.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FallbackProvider {
    OpGg,
    UGg,
    DpmLol,
    Lolalytics,
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

fn opgg_position(role: Role) -> &'static str {
    match role {
        Role::Top => "TOP",
        Role::Jungle => "JUNGLE",
        Role::Middle => "MID",
        Role::Bottom => "ADC",
        Role::Utility => "SUPPORT",
        Role::Unknown => "MID",
    }
}

/// OP.GG direct JSON versions endpoint (`{"data":["16.22","16.21"]}`).
pub fn opgg_versions_endpoint_url() -> &'static str {
    "https://lol-api-champion.op.gg/api/global/champions/ranked/versions"
}

impl FallbackProvider {
    pub fn label(&self) -> &'static str {
        match self {
            Self::OpGg => "OP.GG",
            Self::UGg => "U.GG",
            Self::DpmLol => "DPM.LOL",
            Self::Lolalytics => "LoLalytics",
            Self::MetaSrc => "MetaSRC",
            Self::MerakiCdn => "Meraki CDN",
        }
    }

    pub fn build_endpoint_url(&self, patch: &str, champion_key: &str, role: Role) -> String {
        let champ = champion_key.to_ascii_lowercase();
        let lane = role_slug(role);
        let pos = opgg_position(role);
        match self {
            Self::OpGg => format!(
                "https://lol-api-champion.op.gg/api/global/champions/ranked/{champion_key}/{pos}?tier=emerald_plus&version={patch}"
            ),
            Self::UGg => format!(
                "https://stats2.u.gg/lol/1.5/overview/{patch}/ranked_solo_5x5/{champion_key}/1.5.0.json"
            ),
            Self::DpmLol => format!(
                "https://dpm.lol/api/v1/champions/{champion_key}/build?patch={patch}"
            ),
            Self::Lolalytics => format!(
                "https://a1.lolalytics.com/mega/?ep=champion&v=1&patch={patch}&c={champ}&lane={lane}&tier=emerald_plus&queue=420&region=all"
            ),
            Self::MetaSrc => format!("https://www.metasrc.com/lol/{patch}/build/{champ}/{lane}"),
            Self::MerakiCdn => format!(
                "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/{champion_key}.json"
            ),
        }
    }

    pub fn tier_list_endpoint_url(&self, patch: &str) -> String {
        match self {
            Self::OpGg => format!(
                "https://lol-api-champion.op.gg/api/global/champions/ranked?tier=emerald_plus&version={patch}"
            ),
            Self::UGg => {
                format!("https://stats2.u.gg/lol/1.5/tier_list/{patch}/ranked_solo_5x5.json")
            }
            Self::DpmLol => format!("https://dpm.lol/api/v1/tier-list?patch={patch}"),
            Self::Lolalytics => format!(
                "https://a1.lolalytics.com/mega/?ep=tier&v=1&patch={patch}&tier=emerald_plus&queue=420&region=all"
            ),
            Self::MetaSrc => format!("https://www.metasrc.com/lol/{patch}/tier-list"),
            Self::MerakiCdn => {
                "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json"
                    .to_string()
            }
        }
    }
}

/// Ordered API provider registry: OP.GG (#1 primary complete JSON API) -> U.GG (#2) -> DPM.LOL -> LoLalytics -> MetaSRC -> Meraki CDN.
pub const DEFAULT_FALLBACK_ORDER: [FallbackProvider; 6] = [
    FallbackProvider::OpGg,
    FallbackProvider::UGg,
    FallbackProvider::DpmLol,
    FallbackProvider::Lolalytics,
    FallbackProvider::MetaSrc,
    FallbackProvider::MerakiCdn,
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
    provider: FallbackProvider,
    raw_json: &str,
) -> Result<Vec<ChampionTierEntry>, RiotApiParseError> {
    if provider == FallbackProvider::OpGg {
        return crate::providers::opgg::parse_tier_list(raw_json);
    }
    Err(RiotApiParseError::InvalidPayload(format!(
        "{} tier list response is not supported",
        provider.label()
    )))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fallback_providers_and_urls() {
        assert_eq!(DEFAULT_FALLBACK_ORDER.len(), 6);
        assert_eq!(DEFAULT_FALLBACK_ORDER[0], FallbackProvider::OpGg);
        assert_eq!(DEFAULT_FALLBACK_ORDER[1], FallbackProvider::UGg);
        assert_eq!(FallbackProvider::OpGg.label(), "OP.GG");
        assert_eq!(FallbackProvider::UGg.label(), "U.GG");
        assert_eq!(FallbackProvider::Lolalytics.label(), "LoLalytics");
        assert_eq!(FallbackProvider::MetaSrc.label(), "MetaSRC");
        assert!(opgg_versions_endpoint_url().contains("lol-api-champion.op.gg"));

        let opgg_build = FallbackProvider::OpGg.build_endpoint_url("16.22", "103", Role::Middle);
        assert!(
            opgg_build.contains("lol-api-champion.op.gg")
                && opgg_build.contains("/103/MID")
                && opgg_build.contains("version=16.22")
        );

        let lola_url =
            FallbackProvider::Lolalytics.build_endpoint_url("16.22", "Ahri", Role::Middle);
        assert!(lola_url.contains("a1.lolalytics.com") && lola_url.contains("c=ahri"));

        let meta_url = FallbackProvider::MetaSrc.build_endpoint_url("16.22", "Ahri", Role::Utility);
        assert!(meta_url.contains("metasrc.com") && meta_url.ends_with("/ahri/support"));

        let build_url = FallbackProvider::UGg.build_endpoint_url("16.22", "Ahri", Role::Middle);
        assert!(build_url.contains("u.gg") && build_url.contains("Ahri"));

        let tier_url = FallbackProvider::DpmLol.tier_list_endpoint_url("16.22");
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
        let draft = parse_fallback_build_json(FallbackProvider::OpGg, &build_json)
            .expect("valid draft parse");
        assert_eq!(draft.champion_name, "Ahri");

        let tier_json = serde_json::to_string(&sample.tier_list).unwrap();
        assert!(parse_fallback_tier_list_json(FallbackProvider::UGg, &tier_json).is_err());
    }
}
