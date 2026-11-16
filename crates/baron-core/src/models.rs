use serde::{Deserialize, Serialize};

/// League of Legends player role / position.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Role {
    Top,
    Jungle,
    Middle,
    Bottom,
    Utility,
    Unknown,
}

impl Role {
    /// Maps Riot API lane/role strings (e.g. "TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY") to `Role`.
    pub fn from_riot_str(s: &str) -> Self {
        match s.trim().to_ascii_uppercase().as_str() {
            "TOP" => Self::Top,
            "JUNGLE" | "JUG" => Self::Jungle,
            "MIDDLE" | "MID" => Self::Middle,
            "BOTTOM" | "BOT" | "ADC" => Self::Bottom,
            "UTILITY" | "SUPPORT" | "SUP" => Self::Utility,
            _ => Self::Unknown,
        }
    }

    /// Short human-readable display label for the role.
    pub fn label(&self) -> &'static str {
        match self {
            Self::Top => "Top",
            Self::Jungle => "Jungle",
            Self::Middle => "Mid",
            Self::Bottom => "ADC",
            Self::Utility => "Support",
            Self::Unknown => "Unknown",
        }
    }
}

/// Riot Account summary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Account {
    pub puuid: String,
    pub summoner_id: Option<u64>,
    pub game_name: String,
    pub tag_line: String,
    pub platform_route: String,
    pub profile_icon_id: i32,
    pub summoner_level: i64,
    pub is_local_account: bool,
    pub updated_at: i64,
}

/// Ranked queue entry (Solo/Duo or Flex).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RankedEntry {
    pub queue_type: String,
    pub tier: String,
    pub division: String,
    pub lp: i32,
    pub wins: i32,
    pub losses: i32,
}

impl RankedEntry {
    /// Calculates current win rate percentage (0.0 to 100.0).
    pub fn win_rate(&self) -> f64 {
        let total = self.wins + self.losses;
        if total > 0 {
            (self.wins as f64 / total as f64) * 100.0
        } else {
            0.0
        }
    }
}

/// Snapshot of ranked LP progression at a specific point in time or after a match.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LpSnapshot {
    pub puuid: String,
    pub queue_type: String,
    pub tier: String,
    pub division: String,
    pub lp: i32,
    pub wins: i32,
    pub losses: i32,
    pub match_id: Option<String>,
    pub recorded_at: i64,
}

/// Post-game statistics for a single match participant.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ParticipantStats {
    pub puuid: String,
    pub game_name: String,
    pub tag_line: String,
    pub team_id: u16,
    pub champion_id: i32,
    pub champion_name: String,
    pub role: Role,
    pub win: bool,
    pub kills: i32,
    pub deaths: i32,
    pub assists: i32,
    pub dpm: f64,
    pub gpm: f64,
    pub cs_per_min: f64,
    pub vision_per_min: f64,
    pub kill_participation: f64,
    pub team_damage_share: f64,
    pub team_gold_share: f64,
    pub gold_diff_14: i32,
    pub xp_diff_14: i32,
    pub cs_diff_14: i32,
    pub items: [i32; 7],
}

/// Post-match performance badge earned by top performers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PerformanceBadge {
    Mvp,
    Ace,
    None,
}

/// Sampled participant stats at a single timeline minute.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TimelineFrameSample {
    pub minute: u32,
    pub participant_id: u8,
    pub team_id: u16,
    pub role: Role,
    pub total_gold: i32,
    pub xp: i32,
    pub cs: i32,
}

/// High-level summary of a match, including participants and timeline samples.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MatchSummary {
    pub match_id: String,
    pub queue_label: String,
    pub game_duration_secs: u32,
    pub played_ago_label: String,
    pub patch: String,
    pub participants: Vec<ParticipantStats>,
    pub timeline_samples: Vec<TimelineFrameSample>,
}

/// Differential metrics between lane opponents at minute 14.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct LaneDiffAt14 {
    pub gold_diff: i32,
    pub xp_diff: i32,
    pub cs_diff: i32,
}

/// Normalized 6-axis metrics for the combat radar chart (0.0..=100.0).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CombatRadarMetrics {
    pub dpm_norm: f64,
    pub gpm_norm: f64,
    pub cs_norm: f64,
    pub kp_norm: f64,
    pub vision_norm: f64,
    pub dmg_per_gold_norm: f64,
}

