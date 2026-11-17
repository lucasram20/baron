use baron_core::models::{ChampionTierEntry, Role};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::web_api::RiotApiParseError;

pub(crate) mod toon;
#[cfg(test)]
mod transport_tests;

const OPGG_MAX_RESPONSE_BYTES: usize = 1_048_576;

/// Supported League of Legends server region advertised dynamically by OP.GG MCP.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpggRegionOption {
    pub code: String,
    pub label: String,
}

fn mcp_call_raw(url: &str, tool_name: &str, arguments: Value) -> Result<Value, String> {
    use std::io::Read;
    use std::time::Duration;

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
            .take((OPGG_MAX_RESPONSE_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(|e| format!("Cannot read OP.GG response: {e}"))?;
        if bytes.len() > OPGG_MAX_RESPONSE_BYTES {
            return Err("OP.GG response exceeds 1 MiB".to_string());
        }
        serde_json::from_slice(&bytes).map_err(|e| format!("Unsupported OP.GG MCP response: {e}"))
    };
    let initialize = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "desktop-client", "version": "0.1"}
        }
    });
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

    let call = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    });
    read_json(post(&call, session.as_deref(), Some(protocol))?)
}

pub(crate) fn mcp_call_text(
    url: &str,
    tool_name: &str,
    arguments: Value,
) -> Result<String, String> {
    let result = mcp_call_raw(url, tool_name, arguments)?;
    if result["jsonrpc"] != "2.0" || result["id"] != 2 || result.get("error").is_some() {
        return Err("OP.GG MCP tool call failed".to_string());
    }
    Ok(result.to_string())
}

fn region_display_label(code: &str) -> String {
    match code {
        "NA" => "North America (NA)".to_string(),
        "ME" => "Middle East (ME)".to_string(),
        "EUW" => "Europe West (EUW)".to_string(),
        "EUNE" => "Europe Nordic & East (EUNE)".to_string(),
        "OCE" => "Oceania (OCE)".to_string(),
        "KR" => "Korea (KR)".to_string(),
        "JP" => "Japan (JP)".to_string(),
        "BR" => "Brazil (BR)".to_string(),
        "LAS" => "Latin America South (LAS)".to_string(),
        "LAN" => "Latin America North (LAN)".to_string(),
        "RU" => "Russia (RU)".to_string(),
        "TR" => "Türkiye (TR)".to_string(),
        "SEA" => "Southeast Asia (SEA)".to_string(),
        "TW" => "Taiwan (TW)".to_string(),
        "VN" => "Vietnam (VN)".to_string(),
        other => other.to_string(),
    }
}

pub(crate) fn parse_opgg_regions_from_error(message: &str) -> Vec<OpggRegionOption> {
    let inner = serde_json::from_str::<Value>(message)
        .ok()
        .and_then(|v| {
            v["region"]
                .as_array()
                .and_then(|a| a.first())
                .and_then(|s| s.as_str())
                .map(str::to_owned)
        })
        .unwrap_or_else(|| message.to_string());
    let Some((_, tail)) = inner.split_once("values:") else {
        return Vec::new();
    };
    let raw_codes: Vec<String> = tail
        .split(',')
        .map(|s| s.trim().trim_matches(|c| c == '"' || c == ']' || c == '}'))
        .filter(|tok| {
            !tok.is_empty()
                && tok.chars().all(|c| c.is_ascii_uppercase())
                && (2..=4).contains(&tok.len())
        })
        .map(str::to_string)
        .collect();
    let has_sea = raw_codes.iter().any(|c| c == "SEA");
    let mut out = Vec::new();
    for code in raw_codes {
        if has_sea && matches!(code.as_str(), "PH" | "SG" | "TH") {
            continue;
        }
        if !out
            .iter()
            .any(|existing: &OpggRegionOption| existing.code == code)
        {
            out.push(OpggRegionOption {
                label: region_display_label(&code),
                code,
            });
        }
    }
    out
}

pub(crate) fn fetch_supported_regions_from(url: &str) -> Result<Vec<OpggRegionOption>, String> {
    let envelope = mcp_call_raw(
        url,
        "lol_list_champion_leaderboard",
        serde_json::json!({
            "region": "__discover__",
            "champion": "Ahri",
            "client_app": "baron/0.1"
        }),
    )?;
    let msg = envelope["error"]["message"]
        .as_str()
        .ok_or_else(|| "OP.GG MCP did not return supported region metadata".to_string())?;
    let regions = parse_opgg_regions_from_error(msg);
    if regions.is_empty() {
        return Err("Failed to parse OP.GG supported regions from MCP response".to_string());
    }
    Ok(regions)
}

pub(crate) fn call_opgg_tool_json(
    url: &str,
    tool_name: &str,
    arguments: Value,
) -> Result<Value, String> {
    let raw = mcp_call_text(url, tool_name, arguments)?;
    let envelope: Value =
        serde_json::from_str(&raw).map_err(|e| format!("Invalid MCP envelope: {e}"))?;
    let result = envelope
        .get("result")
        .ok_or_else(|| "Missing MCP result field".to_string())?;
    if result.get("isError").and_then(Value::as_bool) == Some(true) {
        let msg = result
            .get("content")
            .and_then(Value::as_array)
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("text"))
            .and_then(Value::as_str)
            .unwrap_or("OP.GG MCP returned tool error");
        return Err(msg.to_string());
    }
    let text = result
        .get("content")
        .and_then(Value::as_array)
        .and_then(|arr| arr.first())
        .filter(|item| item.get("type").and_then(Value::as_str) == Some("text"))
        .and_then(|item| item.get("text"))
        .and_then(Value::as_str)
        .ok_or_else(|| "Missing text content in OP.GG MCP result".to_string())?;

    toon::parse_toon_or_json(text)
}

pub(crate) fn fetch_tier_list_from(
    url: &str,
    role: Role,
) -> Result<Vec<ChampionTierEntry>, String> {
    let lane = match role {
        Role::Top => "top",
        Role::Jungle => "jungle",
        Role::Middle => "mid",
        Role::Bottom => "adc",
        Role::Utility => "support",
        Role::Unknown => return Err("A valid lane is required".to_string()),
    };
    let fields =
        format!("data.positions.{lane}[].{{champion,play,win_rate,pick_rate,ban_rate,tier,rank}}");
    let raw = mcp_call_text(
        url,
        "lol_list_lane_meta_champions",
        serde_json::json!({
            "position": lane,
            "desired_output_fields": [fields],
            "client_app": "desktop-client/0.1"
        }),
    )?;
    let rows = parse_tier_list(&raw).map_err(|e| e.to_string())?;
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

#[cfg(test)]
mod region_tests {
    use super::parse_opgg_regions_from_error;

    #[test]
    fn parses_opgg_supported_regions_from_mcp_validation() {
        let msg = r#"{"region":["The region must be one of the following values: KR, BR, EUNE, EUW, LAN, LAS, NA, OCE, RU, TR, JP, PH, SG, TH, TW, VN, ME, SEA, kr, br, eune"]}"#;
        let parsed = parse_opgg_regions_from_error(msg);
        let codes: Vec<&str> = parsed.iter().map(|r| r.code.as_str()).collect();
        assert_eq!(
            codes,
            vec![
                "KR", "BR", "EUNE", "EUW", "LAN", "LAS", "NA", "OCE", "RU", "TR", "JP", "TW", "VN",
                "ME", "SEA"
            ]
        );
        assert_eq!(parsed[0].label, "Korea (KR)");
        assert_eq!(parsed[14].label, "Southeast Asia (SEA)");
    }
}
