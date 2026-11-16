use crate::lockfile::LcuError;
use serde::{Deserialize, Serialize};

/// Canonical local Live Client Data URL during an active match.
pub const LIVE_CLIENT_ALLGAMEDATA_URL: &str = "https://127.0.0.1:2999/liveclientdata/allgamedata";

/// Real-time match event reported by Live Client Data API.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiveGameEvent {
    pub event_id: i64,
    pub event_name: String,
    pub event_time_secs: f64,
    pub killer_name: Option<String>,
}

/// Snapshot of the active live game state.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LiveGameStateSnapshot {
    pub game_time_secs: f64,
    pub active_player_gold: f64,
    pub active_player_level: u8,
    pub events: Vec<LiveGameEvent>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawAllGameData {
    active_player: Option<RawActivePlayer>,
    events: Option<RawEventsWrapper>,
    game_data: Option<RawGameData>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawActivePlayer {
    #[serde(default)]
    current_gold: f64,
    #[serde(default)]
    level: u8,
}

#[derive(Deserialize)]
struct RawEventsWrapper {
    #[serde(rename = "Events", default)]
    events: Vec<RawEventItem>,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct RawEventItem {
    #[serde(rename = "EventID", default)]
    event_id: i64,
    #[serde(default)]
    event_name: String,
    #[serde(default)]
    event_time: f64,
    killer_name: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawGameData {
    #[serde(default)]
    game_time: f64,
}

/// Parses the consolidated `/liveclientdata/allgamedata` JSON payload.
pub fn parse_live_client_allgamedata(raw_json: &str) -> Result<LiveGameStateSnapshot, LcuError> {
    // ponytail: extracts core snapshot; extended combat stats parsed as needed
    let raw: RawAllGameData = serde_json::from_str(raw_json)
        .map_err(|e| LcuError::InvalidLivePayload(format!("invalid allgamedata JSON: {e}")))?;

    let active_player = raw.active_player.unwrap_or(RawActivePlayer {
        current_gold: 0.0,
        level: 0,
    });
    let game_data = raw.game_data.unwrap_or(RawGameData { game_time: 0.0 });
    let events = raw.events.map(|w| w.events).unwrap_or_default();

    let mapped_events = events
        .into_iter()
        .map(|e| LiveGameEvent {
            event_id: e.event_id,
            event_name: e.event_name,
            event_time_secs: e.event_time,
            killer_name: e.killer_name,
        })
        .collect();

    Ok(LiveGameStateSnapshot {
        game_time_secs: game_data.game_time,
        active_player_gold: active_player.current_gold,
        active_player_level: active_player.level,
        events: mapped_events,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_live_client_allgamedata() {
        let payload = r#"{
            "activePlayer": { "currentGold": 1420.5, "level": 9 },
            "gameData": { "gameTime": 684.2 },
            "events": {
                "Events": [
                    { "EventID": 1, "EventName": "GameStart", "EventTime": 0.0 },
                    { "EventID": 2, "EventName": "ChampionKill", "EventTime": 182.5, "KillerName": "Hide on bush" }
                ]
            }
        }"#;

        let snap = parse_live_client_allgamedata(payload).expect("successful parse");
        assert_eq!(snap.game_time_secs, 684.2);
        assert_eq!(snap.active_player_gold, 1420.5);
        assert_eq!(snap.active_player_level, 9);
        assert_eq!(snap.events.len(), 2);
        assert_eq!(snap.events[1].event_name, "ChampionKill");
        assert_eq!(snap.events[1].killer_name.as_deref(), Some("Hide on bush"));
    }

    #[test]
    fn test_parse_live_client_invalid() {
        assert!(parse_live_client_allgamedata("{not json}").is_err());
    }
}