/// Rune page configuration including styles and perk IDs.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuneBuild {
    pub keystone: String,
    pub primary_tree: String,
    pub primary_perks: Vec<String>,
    pub secondary_tree: String,
    pub secondary_perks: Vec<String>,
    pub stat_shards: Vec<String>,
    pub primary_style_id: i32,
    pub sub_style_id: i32,
    pub selected_perk_ids: [i32; 9],
}

/// Live draft and matchup recommendation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DraftRecommendation {
    pub champion_name: String,
    pub role: Role,
    pub win_rate: f64,
    pub pick_rate: f64,
    pub vs_champion: Option<String>,
    pub matchup_note: Option<String>,
    pub summoner_spells: [String; 2],
    pub skill_priority: [char; 3],
    pub skill_order_1_15: Vec<char>,
    pub starter_items: Vec<String>,
    pub boots: String,
    pub core_items: Vec<String>,
    pub situational_items: Vec<(String, String)>,
    pub runes: RuneBuild,
}

/// Tier list entry for a champion in a specific role.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChampionTierEntry {
    pub rank: u32,
    pub champion_name: String,
    pub role: Role,
    pub tier: String,
    pub win_rate: f64,
    pub pick_rate: f64,
    pub ban_rate: f64,
    pub matches_label: String,
}

/// Row in a competitive leaderboard table.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LeaderboardMemberRow {
    pub rank: u32,
    pub game_name: String,
    pub tag_line: String,
    pub tier: String,
    pub division: String,
    pub lp: i32,
    pub win_rate: f64,
    pub net_lp_7d: i32,
    pub avg_baron_score: f64,
}

/// Champion pool summary row showing personal mastery and stats.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChampionPoolRow {
    pub champion_name: String,
    pub games: u32,
    pub win_rate: f64,
    pub kda_ratio: f64,
    pub cs_per_min: f64,
}

/// Complete dashboard state for offline or initial presentation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DashboardSampleData {
    pub account: Account,
    pub ranked: RankedEntry,
    pub lp_history: Vec<LpSnapshot>,
    pub champion_pool: Vec<ChampionPoolRow>,
    pub matches: Vec<MatchSummary>,
    pub draft: DraftRecommendation,
    pub tier_list: Vec<ChampionTierEntry>,
    pub leaderboard: Vec<LeaderboardMemberRow>,
}

