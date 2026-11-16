use baron_core::models::{MatchSummary, ParticipantStats, Role};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RiotApiParseError {
    #[error("invalid match-v5 payload: {0}")]
    InvalidPayload(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PlatformRegion {
    Na1,
    Euw1,
    Eune1,
    Kr,
    Jp1,
    Sg2,
    Ph2,
    Tw2,
    Th2,
    Vn2,
    Br1,
    La1,
    La2,
    Oc1,
    Tr1,
    Ru,
}
impl PlatformRegion {
    pub fn as_host(&self) -> &'static str {
        match self {
            Self::Na1 => "na1.api.riotgames.com",
            Self::Euw1 => "euw1.api.riotgames.com",
            Self::Eune1 => "eun1.api.riotgames.com",
            Self::Kr => "kr.api.riotgames.com",
            Self::Jp1 => "jp1.api.riotgames.com",
            Self::Sg2 => "sg2.api.riotgames.com",
            Self::Ph2 => "ph2.api.riotgames.com",
            Self::Tw2 => "tw2.api.riotgames.com",
            Self::Th2 => "th2.api.riotgames.com",
            Self::Vn2 => "vn2.api.riotgames.com",
            Self::Br1 => "br1.api.riotgames.com",
            Self::La1 => "la1.api.riotgames.com",
            Self::La2 => "la2.api.riotgames.com",
            Self::Oc1 => "oc1.api.riotgames.com",
            Self::Tr1 => "tr1.api.riotgames.com",
            Self::Ru => "ru.api.riotgames.com",
        }
    }
    pub fn regional_cluster(&self) -> &'static str {
        match self {
            Self::Na1 | Self::Br1 | Self::La1 | Self::La2 => "americas",
            Self::Euw1 | Self::Eune1 | Self::Tr1 | Self::Ru => "europe",
            Self::Kr | Self::Jp1 => "asia",
            _ => "sea",
        }
    }
}

