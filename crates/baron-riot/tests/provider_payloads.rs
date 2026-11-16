use baron_core::sample_dashboard_data;
use baron_riot::{parse_fallback_tier_list_json, FallbackProvider};

#[test]
fn opgg_rejects_baron_sample_rows_as_a_provider_response() {
    let rows = sample_dashboard_data().tier_list;
    let sample_json = serde_json::to_string(&rows).expect("serialize sample rows");

    assert!(
        parse_fallback_tier_list_json(FallbackProvider::OpGg, &sample_json).is_err(),
        "Baron sample rows must not be accepted as an OP.GG response"
    );
}
