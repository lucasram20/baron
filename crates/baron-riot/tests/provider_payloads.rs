use baron_core::models::{ChampionTierEntry, Role};
use baron_riot::{parse_fallback_build_json, parse_fallback_tier_list_json, FallbackProvider};

#[test]
#[ignore = "opt-in live request to the public OP.GG MCP server"]
fn live_opgg_tier_list() {
    let rows =
        baron_riot::fetch_opgg_tier_list(Role::Top).expect("live OP.GG MCP request should succeed");
    assert!(!rows.is_empty(), "OP.GG returned no top lane data");
    assert!(rows.iter().all(|row| row.role == Role::Top));
}

#[test]
fn providers_reject_baron_sample_rows_as_provider_responses() {
    let rows = vec![ChampionTierEntry {
        rank: 1,
        champion_name: "Ahri".to_string(),
        role: Role::Middle,
        tier: "1".to_string(),
        win_rate: 51.5,
        pick_rate: 11.2,
        ban_rate: 4.0,
        matches_label: "250000".to_string(),
    }];
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
fn providers_reject_sample_builds() {
    let fake_build = serde_json::json!({
        "champion_name": "Ashe",
        "win_rate": 51.0,
        "pick_rate": 12.0,
        "core_items": ["Kraken Slayer"]
    });
    let sample = serde_json::to_string(&fake_build).unwrap();
    for provider in [
        FallbackProvider::OpGg,
        FallbackProvider::UGg,
        FallbackProvider::DpmLol,
        FallbackProvider::Lolalytics,
        FallbackProvider::MetaSrc,
        FallbackProvider::MerakiCdn,
    ] {
        assert!(parse_fallback_build_json(provider, &sample).is_err());
    }
}

#[test]
fn opgg_tier_transport_uses_documented_mcp_endpoint() {
    assert_eq!(
        FallbackProvider::OpGg.tier_list_endpoint_url("16.22"),
        "https://mcp-api.op.gg/mcp"
    );
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

#[test]
fn ugg_and_lolalytics_parse_observed_tier_payloads() {
    let ugg_sample = r#"[{"top":[["54",[[36,205,342]],6596,12685,264735081,133096076,54013,95428,60535,2249368]]},{"54":33000},"2026-11-19T08:32:17Z",187463]"#;
    let ugg_rows = parse_fallback_tier_list_json(FallbackProvider::UGg, ugg_sample)
        .expect("observed U.GG champion_ranking payload should parse");
    assert_eq!(ugg_rows.len(), 1);
    assert_eq!(ugg_rows[0].role, baron_core::models::Role::Top);
    assert_eq!(ugg_rows[0].matches_label, "12685");

    let lola_sample = r#"{"queue":420,"avgWr":51.27,"analysed":2217980,"tier":{"1":{"lane":{"top":{"cid":{"54":{"rank":1,"wr":53.14,"pr":6.75,"br":17.8,"games":14928}}}}}},"response":{"valid":true}}"#;
    let lola_rows = parse_fallback_tier_list_json(FallbackProvider::Lolalytics, lola_sample)
        .expect("observed LoLalytics mega tier payload should parse");
    assert_eq!(lola_rows.len(), 1);
    assert_eq!(lola_rows[0].tier, "S+");
    assert_eq!(lola_rows[0].matches_label, "14928");
}
