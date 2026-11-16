use std::collections::BTreeMap;

use crate::models::{CombatRadarMetrics, LaneDiffAt14, ParticipantStats, Role, TimelineFrameSample};

/// Computes the exact Gold, XP, and CS differential at a target minute (e.g. minute 14)
/// between a participant and their direct enemy lane counterpart.
///
/// Returns `None` if the role is `Role::Unknown` or if either the player or opponent is not found
/// in the provided timeline frame samples at `target_minute`.
pub fn compute_lane_diff_at_minute(
    samples: &[TimelineFrameSample],
    target_minute: u32,
    team_id: u16,
    role: Role,
) -> Option<LaneDiffAt14> {
    if role == Role::Unknown {
        return None;
    }

    let player = samples
        .iter()
        .find(|s| s.minute == target_minute && s.team_id == team_id && s.role == role)?;
    let opponent = samples
        .iter()
        .find(|s| s.minute == target_minute && s.team_id != team_id && s.role == role)?;

    Some(LaneDiffAt14 {
        gold_diff: player.total_gold - opponent.total_gold,
        xp_diff: player.xp - opponent.xp,
        cs_diff: player.cs - opponent.cs,
    })
}

/// Normalizes a player's 6 core combat metrics into 0.0..=100.0 radar axes:
/// - `dpm_norm`: DPM normalized to a 1000.0 DPM benchmark
/// - `gpm_norm`: GPM normalized to a 500.0 GPM benchmark
/// - `cs_norm`: CS/min normalized to a 10.0 CS/min benchmark
/// - `kp_norm`: Kill participation ratio scaled to percentage (0.0..=100.0)
/// - `vision_norm`: Vision score per minute normalized to a 2.5 benchmark
/// - `dmg_per_gold_norm`: Damage share / gold share ratio normalized to a 1.5 benchmark
pub fn compute_combat_radar(stats: &ParticipantStats) -> CombatRadarMetrics {
    let dmg_per_gold = if stats.team_gold_share > 0.01 {
        stats.team_damage_share / stats.team_gold_share
    } else {
        1.0
    };

    CombatRadarMetrics {
        dpm_norm: ((stats.dpm / 1000.0) * 100.0).clamp(0.0, 100.0),
        gpm_norm: ((stats.gpm / 500.0) * 100.0).clamp(0.0, 100.0),
        cs_norm: ((stats.cs_per_min / 10.0) * 100.0).clamp(0.0, 100.0),
        kp_norm: (stats.kill_participation * 100.0).clamp(0.0, 100.0),
        vision_norm: ((stats.vision_per_min / 2.5) * 100.0).clamp(0.0, 100.0),
        dmg_per_gold_norm: ((dmg_per_gold / 1.5) * 100.0).clamp(0.0, 100.0),
    }
}