/// Generates realistic sample dashboard data for offline operation or immediate initial rendering.
pub fn sample_dashboard_data() -> DashboardSampleData {
    let account = Account {
        puuid: "baron-local-demo-faker-puuid".to_string(),
        summoner_id: Some(111002233),
        game_name: "Hide on bush".to_string(),
        tag_line: "KR1".to_string(),
        platform_route: "kr".to_string(),
        profile_icon_id: 548,
        summoner_level: 684,
        is_local_account: true,
        updated_at: 1715800000,
    };

    let ranked = RankedEntry {
        queue_type: "RANKED_SOLO_5x5".to_string(),
        tier: "CHALLENGER".to_string(),
        division: "I".to_string(),
        lp: 1042,
        wins: 284,
        losses: 198,
    };

    let base_time = 1715800000i64;
    let lp_points = [
        (920, 273, 194),
        (938, 274, 194),
        (955, 275, 194),
        (940, 275, 195),
        (962, 276, 195),
        (980, 277, 195),
        (965, 277, 196),
        (988, 278, 196),
        (1005, 279, 196),
        (1024, 280, 196),
        (1010, 280, 197),
        (1042, 284, 198),
    ];

    let lp_history: Vec<LpSnapshot> = lp_points
        .iter()
        .enumerate()
        .map(|(i, &(lp, w, l))| LpSnapshot {
            puuid: account.puuid.clone(),
            queue_type: "RANKED_SOLO_5x5".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp,
            wins: w,
            losses: l,
            match_id: Some(format!("KR-7098234{:02}", i + 1)),
            recorded_at: base_time - ((11 - i) as i64 * 86400),
        })
        .collect();

    let champion_pool = vec![
        ChampionPoolRow {
            champion_name: "Ahri".to_string(),
            games: 48,
            win_rate: 64.6,
            kda_ratio: 4.35,
            cs_per_min: 8.8,
        },
        ChampionPoolRow {
            champion_name: "Orianna".to_string(),
            games: 36,
            win_rate: 61.1,
            kda_ratio: 3.82,
            cs_per_min: 9.1,
        },
        ChampionPoolRow {
            champion_name: "Sylas".to_string(),
            games: 29,
            win_rate: 58.6,
            kda_ratio: 3.40,
            cs_per_min: 7.9,
        },
        ChampionPoolRow {
            champion_name: "Azir".to_string(),
            games: 22,
            win_rate: 54.5,
            kda_ratio: 2.95,
            cs_per_min: 9.3,
        },
        ChampionPoolRow {
            champion_name: "LeBlanc".to_string(),
            games: 18,
            win_rate: 66.7,
            kda_ratio: 4.10,
            cs_per_min: 7.7,
        },
    ];

    // Helper to generate 10 participants for a realistic match
    let p_blue = vec![
        (
            "Zeus",
            "KR1",
            266,
            "Aatrox",
            Role::Top,
            true,
            5,
            2,
            8,
            680.0,
            420.0,
            7.9,
            1.1,
            0.48,
            0.22,
            0.21,
            620,
            350,
            14,
            [3074, 3158, 6333, 3053, 0, 0, 3340],
        ),
        (
            "Oner",
            "KR1",
            64,
            "Lee Sin",
            Role::Jungle,
            true,
            6,
            1,
            11,
            520.0,
            390.0,
            5.6,
            2.4,
            0.63,
            0.17,
            0.19,
            300,
            250,
            8,
            [3078, 3158, 3071, 0, 0, 0, 3364],
        ),
        (
            "Hide on bush",
            "KR1",
            103,
            "Ahri",
            Role::Middle,
            true,
            9,
            1,
            8,
            860.0,
            480.0,
            8.9,
            1.8,
            0.63,
            0.28,
            0.23,
            1420,
            850,
            22,
            [6653, 3020, 3089, 4645, 3157, 0, 3363],
        ),
        (
            "Gumayusi",
            "KR1",
            222,
            "Jinx",
            Role::Bottom,
            true,
            7,
            2,
            7,
            790.0,
            470.0,
            9.4,
            1.2,
            0.52,
            0.26,
            0.25,
            450,
            200,
            8,
            [3031, 3006, 3085, 3094, 0, 0, 3363],
        ),
        (
            "Keria",
            "KR1",
            412,
            "Thresh",
            Role::Utility,
            true,
            0,
            1,
            18,
            190.0,
            250.0,
            1.4,
            3.2,
            0.67,
            0.07,
            0.12,
            180,
            90,
            4,
            [3869, 3117, 3190, 3107, 0, 0, 3364],
        ),
    ];

    let p_red = vec![
        (
            "Kiin",
            "KR1",
            41,
            "Gangplank",
            Role::Top,
            false,
            2,
            4,
            3,
            560.0,
            390.0,
            7.3,
            0.9,
            0.71,
            0.25,
            0.23,
            -620,
            -350,
            -14,
            [3078, 3158, 3031, 0, 0, 0, 3340],
        ),
        (
            "Canyon",
            "KR1",
            234,
            "Viego",
            Role::Jungle,
            false,
            3,
            5,
            2,
            460.0,
            340.0,
            5.2,
            1.9,
            0.71,
            0.20,
            0.20,
            -300,
            -250,
            -8,
            [3153, 3047, 3071, 0, 0, 0, 3364],
        ),
        (
            "Chovy",
            "KR1",
            517,
            "Sylas",
            Role::Middle,
            false,
            2,
            6,
            4,
            620.0,
            370.0,
            7.8,
            1.3,
            0.86,
            0.27,
            0.21,
            -1420,
            -850,
            -22,
            [3152, 3158, 3089, 3157, 0, 0, 3340],
        ),
        (
            "Peyz",
            "KR1",
            145,
            "Kai'Sa",
            Role::Bottom,
            false,
            0,
            5,
            3,
            490.0,
            360.0,
            8.5,
            1.0,
            0.43,
            0.21,
            0.24,
            -450,
            -200,
            -8,
            [3006, 3115, 3124, 0, 0, 0, 3363],
        ),
        (
            "Lehends",
            "KR1",
            111,
            "Nautilus",
            Role::Utility,
            false,
            0,
            7,
            5,
            160.0,
            220.0,
            1.2,
            2.6,
            0.71,
            0.07,
            0.12,
            -180,
            -90,
            -4,
            [3869, 3117, 3190, 0, 0, 0, 3364],
        ),
    ];

    let mut participants = Vec::new();
    for (i, p) in p_blue.into_iter().enumerate() {
        participants.push(ParticipantStats {
            puuid: format!("sample-blue-puuid-{}", i + 1),
            game_name: p.0.to_string(),
            tag_line: p.1.to_string(),
            team_id: 100,
            champion_id: p.2,
            champion_name: p.3.to_string(),
            role: p.4,
            win: p.5,
            kills: p.6,
            deaths: p.7,
            assists: p.8,
            dpm: p.9,
            gpm: p.10,
            cs_per_min: p.11,
            vision_per_min: p.12,
            kill_participation: p.13,
            team_damage_share: p.14,
            team_gold_share: p.15,
            gold_diff_14: p.16,
            xp_diff_14: p.17,
            cs_diff_14: p.18,
            items: p.19,
        });
    }

    for (i, p) in p_red.into_iter().enumerate() {
        participants.push(ParticipantStats {
            puuid: format!("sample-red-puuid-{}", i + 1),
            game_name: p.0.to_string(),
            tag_line: p.1.to_string(),
            team_id: 200,
            champion_id: p.2,
            champion_name: p.3.to_string(),
            role: p.4,
            win: p.5,
            kills: p.6,
            deaths: p.7,
            assists: p.8,
            dpm: p.9,
            gpm: p.10,
            cs_per_min: p.11,
            vision_per_min: p.12,
            kill_participation: p.13,
            team_damage_share: p.14,
            team_gold_share: p.15,
            gold_diff_14: p.16,
            xp_diff_14: p.17,
            cs_diff_14: p.18,
            items: p.19,
        });
    }

    // Generate timeline samples for minutes 0..=25 for all 10 participants
    let mut timeline_samples = Vec::new();
    let roles_in_order = [
        (1, 100, Role::Top),
        (2, 100, Role::Jungle),
        (3, 100, Role::Middle),
        (4, 100, Role::Bottom),
        (5, 100, Role::Utility),
        (6, 200, Role::Top),
        (7, 200, Role::Jungle),
        (8, 200, Role::Middle),
        (9, 200, Role::Bottom),
        (10, 200, Role::Utility),
    ];

    for minute in 0..=25u32 {
        for (pid, team_id, role) in roles_in_order.iter() {
            let m = minute as i32;
            let (gold_rate, xp_rate, cs_rate) = match role {
                Role::Middle => (440, 480, 9),
                Role::Top => (400, 470, 8),
                Role::Bottom => (430, 420, 9),
                Role::Jungle => (380, 410, 6),
                Role::Utility => (240, 310, 2),
                Role::Unknown => (300, 300, 5),
            };

            let team_bonus = if *team_id == 100 { m * 30 } else { 0 };
            let total_gold = 500 + m * gold_rate + team_bonus;
            let xp = m * xp_rate + (if *team_id == 100 { m * 20 } else { 0 });
            let cs = m * cs_rate;

            timeline_samples.push(TimelineFrameSample {
                minute,
                participant_id: *pid,
                team_id: *team_id,
                role: *role,
                total_gold,
                xp,
                cs,
            });
        }
    }

    let matches = vec![MatchSummary {
        match_id: "KR-709823412".to_string(),
        queue_label: "Ranked Solo".to_string(),
        game_duration_secs: 1548,
        played_ago_label: "2 hours ago".to_string(),
        patch: "16.22".to_string(),
        participants,
        timeline_samples,
    }];

    let draft = DraftRecommendation {
        champion_name: "Ahri".to_string(),
        role: Role::Middle,
        win_rate: 52.8,
        pick_rate: 11.4,
        vs_champion: Some("Sylas".to_string()),
        matchup_note: Some(
            "Dodge Sylas E2 with Spirit Rush (R). Shove wave with Q to punish early weak waveclear and roam with jungle."
                .to_string(),
        ),
        summoner_spells: ["Flash".to_string(), "Teleport".to_string()],
        skill_priority: ['Q', 'W', 'E'],
        skill_order_1_15: vec![
            'Q', 'W', 'E', 'Q', 'Q', 'R', 'Q', 'W', 'Q', 'W', 'R', 'W', 'W', 'E', 'E',
        ],
        starter_items: vec![
            "Doran's Ring".to_string(),
            "Health Potion".to_string(),
            "Stealth Ward".to_string(),
        ],
        boots: "Sorcerer's Shoes".to_string(),
        core_items: vec![
            "Malignance".to_string(),
            "Shadowflame".to_string(),
            "Zhonya's Hourglass".to_string(),
        ],
        situational_items: vec![
            ("Rabadon's Deathcap".to_string(), "High AP burst amplification".to_string()),
            ("Void Staff".to_string(), "Enemy MR > 70".to_string()),
            ("Banshee's Veil".to_string(), "Spell shield against heavy engage".to_string()),
            ("Morellonomicon".to_string(), "Grievous Wounds against Sylas healing".to_string()),
        ],
        runes: RuneBuild {
            keystone: "Electrocute".to_string(),
            primary_tree: "Domination".to_string(),
            primary_perks: vec![
                "Taste of Blood".to_string(),
                "Eyeball Collection".to_string(),
                "Ultimate Hunter".to_string(),
            ],
            secondary_tree: "Sorcery".to_string(),
            secondary_perks: vec!["Manaflow Band".to_string(), "Transcendence".to_string()],
            stat_shards: vec![
                "+8 Adaptive Force".to_string(),
                "+8 Adaptive Force".to_string(),
                "+65 Health".to_string(),
            ],
            primary_style_id: 8100,
            sub_style_id: 8200,
            selected_perk_ids: [8112, 8139, 8138, 8106, 8226, 8210, 5008, 5008, 5001],
        },
    };

    let tier_list = vec![
        ChampionTierEntry {
            rank: 1,
            champion_name: "Ahri".to_string(),
            role: Role::Middle,
            tier: "S+".to_string(),
            win_rate: 52.8,
            pick_rate: 11.4,
            ban_rate: 8.2,
            matches_label: "142.5K".to_string(),
        },
        ChampionTierEntry {
            rank: 2,
            champion_name: "Sylas".to_string(),
            role: Role::Middle,
            tier: "S".to_string(),
            win_rate: 51.6,
            pick_rate: 13.1,
            ban_rate: 14.5,
            matches_label: "165.2K".to_string(),
        },
        ChampionTierEntry {
            rank: 3,
            champion_name: "Jinx".to_string(),
            role: Role::Bottom,
            tier: "S+".to_string(),
            win_rate: 52.4,
            pick_rate: 18.2,
            ban_rate: 6.1,
            matches_label: "210.8K".to_string(),
        },
        ChampionTierEntry {
            rank: 4,
            champion_name: "Thresh".to_string(),
            role: Role::Utility,
            tier: "S+".to_string(),
            win_rate: 51.9,
            pick_rate: 14.7,
            ban_rate: 9.3,
            matches_label: "185.1K".to_string(),
        },
        ChampionTierEntry {
            rank: 5,
            champion_name: "Lee Sin".to_string(),
            role: Role::Jungle,
            tier: "S".to_string(),
            win_rate: 50.8,
            pick_rate: 16.5,
            ban_rate: 12.0,
            matches_label: "198.4K".to_string(),
        },
        ChampionTierEntry {
            rank: 6,
            champion_name: "Aatrox".to_string(),
            role: Role::Top,
            tier: "S+".to_string(),
            win_rate: 51.5,
            pick_rate: 12.8,
            ban_rate: 15.2,
            matches_label: "155.0K".to_string(),
        },
        ChampionTierEntry {
            rank: 7,
            champion_name: "Viego".to_string(),
            role: Role::Jungle,
            tier: "S".to_string(),
            win_rate: 51.2,
            pick_rate: 11.9,
            ban_rate: 7.8,
            matches_label: "138.9K".to_string(),
        },
        ChampionTierEntry {
            rank: 8,
            champion_name: "Kai'Sa".to_string(),
            role: Role::Bottom,
            tier: "A".to_string(),
            win_rate: 49.8,
            pick_rate: 15.3,
            ban_rate: 5.4,
            matches_label: "180.2K".to_string(),
        },
    ];

    let leaderboard = vec![
        LeaderboardMemberRow {
            rank: 1,
            game_name: "Hide on bush".to_string(),
            tag_line: "KR1".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 1042,
            win_rate: 58.9,
            net_lp_7d: 132,
            avg_baron_score: 84.6,
        },
        LeaderboardMemberRow {
            rank: 2,
            game_name: "Chovy".to_string(),
            tag_line: "GEN".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 1018,
            win_rate: 61.2,
            net_lp_7d: 85,
            avg_baron_score: 86.2,
        },
        LeaderboardMemberRow {
            rank: 3,
            game_name: "ShowMaker".to_string(),
            tag_line: "DK".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 975,
            win_rate: 56.4,
            net_lp_7d: -25,
            avg_baron_score: 81.4,
        },
        LeaderboardMemberRow {
            rank: 4,
            game_name: "Caps".to_string(),
            tag_line: "G2".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 940,
            win_rate: 57.8,
            net_lp_7d: 60,
            avg_baron_score: 83.1,
        },
        LeaderboardMemberRow {
            rank: 5,
            game_name: "Rookie".to_string(),
            tag_line: "NIP".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 915,
            win_rate: 55.2,
            net_lp_7d: 40,
            avg_baron_score: 79.8,
        },
    ];

    DashboardSampleData {
        account,
        ranked,
        lp_history,
        champion_pool,
        matches,
        draft,
        tier_list,
        leaderboard,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_from_riot_str_and_label() {
        assert_eq!(Role::from_riot_str("TOP"), Role::Top);
        assert_eq!(Role::from_riot_str("top"), Role::Top);
        assert_eq!(Role::from_riot_str("JUNGLE"), Role::Jungle);
        assert_eq!(Role::from_riot_str("jug"), Role::Jungle);
        assert_eq!(Role::from_riot_str("MIDDLE"), Role::Middle);
        assert_eq!(Role::from_riot_str("mid"), Role::Middle);
        assert_eq!(Role::from_riot_str("BOTTOM"), Role::Bottom);
        assert_eq!(Role::from_riot_str("bot"), Role::Bottom);
        assert_eq!(Role::from_riot_str("ADC"), Role::Bottom);
        assert_eq!(Role::from_riot_str("UTILITY"), Role::Utility);
        assert_eq!(Role::from_riot_str("support"), Role::Utility);
        assert_eq!(Role::from_riot_str("INVALID"), Role::Unknown);

        assert_eq!(Role::Top.label(), "Top");
        assert_eq!(Role::Jungle.label(), "Jungle");
        assert_eq!(Role::Middle.label(), "Mid");
        assert_eq!(Role::Bottom.label(), "ADC");
        assert_eq!(Role::Utility.label(), "Support");
        assert_eq!(Role::Unknown.label(), "Unknown");
    }

    #[test]
    fn test_sample_dashboard_data_integrity() {
        let sample = sample_dashboard_data();

        assert_eq!(sample.account.game_name, "Hide on bush");
        assert!(sample.ranked.lp > 0);
        assert_eq!(sample.ranked.queue_type, "RANKED_SOLO_5x5");
        assert_eq!(sample.lp_history.len(), 12);
        assert_eq!(sample.champion_pool.len(), 5);
        assert_eq!(sample.matches.len(), 1);
        assert_eq!(sample.matches[0].participants.len(), 10);
        assert_eq!(sample.tier_list.len(), 8);
        assert_eq!(sample.leaderboard.len(), 5);
        assert_eq!(sample.draft.champion_name, "Ahri");
        assert_eq!(sample.draft.vs_champion.as_deref(), Some("Sylas"));

        // Verify JSON serialization and deserialization
        let serialized = serde_json::to_string(&sample).expect("failed to serialize sample data");
        let deserialized: DashboardSampleData =
            serde_json::from_str(&serialized).expect("failed to deserialize sample data");
        assert_eq!(sample, deserialized);
    }
}
