use baron_core::sample_dashboard_data;
use baron_riot::{parse_fallback_tier_list_json, FallbackProvider};

#[test]
fn providers_reject_baron_sample_rows_as_provider_responses() {
    let rows = sample_dashboard_data().tier_list;
    let sample_json = serde_json::to_string(&rows).expect("serialize sample rows");

    for provider in [
        FallbackProvider::OpGg,
        FallbackProvider::UGg,
        FallbackProvider::DpmLol,
        FallbackProvider::Lolalytics,
        FallbackProvider::MetaSrc,
        FallbackProvider::MerakiCdn,
    ] {
        assert!(
            parse_fallback_tier_list_json(provider, &sample_json).is_err(),
            "Baron sample rows must not be accepted as a {provider:?} response"
        );
    }
}

#[test]
fn opgg_parses_observed_mcp_mid_lane_result() {
    // Reduced from the public lol_list_lane_meta_champions MCP response.
    let response = r#"{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"class LolListLaneMetaChampions: data\nclass Data: positions\nclass Positions: mid\nclass Mid: champion,play,win_rate,pick_rate,ban_rate,tier,rank\n\nLolListLaneMetaChampions(Data(Positions([Mid(\"Ahri\",264030,0.51,0.11,0.04,1,1)])))"}]}}"#;
    let rows = parse_fallback_tier_list_json(FallbackProvider::OpGg, response)
        .expect("observed OP.GG MCP mid response should parse");
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].champion_name, "Ahri");
    assert_eq!(rows[0].role, baron_core::models::Role::Middle);
    assert_eq!(rows[0].matches_label, "264030");
}

#[test]
fn opgg_rejects_malformed_mcp_results() {
    for response in [
        r#"{"jsonrpc":"2.0","id":2,"error":{"code":-32603,"message":"failed"}}"#,
        r#"{"jsonrpc":"2.0","id":2,"result":{"isError":true,"content":[{"type":"text","text":"error"}]}}"#,
        r#"{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"not a tier list"}]}}"#,
    ] {
        assert!(parse_fallback_tier_list_json(FallbackProvider::OpGg, response).is_err());
    }
}

#[test]
fn opgg_parses_observed_mcp_top_lane_result() {
    // Reduced from the public lol_list_lane_meta_champions MCP response.
    let response = r#"{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"class LolListLaneMetaChampions: data\nclass Data: positions\nclass Positions: top\nclass Top: champion,play,win_rate,pick_rate,ban_rate,tier,rank\n\nLolListLaneMetaChampions(Data(Positions([Top(\"Malphite\",155642,0.52,0.07,0.18,1,1)])))"}]}}"#;
    let rows = parse_fallback_tier_list_json(FallbackProvider::OpGg, response)
        .expect("observed OP.GG MCP response should parse");
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].champion_name, "Malphite");
    assert_eq!(rows[0].role, baron_core::models::Role::Top);
    assert_eq!(rows[0].rank, 1);
    assert_eq!(rows[0].tier, "1");
    assert_eq!(rows[0].win_rate, 52.0);
    assert_eq!(rows[0].pick_rate, 7.0);
    assert_eq!(rows[0].ban_rate, 18.0);
    assert_eq!(rows[0].matches_label, "155642");
}