/// Computes the team gold differential curve over time across all minutes present in `samples`.
/// Returns sorted `(minute, my_team_gold - enemy_team_gold)` pairs.
pub fn compute_team_gold_curve(
    samples: &[TimelineFrameSample],
    my_team_id: u16,
) -> Vec<(u32, i32)> {
    let mut by_minute: BTreeMap<u32, (i32, i32)> = BTreeMap::new();

    for sample in samples {
        let entry = by_minute.entry(sample.minute).or_insert((0, 0));
        if sample.team_id == my_team_id {
            entry.0 += sample.total_gold;
        } else {
            entry.1 += sample.total_gold;
        }
    }

    by_minute
        .into_iter()
        .map(|(minute, (my_gold, enemy_gold))| (minute, my_gold - enemy_gold))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_lane_diff_at_14() {
        let samples = vec![
            TimelineFrameSample {
                minute: 14,
                participant_id: 3,
                team_id: 100,
                role: Role::Middle,
                total_gold: 5420,
                xp: 6100,
                cs: 128,
            },
            TimelineFrameSample {
                minute: 14,
                participant_id: 8,
                team_id: 200,
                role: Role::Middle,
                total_gold: 4600,
                xp: 5650,
                cs: 112,
            },
        ];

        let diff = compute_lane_diff_at_minute(&samples, 14, 100, Role::Middle).unwrap();
        assert_eq!(diff.gold_diff, 820);
        assert_eq!(diff.xp_diff, 450);
        assert_eq!(diff.cs_diff, 16);
    }

    #[test]
    fn test_compute_lane_diff_unknown_role_returns_none() {
        let samples = vec![
            TimelineFrameSample {
                minute: 14,
                participant_id: 1,
                team_id: 100,
                role: Role::Unknown,
                total_gold: 5000,
                xp: 5000,
                cs: 100,
            },
            TimelineFrameSample {
                minute: 14,
                participant_id: 6,
                team_id: 200,
                role: Role::Unknown,
                total_gold: 5000,
                xp: 5000,
                cs: 100,
            },
        ];

        let diff = compute_lane_diff_at_minute(&samples, 14, 100, Role::Unknown);
        assert_eq!(diff, None);
    }

    #[test]
    fn test_compute_combat_radar_normalization() {
        let stats = ParticipantStats {
            puuid: "radar-test".to_string(),
            game_name: "Faker".to_string(),
            tag_line: "KR1".to_string(),
            team_id: 100,
            champion_id: 103,
            champion_name: "Ahri".to_string(),
            role: Role::Middle,
            win: true,
            kills: 10,
            deaths: 2,
            assists: 8,
            dpm: 800.0,               // 80.0
            gpm: 450.0,               // 90.0
            cs_per_min: 8.5,          // 85.0
            vision_per_min: 2.0,      // 80.0
            kill_participation: 0.70, // 70.0
            team_damage_share: 0.30,
            team_gold_share: 0.20,    // ratio = 1.5 -> (1.5 / 1.5) * 100 = 100.0
            gold_diff_14: 1000,
            xp_diff_14: 500,
            cs_diff_14: 20,
            items: [0; 7],
        };

        let radar = compute_combat_radar(&stats);
        assert!((radar.dpm_norm - 80.0).abs() < 1e-4);
        assert!((radar.gpm_norm - 90.0).abs() < 1e-4);
        assert!((radar.cs_norm - 85.0).abs() < 1e-4);
        assert!((radar.vision_norm - 80.0).abs() < 1e-4);
        assert!((radar.kp_norm - 70.0).abs() < 1e-4);
        assert!((radar.dmg_per_gold_norm - 100.0).abs() < 1e-4);
    }

    #[test]
    fn test_compute_team_gold_curve() {
        let samples = vec![
            TimelineFrameSample {
                minute: 0,
                participant_id: 1,
                team_id: 100,
                role: Role::Top,
                total_gold: 500,
                xp: 0,
                cs: 0,
            },
            TimelineFrameSample {
                minute: 0,
                participant_id: 6,
                team_id: 200,
                role: Role::Top,
                total_gold: 500,
                xp: 0,
                cs: 0,
            },
            TimelineFrameSample {
                minute: 5,
                participant_id: 1,
                team_id: 100,
                role: Role::Top,
                total_gold: 2400,
                xp: 2200,
                cs: 40,
            },
            TimelineFrameSample {
                minute: 5,
                participant_id: 6,
                team_id: 200,
                role: Role::Top,
                total_gold: 2000,
                xp: 2100,
                cs: 35,
            },
            TimelineFrameSample {
                minute: 10,
                participant_id: 1,
                team_id: 100,
                role: Role::Top,
                total_gold: 4500,
                xp: 4400,
                cs: 85,
            },
            TimelineFrameSample {
                minute: 10,
                participant_id: 6,
                team_id: 200,
                role: Role::Top,
                total_gold: 4100,
                xp: 4200,
                cs: 78,
            },
        ];

        let curve = compute_team_gold_curve(&samples, 100);
        assert_eq!(curve, vec![(0, 0), (5, 400), (10, 400)]);

        let curve_enemy = compute_team_gold_curve(&samples, 200);
        assert_eq!(curve_enemy, vec![(0, 0), (5, -400), (10, -400)]);
    }
}
