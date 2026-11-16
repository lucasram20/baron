use baron_core::models::{ChampionTierEntry, Role};
use serde_json::Value;

use crate::web_api::RiotApiParseError;

fn invalid() -> RiotApiParseError {
    RiotApiParseError::InvalidPayload("unsupported OP.GG MCP tier response".to_string())
}

/// Parse a field-selected single-lane MCP text result. Other formats fail closed.
pub(crate) fn parse_tier_list(raw: &str) -> Result<Vec<ChampionTierEntry>, RiotApiParseError> {
    let response: Value = serde_json::from_str(raw).map_err(|_| invalid())?;
    let result = response.get("result").ok_or_else(invalid)?;
    if result.get("isError").and_then(Value::as_bool) == Some(true) {
        return Err(invalid());
    }
    let content = result
        .get("content")
        .and_then(Value::as_array)
        .filter(|content| content.len() == 1)
        .ok_or_else(invalid)?;
    if content[0].get("type").and_then(Value::as_str) != Some("text") {
        return Err(invalid());
    }
    let text = content[0]
        .get("text")
        .and_then(Value::as_str)
        .ok_or_else(invalid)?;
    let (lane, class, role) = [
        ("top", "Top", Role::Top),
        ("mid", "Mid", Role::Middle),
        ("jungle", "Jungle", Role::Jungle),
        ("adc", "Adc", Role::Bottom),
        ("support", "Support", Role::Utility),
    ]
    .into_iter()
    .find(|(lane, _, _)| text.contains(&format!("class Positions: {lane}\n")))
    .ok_or_else(invalid)?;
    let prefix = format!("class LolListLaneMetaChampions: data\nclass Data: positions\nclass Positions: {lane}\nclass {class}: champion,play,win_rate,pick_rate,ban_rate,tier,rank\n\nLolListLaneMetaChampions(Data(Positions([");
    let rows = text
        .strip_prefix(&prefix)
        .and_then(|text| text.strip_suffix("])))"))
        .ok_or_else(invalid)?;
    if rows.is_empty() {
        return Ok(Vec::new());
    }
    let separator = format!("),{class}(");
    let first_prefix = format!("{class}(");
    rows.split(&separator)
        .enumerate()
        .map(|(index, row)| {
            let row = if index == 0 {
                row.strip_prefix(&first_prefix).ok_or_else(invalid)?
            } else {
                row
            };
            let row = row.strip_suffix(')').unwrap_or(row);
            let (champion, play, win, pick, ban, tier, rank): (
                String,
                u32,
                f64,
                f64,
                f64,
                u32,
                u32,
            ) = serde_json::from_str(&format!("[{row}]")).map_err(|_| invalid())?;
            if champion.is_empty()
                || rank == 0
                || !(1..=5).contains(&tier)
                || ![win, pick, ban]
                    .iter()
                    .all(|rate| (0.0..=1.0).contains(rate))
            {
                return Err(invalid());
            }
            let percent = |rate: f64| (rate * 10_000.0).round() / 100.0;
            Ok(ChampionTierEntry {
                rank,
                champion_name: champion,
                role,
                tier: tier.to_string(),
                win_rate: percent(win),
                pick_rate: percent(pick),
                ban_rate: percent(ban),
                matches_label: play.to_string(),
            })
        })
        .collect()
}
