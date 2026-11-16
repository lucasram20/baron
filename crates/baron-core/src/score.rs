use crate::models::{ParticipantStats, PerformanceBadge};

/// Calculates the transparent 0.0..=100.0 Baron Score for a participant based on:
/// - KDA (up to 37.5 pts, baseline 25 pts at 6.0 KDA)
/// - Kill Participation (up to 20 pts)
/// - Damage per Gold Efficiency (up to 25.7 pts, baseline 20 pts at 1.4x ratio)
/// - CS/min and Vision/min (up to 12 pts and 13 pts respectively)
/// - Lane phase @14m gold differential (-10 to +10 pts) and match outcome bonus (+5 pts for win)
///
/// The composite score is clamped to the range `0.0..=100.0`.
pub fn calculate_baron_score(stats: &ParticipantStats) -> f64 {
    let kda = (stats.kills as f64 + stats.assists as f64) / (stats.deaths.max(1) as f64);
    let kda_component = (kda / 6.0).clamp(0.0, 1.5) * 25.0;
    let kp_component = stats.kill_participation.clamp(0.0, 1.0) * 20.0;

    // Damage efficiency: team_damage_share relative to team_gold_share
    let efficiency = if stats.team_gold_share > 0.01 {
        (stats.team_damage_share / stats.team_gold_share).clamp(0.4, 1.8)
    } else {
        1.0
    };
    let dmg_component = (efficiency / 1.4) * 20.0;

    let cs_vision_component = ((stats.cs_per_min / 8.5).clamp(0.0, 1.2) * 10.0)
        + ((stats.vision_per_min / 1.8).clamp(0.0, 1.3) * 10.0);

    // Lane phase @14m bonus/penalty (-10.0 to +10.0) plus +5.0 win bonus
    let lane_component = ((stats.gold_diff_14 as f64 / 1500.0).clamp(-1.0, 1.0) * 10.0)
        + if stats.win { 5.0 } else { 0.0 };

    (kda_component + kp_component + dmg_component + cs_vision_component + lane_component)
        .clamp(0.0, 100.0)
}

/// Assigns MVP (highest score on the winning team) and ACE (highest score on the losing team).
/// All other participants receive `PerformanceBadge::None`.
///
/// Returns a vector of `(puuid, rounded_score, badge)` tuples, where scores are rounded to 1 decimal place.
pub fn assign_match_badges(participants: &[ParticipantStats]) -> Vec<(String, f64, PerformanceBadge)> {
    let mut scored: Vec<(String, u16, bool, f64)> = participants
        .iter()
        .map(|p| (p.puuid.clone(), p.team_id, p.win, calculate_baron_score(p)))
        .collect();

    let mvp_puuid = scored
        .iter()
        .filter(|(_, _, win, _)| *win)
        .max_by(|a, b| a.3.partial_cmp(&b.3).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(puuid, _, _, _)| puuid.clone());

    let ace_puuid = scored
        .iter()
        .filter(|(_, _, win, _)| !*win)
        .max_by(|a, b| a.3.partial_cmp(&b.3).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(puuid, _, _, _)| puuid.clone());

    scored
        .drain(..)
        .map(|(puuid, _, _, score)| {
            let badge = if Some(&puuid) == mvp_puuid.as_ref() {
                PerformanceBadge::Mvp
            } else if Some(&puuid) == ace_puuid.as_ref() {
                PerformanceBadge::Ace
            } else {
                PerformanceBadge::None
            };
            (puuid, (score * 10.0).round() / 10.0, badge)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Role;

    fn make_test_player(
        puuid: &str,
        win: bool,
        kills: i32,
        deaths: i32,
        assists: i32,
        gold_diff_14: i32,
        kp: f64,
        dmg_share: f64,
        gold_share: f64,
    ) -> ParticipantStats {
        ParticipantStats {
            puuid: puuid.to_string(),
            game_name: puuid.to_string(),
            tag_line: "NA1".to_string(),
            team_id: if win { 100 } else { 200 },
            champion_id: 103,
            champion_name: "Ahri".to_string(),
            role: Role::Middle,
            win,
            kills,
            deaths,
            assists,
            dpm: 820.0,
            gpm: 450.0,
            cs_per_min: 8.4,
            vision_per_min: 1.6,
            kill_participation: kp,
            team_damage_share: dmg_share,
            team_gold_share: gold_share,
            gold_diff_14,
            xp_diff_14: 400,
            cs_diff_14: 12,
            items: [3157, 3089, 3020, 4645, 3135, 3165, 3363],
        }
    }

    #[test]
    fn test_baron_score_and_mvp_ace_assignment() {
        let p1 = make_test_player("winner_carry", true, 12, 2, 9, 1400, 0.75, 0.32, 0.24);
        let p2 = make_test_player("winner_support", true, 1, 5, 14, -200, 0.50, 0.08, 0.12);
        let p3 = make_test_player("loser_ace", false, 9, 3, 6, 800, 0.70, 0.30, 0.22);
        let p4 = make_test_player("loser_other", false, 2, 8, 3, -1400, 0.30, 0.12, 0.18);

        let badges = assign_match_badges(&[p1, p2, p3, p4]);
        let winner_carry = badges.iter().find(|(id, _, _)| id == "winner_carry").unwrap();
        let winner_support = badges.iter().find(|(id, _, _)| id == "winner_support").unwrap();
        let loser_ace = badges.iter().find(|(id, _, _)| id == "loser_ace").unwrap();
        let loser_other = badges.iter().find(|(id, _, _)| id == "loser_other").unwrap();

        assert_eq!(winner_carry.2, PerformanceBadge::Mvp);
        assert!(winner_carry.1 > 75.0);

        assert_eq!(winner_support.2, PerformanceBadge::None);

        assert_eq!(loser_ace.2, PerformanceBadge::Ace);
        assert_eq!(loser_other.2, PerformanceBadge::None);
    }

    #[test]
    fn test_baron_score_bounds_clamping() {
        // Extreme low performance: 0/20/0, heavy negative stats
        let mut terrible = make_test_player("feeder", false, 0, 20, 0, -5000, 0.0, 0.01, 0.25);
        terrible.cs_per_min = 0.0;
        terrible.vision_per_min = 0.0;
        let score_low = calculate_baron_score(&terrible);
        assert!(score_low >= 0.0, "Score should not be below 0.0, got {score_low}");
        assert!(score_low <= 15.0);

        // Extreme high performance: 40/0/20, massive leads
        let mut godlike = make_test_player("godlike", true, 40, 0, 20, 5000, 1.0, 0.60, 0.30);
        godlike.cs_per_min = 12.0;
        godlike.vision_per_min = 3.5;
        let score_high = calculate_baron_score(&godlike);
        assert!(score_high <= 100.0, "Score should not exceed 100.0, got {score_high}");
        assert_eq!(score_high, 100.0);
    }
}
