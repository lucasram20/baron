use baron_core::models::{ChampionTierEntry, Role};
use serde_json::Value;

use crate::web_api::RiotApiParseError;

#[cfg(test)]
mod transport_tests;

pub(crate) fn fetch_tier_list_from(
    url: &str,
    role: Role,
) -> Result<Vec<ChampionTierEntry>, String> {
    use std::io::Read;
    use std::time::Duration;

    let lane = match role {
        Role::Top => "top",
        Role::Jungle => "jungle",
        Role::Middle => "mid",
        Role::Bottom => "adc",
        Role::Utility => "support",
        Role::Unknown => return Err("A valid lane is required".to_string()),
    };
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(45))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| format!("Cannot create HTTP client: {e}"))?;
    let post = |body: &Value, session: Option<&str>, protocol: Option<&str>| {
        let mut request = client
            .post(url)
            .header("Accept", "application/json, text/event-stream");
        if let Some(session) = session {
            request = request.header("Mcp-Session-Id", session);
        }
        if let Some(protocol) = protocol {
            request = request.header("MCP-Protocol-Version", protocol);
        }
        request
            .json(body)
            .send()
            .and_then(reqwest::blocking::Response::error_for_status)
            .map_err(|e| format!("OP.GG MCP request failed: {e}"))
    };
    let read_json = |response: reqwest::blocking::Response| -> Result<Value, String> {
        let mut bytes = Vec::new();
        response
            .take(1_048_577)
            .read_to_end(&mut bytes)
            .map_err(|e| format!("Cannot read OP.GG response: {e}"))?;
        if bytes.len() > 1_048_576 {
            return Err("OP.GG response exceeds 1 MiB".to_string());
        }
        serde_json::from_slice(&bytes).map_err(|e| format!("Unsupported OP.GG MCP response: {e}"))
    };
    let initialize = serde_json::json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"desktop-client","version":"0.1"}}});
    let response = post(&initialize, None, None)?;
    let session = response
        .headers()
        .get("Mcp-Session-Id")
        .map(|v| v.to_str().map(str::to_owned))
        .transpose()
        .map_err(|_| "Invalid MCP session header".to_string())?;
    let init = read_json(response)?;
    if init["jsonrpc"] != "2.0" || init["id"] != 1 || init.get("error").is_some() {
        return Err("OP.GG MCP initialization failed".to_string());
    }
    let protocol = init["result"]["protocolVersion"]
        .as_str()
        .filter(|v| *v == "2025-06-18")
        .ok_or_else(|| "Unsupported MCP protocol version".to_string())?;
    post(
        &serde_json::json!({"jsonrpc":"2.0","method":"notifications/initialized"}),
        session.as_deref(),
        Some(protocol),
    )?;
    let fields =
        format!("data.positions.{lane}[].{{champion,play,win_rate,pick_rate,ban_rate,tier,rank}}");
    let call = serde_json::json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"lol_list_lane_meta_champions","arguments":{"position":lane,"desired_output_fields":[fields],"client_app":"desktop-client/0.1"}}});
    let result = read_json(post(&call, session.as_deref(), Some(protocol))?)?;
    if result["jsonrpc"] != "2.0" || result["id"] != 2 || result.get("error").is_some() {
        return Err("OP.GG MCP tool call failed".to_string());
    }
    let rows = parse_tier_list(&result.to_string()).map_err(|e| e.to_string())?;
    if rows.iter().any(|row| row.role != role) {
        return Err("OP.GG returned a different lane".to_string());
    }
    Ok(rows)
}

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