#[derive(Deserialize)]
struct RawMatch {
    metadata: Option<RawMeta>,
    info: RawInfo,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawMeta {
    match_id: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawInfo {
    #[serde(default)]
    game_id: u64,
    game_duration: u32,
    game_version: String,
    #[serde(default)]
    queue_id: i32,
    participants: Vec<RawParticipant>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawParticipant {
    puuid: String,
    #[serde(default)]
    riot_id_game_name: String,
    #[serde(default)]
    riot_id_tagline: String,
    #[serde(default)]
    summoner_name: String,
    team_id: u16,
    champion_id: i32,
    champion_name: String,
    #[serde(default)]
    team_position: String,
    win: bool,
    kills: i32,
    deaths: i32,
    assists: i32,
    #[serde(default)]
    total_damage_dealt_to_champions: i32,
    #[serde(default)]
    gold_earned: i32,
    #[serde(default)]
    total_minions_killed: i32,
    #[serde(default)]
    neutral_minions_killed: i32,
    #[serde(default)]
    vision_score: i32,
    #[serde(default)]
    item0: i32,
    #[serde(default)]
    item1: i32,
    #[serde(default)]
    item2: i32,
    #[serde(default)]
    item3: i32,
    #[serde(default)]
    item4: i32,
    #[serde(default)]
    item5: i32,
    #[serde(default)]
    item6: i32,
    challenges: Option<RawChallenges>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawChallenges {
    damage_per_minute: Option<f64>,
    gold_per_minute: Option<f64>,
    kill_participation: Option<f64>,
    team_damage_percentage: Option<f64>,
}

/// Parses an official Riot Match-V5 JSON payload into `MatchSummary`.
pub fn parse_match_v5_summary(raw_json: &str) -> Result<MatchSummary, RiotApiParseError> {
    // ponytail: pure serde parser; network requests dispatched via higher layer
    let raw: RawMatch = serde_json::from_str(raw_json)
        .map_err(|e| RiotApiParseError::InvalidPayload(format!("json error: {e}")))?;
    if raw.info.participants.is_empty() {
        return Err(RiotApiParseError::InvalidPayload("no participants".into()));
    }
    let (match_id, patch, minutes) = (
        raw.metadata
            .map(|m| m.match_id)
            .unwrap_or_else(|| format!("MATCH-{}", raw.info.game_id)),
        raw.info
            .game_version
            .split('.')
            .take(2)
            .collect::<Vec<_>>()
            .join("."),
        (raw.info.game_duration as f64 / 60.0).max(1.0),
    );
    let queue_label = match raw.info.queue_id {
        420 => "Ranked Solo",
        440 => "Ranked Flex",
        450 => "ARAM",
        400 => "Normal Draft",
        1700 | 1710 => "Arena",
        _ => "Custom",
    }
    .to_string();
    let (mut t_gold, mut t_dmg, mut t_kills) = (HashMap::new(), HashMap::new(), HashMap::new());
    for p in &raw.info.participants {
        *t_gold.entry(p.team_id).or_insert(0.0) += p.gold_earned as f64;
        *t_dmg.entry(p.team_id).or_insert(0.0) += p.total_damage_dealt_to_champions as f64;
        *t_kills.entry(p.team_id).or_insert(0) += p.kills;
    }
    let participants = raw
        .info
        .participants
        .into_iter()
        .map(|p| {
            let (tg, td, tk) = (
                t_gold.get(&p.team_id).copied().unwrap_or(1.0).max(1.0),
                t_dmg.get(&p.team_id).copied().unwrap_or(1.0).max(1.0),
                t_kills.get(&p.team_id).copied().unwrap_or(1).max(1) as f64,
            );
            let c = p.challenges.as_ref();
            let dpm = c
                .and_then(|x| x.damage_per_minute)
                .unwrap_or(p.total_damage_dealt_to_champions as f64 / minutes);
            let gpm = c
                .and_then(|x| x.gold_per_minute)
                .unwrap_or(p.gold_earned as f64 / minutes);
            let kp = c
                .and_then(|x| x.kill_participation)
                .unwrap_or(((p.kills + p.assists) as f64 / tk).clamp(0.0, 1.0));
            let dmg_share = c
                .and_then(|x| x.team_damage_percentage)
                .unwrap_or((p.total_damage_dealt_to_champions as f64 / td).clamp(0.0, 1.0));
            ParticipantStats {
                puuid: p.puuid,
                game_name: if !p.riot_id_game_name.is_empty() {
                    p.riot_id_game_name
                } else {
                    p.summoner_name
                },
                tag_line: p.riot_id_tagline,
                team_id: p.team_id,
                champion_id: p.champion_id,
                champion_name: p.champion_name,
                role: Role::from_riot_str(&p.team_position),
                win: p.win,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                dpm,
                gpm,
                cs_per_min: (p.total_minions_killed + p.neutral_minions_killed) as f64 / minutes,
                vision_per_min: p.vision_score as f64 / minutes,
                kill_participation: kp,
                team_damage_share: dmg_share,
                team_gold_share: (p.gold_earned as f64 / tg).clamp(0.0, 1.0),
                gold_diff_14: 0,
                xp_diff_14: 0,
                cs_diff_14: 0,
                items: [
                    p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6,
                ],
            }
        })
        .collect();
    Ok(MatchSummary {
        match_id,
        queue_label,
        game_duration_secs: raw.info.game_duration,
        played_ago_label: "Recently".into(),
        patch,
        participants,
        timeline_samples: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_region_routing() {
        assert_eq!(PlatformRegion::Na1.as_host(), "na1.api.riotgames.com");
        assert_eq!(PlatformRegion::Na1.regional_cluster(), "americas");
        assert_eq!(PlatformRegion::Kr.as_host(), "kr.api.riotgames.com");
        assert_eq!(PlatformRegion::Kr.regional_cluster(), "asia");
        assert_eq!(PlatformRegion::Euw1.regional_cluster(), "europe");
        assert_eq!(PlatformRegion::Sg2.regional_cluster(), "sea");
    }

    #[test]
    fn test_parse_match_v5_summary() {
        let json = r#"{"metadata":{"matchId":"KR_709823412"},"info":{"gameDuration":1548,"gameVersion":"14.10.589.2341","queueId":420,"participants":[{"puuid":"p-1","riotIdGameName":"Zeus","riotIdTagline":"KR1","teamId":100,"championId":266,"championName":"Aatrox","teamPosition":"TOP","win":true,"kills":5,"deaths":2,"assists":8,"totalDamageDealtToChampions":17540,"goldEarned":10840,"totalMinionsKilled":180,"neutralMinionsKilled":14,"visionScore":28,"item0":3074,"item1":3158,"item2":6333,"item3":3053,"item4":0,"item5":0,"item6":3340}]}}"#;
        let summary = parse_match_v5_summary(json).expect("valid match-v5 parse");
        assert_eq!(summary.match_id, "KR_709823412");
        assert_eq!(summary.queue_label, "Ranked Solo");
        assert_eq!(summary.patch, "14.10");
        assert_eq!(summary.participants.len(), 1);
        let p = &summary.participants[0];
        assert_eq!(p.game_name, "Zeus");
        assert_eq!(p.tag_line, "KR1");
        assert_eq!(p.role, Role::Top);
        assert!(p.win);
        assert_eq!(p.items[0], 3074);
    }

    #[test]
    fn test_parse_match_v5_malformed() {
        assert!(matches!(
            parse_match_v5_summary("not json"),
            Err(RiotApiParseError::InvalidPayload(_))
        ));
        assert!(matches!(
            parse_match_v5_summary(r#"{"info":{"participants":[]}}"#),
            Err(RiotApiParseError::InvalidPayload(_))
        ));
    }
}
