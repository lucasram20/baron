# Baron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **Baron**, a 100% free, zero-ad, pure native Rust + `gpui-kit` (`gpui` + `gpui-component` + `gpui-base` + `gpui-assets`) desktop League of Legends companion and deep post-game analytics application (replacing OP.GG, Blitz.gg, U.GG, and DPM.lol).

**Architecture:** Multi-crate Rust Cargo workspace separating pure domain/analytics logic (`baron-core`), local SQLite persistence (`baron-db`), local zero-key League Client + Live Client integration (`baron-lcu`), Riot Web API + DDragon/CDragon static asset synchronization (`baron-riot`), and the 120fps GPU-accelerated native desktop UI (`baron-app` using `gpui-kit`).

**Tech Stack:** Rust (2024/2021 edition), `gpui-kit` (re-exporting `gpui`, `gpui-component`, `gpui-base`, `gpui-assets`, `gpui-platform`), `irelia`, `riven`, `rusqlite` (bundled), `tokio`, `reqwest`, `serde`, `serde_json`, `async-channel`.

**Spec:** [docs/spec/prd.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/prd.md), [docs/spec/api-data-sources.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/api-data-sources.md), [docs/spec/architecture-gpui.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/architecture-gpui.md), [docs/spec/ui-ux-design.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/ui-ux-design.md)

## Global Constraints

- **Application Title:** `"Baron"` (window title bar, navigation header, rune page prefix `Baron: <Champ>`, and SQLite file `baron.db`).
- **Zero-Web-Framework Mandate:** 100% pure Rust — strictly ZERO JavaScript, ZERO TypeScript, ZERO HTML/CSS, and ZERO WebView/Electron/Tauri. Every UI component and behavior primitive comes from pure-Rust `gpui-kit` (`gpui_kit::component`, `gpui_kit::base`, `gpui_kit::assets`).
- **Zero-Paywall / Zero-Telemetry:** 100% local-first data storage in SQLite (`baron.db`); no external tracking or ad containers.
- **Anti-Clutter 3-Layer UX:** Strict 3-Zone App Shell (`64px` Left Icon Rail, `48px` Top Command Bar, and `DockArea` Workspace) with progressive disclosure (Glanceable Row → Expandable DPM Lens Drawer → Hover Tooltips).
- **Riot Fair Play Compliance:** Only use official LCU, Live Client (`127.0.0.1:2999`), DDragon/CDragon, and Riot Web API endpoints; never bypass Ranked Champ Select anonymity or track fog-of-war/enemy cooldowns automatically.

---

## Workspace File Structure

```text
baron/
├── Cargo.toml
├── docs/
│   ├── README.md
│   └── spec/
│       ├── prd.md
│       ├── api-data-sources.md
│       ├── architecture-gpui.md
│       ├── ui-ux-design.md
│       └── implementation-plan.md
└── crates/
    ├── baron-core/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       ├── models.rs         # Account, LpSnapshot, MatchSummary, ParticipantStats, ChampionBuild
    │       ├── score.rs          # Baron Score (0-100) & MVP/ACE badge calculator
    │       └── timeline.rs       # Match-V5 Timeline @14m lane diff & Gold/XP curve extractor
    ├── baron-db/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       ├── schema.rs         # SQLite migrations (accounts, lp_snapshots, matches, leaderboards, builds)
    │       └── repo.rs           # Typed CRUD methods for LP history, match cache, and custom leaderboards
    ├── baron-lcu/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       ├── client.rs         # irelia LCU auto-discovery, summoner profile, ranked stats, skin inventory
    │       ├── draft.rs          # Champ Select session state, Auto-Runes, Auto-Spells, Auto-Item Sets
    │       └── live_game.rs      # 127.0.0.1:2999 Live Client poller for active game events & gold lead
    ├── baron-riot/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       ├── assets.rs         # DDragon & CDragon version sync, skin rarity valuator, icon disk cache
    │       └── web_api.rs        # riven Riot API wrapper (Account-V1, League-V4, Match-V5 + Timeline)
    └── baron-app/
        ├── Cargo.toml
        └── src/
            ├── main.rs           # Application::new(), gpui_component::init(cx), "Baron" Window + Root
            ├── theme.rs          # Obsidian dark palette tokens (#090B10 canvas, #11151F surface, semantic colors)
            ├── workspace.rs      # 3-Zone App Shell: 64px Nav Rail, 48px Command Bar, Center View Router
            └── views/
                ├── mod.rs
                ├── home.rs       # Bento Header (Rank + AreaChart LP curve + Recent Form) & Match Feed
                ├── draft.rs      # Live Draft Assistant (Rune tree, Item progression, Matchup shift card)
                ├── lens.rs       # DPM Lens (Lane @14m Head-to-Head, AreaChart Gold Diff, 6-axis RadarChart)
                └── extras.rs     # Tier List DataTable, Custom Leaderboards, and Skin Collection Vault
```

---

### Task 1: Workspace Scaffold, `baron-core` Domain Models & Baron Score Engine

**Files:**
- Create: `Cargo.toml`
- Create: `crates/baron-core/Cargo.toml`
- Create: `crates/baron-core/src/lib.rs`
- Create: `crates/baron-core/src/models.rs`
- Create: `crates/baron-core/src/score.rs`
- Create: `crates/baron-core/src/timeline.rs`

**Interfaces:**
- Consumes: None (foundational crate)
- Produces:
  - `baron_core::models::{Account, RankedEntry, LpSnapshot, Role, ParticipantStats, MatchSummary, LaneDiffAt14, TimelinePoint, CombatRadarMetrics,RuneBuild}`
  - `baron_core::score::{calculate_baron_score, assign_match_badges, Badge}`
  - `baron_core::timeline::{compute_lane_diff_at_minute, compute_combat_radar}`

- [ ] **Step 1: Create root workspace `Cargo.toml` and `crates/baron-core` with unit tests**

Create `Cargo.toml`:
```toml
[workspace]
resolver = "2"
members = [
    "crates/baron-core",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"
authors = ["Baron Contributors"]

[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "2.0"
```

Create `crates/baron-core/Cargo.toml`:
```toml
[package]
name = "baron-core"
version.workspace = true
edition.workspace = true

[dependencies]
serde.workspace = true
serde_json.workspace = true
thiserror.workspace = true
```

Create `crates/baron-core/src/models.rs`:
```rust
use serde::{Deserialize, Serialize};

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
    pub fn from_riot_str(s: &str) -> Self {
        match s.to_ascii_uppercase().as_str() {
            "TOP" => Self::Top,
            "JUNGLE" => Self::Jungle,
            "MIDDLE" | "MID" => Self::Middle,
            "BOTTOM" | "BOT" | "ADC" => Self::Bottom,
            "UTILITY" | "SUPPORT" => Self::Utility,
            _ => Self::Unknown,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PerformanceBadge {
    Mvp,
    Ace,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineFrameSample {
    pub minute: u32,
    pub participant_id: u8,
    pub team_id: u16,
    pub role: Role,
    pub total_gold: i32,
    pub xp: i32,
    pub cs: i32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LaneDiffAt14 {
    pub gold_diff: i32,
    pub xp_diff: i32,
    pub cs_diff: i32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CombatRadarMetrics {
    pub dpm_norm: f64,
    pub gpm_norm: f64,
    pub cs_norm: f64,
    pub kp_norm: f64,
    pub vision_norm: f64,
    pub dmg_per_gold_norm: f64,
}
```

- [ ] **Step 2: Write `crates/baron-core/src/score.rs` and `crates/baron-core/src/timeline.rs` with unit tests**

Create `crates/baron-core/src/score.rs`:
```rust
use crate::models::{ParticipantStats, PerformanceBadge};

/// Calculates the transparent 0.0..=100.0 Baron Score for a participant.
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

    // Lane phase @14m bonus/penalty (-10.0 to +15.0)
    let lane_component = ((stats.gold_diff_14 as f64 / 1500.0).clamp(-1.0, 1.0) * 10.0)
        + if stats.win { 5.0 } else { 0.0 };

    (kda_component + kp_component + dmg_component + cs_vision_component + lane_component)
        .clamp(0.0, 100.0)
}

/// Assigns MVP (highest score on winning team) and ACE (highest score on losing team).
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

    fn sample_player(puuid: &str, win: bool, kills: i32, deaths: i32, assists: i32, gold_diff_14: i32) -> ParticipantStats {
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
            kill_participation: 0.68,
            team_damage_share: 0.28,
            team_gold_share: 0.22,
            gold_diff_14,
            xp_diff_14: 400,
            cs_diff_14: 12,
            items: [3157, 3089, 3020, 4645, 3135, 3165, 3363],
        }
    }

    #[test]
    fn test_baron_score_and_mvp_ace_assignment() {
        let p1 = sample_player("winner_carry", true, 12, 2, 9, 1400);
        let p2 = sample_player("winner_support", true, 1, 5, 14, -200);
        let p3 = sample_player("loser_ace", false, 9, 3, 6, 800);
        let p4 = sample_player("loser_other", false, 2, 8, 3, -1400);

        let badges = assign_match_badges(&[p1, p2, p3, p4]);
        let winner_carry = badges.iter().find(|(id, _, _)| id == "winner_carry").unwrap();
        let loser_ace = badges.iter().find(|(id, _, _)| id == "loser_ace").unwrap();

        assert_eq!(winner_carry.2, PerformanceBadge::Mvp);
        assert!(winner_carry.1 > 75.0);
        assert_eq!(loser_ace.2, PerformanceBadge::Ace);
    }
}
```

Create `crates/baron-core/src/timeline.rs`:
```rust
use crate::models::{CombatRadarMetrics, LaneDiffAt14, ParticipantStats, Role, TimelineFrameSample};

/// Computes the exact Gold, XP, and CS differential at a target minute (e.g. minute 14)
/// between a participant and their direct enemy lane counterpart.
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

/// Normalizes a player's 6 core combat stats into 0.0..=100.0 radar axes.
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
}
```

Create `crates/baron-core/src/lib.rs`:
```rust
pub mod models;
pub mod score;
pub mod timeline;
```

- [ ] **Step 3: Run `cargo test -p baron-core` to verify all domain tests pass**

Run: `cargo test -p baron-core`
Expected: `test result: ok. 2 passed; 0 failed`

---

### Task 2: Local SQLite Persistence (`baron-db`) for LP History, Matches & Leaderboards

**Files:**
- Modify: `Cargo.toml`
- Create: `crates/baron-db/Cargo.toml`
- Create: `crates/baron-db/src/lib.rs`
- Create: `crates/baron-db/src/schema.rs`
- Create: `crates/baron-db/src/repo.rs`

**Interfaces:**
- Consumes: `baron_core::models::{Account, LpSnapshot}`
- Produces:
  - `baron_db::BaronDatabase::open_in_memory() -> Result<Self>`
  - `baron_db::BaronDatabase::open_path(path: &Path) -> Result<Self>`
  - `baron_db::BaronDatabase::{upsert_account, list_accounts, insert_lp_snapshot, get_lp_history, cache_match_json, get_cached_match_json}`

- [ ] **Step 1: Create `crates/baron-db` with SQLite schema and unit tests**

Create `crates/baron-db/Cargo.toml`:
```toml
[package]
name = "baron-db"
version.workspace = true
edition.workspace = true

[dependencies]
baron-core = { path = "../baron-core" }
rusqlite = { version = "0.32", features = ["bundled"] }
serde.workspace = true
serde_json.workspace = true
thiserror.workspace = true
```

Create `crates/baron-db/src/schema.rs`:
```rust
use rusqlite::{Connection, Result};

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS accounts (
            puuid TEXT PRIMARY KEY,
            summoner_id INTEGER,
            game_name TEXT NOT NULL,
            tag_line TEXT NOT NULL,
            platform_route TEXT NOT NULL,
            profile_icon_id INTEGER NOT NULL,
            summoner_level INTEGER NOT NULL,
            is_local_account INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lp_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            puuid TEXT NOT NULL,
            queue_type TEXT NOT NULL,
            tier TEXT NOT NULL,
            division TEXT NOT NULL,
            lp INTEGER NOT NULL,
            wins INTEGER NOT NULL,
            losses INTEGER NOT NULL,
            match_id TEXT,
            recorded_at INTEGER NOT NULL,
            FOREIGN KEY(puuid) REFERENCES accounts(puuid)
        );

        CREATE TABLE IF NOT EXISTS matches (
            match_id TEXT PRIMARY KEY,
            game_creation INTEGER NOT NULL,
            game_duration INTEGER NOT NULL,
            game_version TEXT NOT NULL,
            queue_id INTEGER NOT NULL,
            raw_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS match_timelines (
            match_id TEXT PRIMARY KEY,
            raw_json TEXT NOT NULL,
            FOREIGN KEY(match_id) REFERENCES matches(match_id)
        );

        CREATE TABLE IF NOT EXISTS leaderboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS leaderboard_members (
            leaderboard_id INTEGER NOT NULL,
            puuid TEXT NOT NULL,
            PRIMARY KEY (leaderboard_id, puuid)
        );
        ",
    )
}
```

Create `crates/baron-db/src/repo.rs`:
```rust
use std::path::Path;
use baron_core::models::{Account, LpSnapshot};
use rusqlite::{params, Connection, OptionalExtension, Result};
use crate::schema::run_migrations;

pub struct BaronDatabase {
    conn: Connection,
}

impl BaronDatabase {
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        run_migrations(&conn)?;
        Ok(Self { conn })
    }

    pub fn open_path(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        run_migrations(&conn)?;
        Ok(Self { conn })
    }

    pub fn upsert_account(&self, acc: &Account) -> Result<()> {
        self.conn.execute(
            "INSERT INTO accounts (
                puuid, summoner_id, game_name, tag_line, platform_route,
                profile_icon_id, summoner_level, is_local_account, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(puuid) DO UPDATE SET
                summoner_id = excluded.summoner_id,
                game_name = excluded.game_name,
                tag_line = excluded.tag_line,
                platform_route = excluded.platform_route,
                profile_icon_id = excluded.profile_icon_id,
                summoner_level = excluded.summoner_level,
                is_local_account = excluded.is_local_account,
                updated_at = excluded.updated_at",
            params![
                acc.puuid,
                acc.summoner_id.map(|v| v as i64),
                acc.game_name,
                acc.tag_line,
                acc.platform_route,
                acc.profile_icon_id,
                acc.summoner_level,
                if acc.is_local_account { 1 } else { 0 },
                acc.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn insert_lp_snapshot(&self, snap: &LpSnapshot) -> Result<()> {
        self.conn.execute(
            "INSERT INTO lp_snapshots (
                puuid, queue_type, tier, division, lp, wins, losses, match_id, recorded_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                snap.puuid,
                snap.queue_type,
                snap.tier,
                snap.division,
                snap.lp,
                snap.wins,
                snap.losses,
                snap.match_id,
                snap.recorded_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_lp_history(&self, puuid: &str, queue_type: &str) -> Result<Vec<LpSnapshot>> {
        let mut stmt = self.conn.prepare(
            "SELECT puuid, queue_type, tier, division, lp, wins, losses, match_id, recorded_at
             FROM lp_snapshots
             WHERE puuid = ?1 AND queue_type = ?2
             ORDER BY recorded_at ASC",
        )?;
        let rows = stmt.query_map(params![puuid, queue_type], |row| {
            Ok(LpSnapshot {
                puuid: row.get(0)?,
                queue_type: row.get(1)?,
                tier: row.get(2)?,
                division: row.get(3)?,
                lp: row.get(4)?,
                wins: row.get(5)?,
                losses: row.get(6)?,
                match_id: row.get(7)?,
                recorded_at: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    pub fn cache_match_json(
        &self,
        match_id: &str,
        game_creation: i64,
        game_duration: i64,
        game_version: &str,
        queue_id: i32,
        raw_json: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO matches (
                match_id, game_creation, game_duration, game_version, queue_id, raw_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![match_id, game_creation, game_duration, game_version, queue_id, raw_json],
        )?;
        Ok(())
    }

    pub fn get_cached_match_json(&self, match_id: &str) -> Result<Option<String>> {
        self.conn
            .query_row(
                "SELECT raw_json FROM matches WHERE match_id = ?1",
                params![match_id],
                |row| row.get(0),
            )
            .optional()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_account_and_lp_snapshot_roundtrip() {
        let db = BaronDatabase::open_in_memory().unwrap();
        let acc = Account {
            puuid: "puuid-123".into(),
            summoner_id: Some(999),
            game_name: "Faker".into(),
            tag_line: "KR1".into(),
            platform_route: "KR".into(),
            profile_icon_id: 29,
            summoner_level: 750,
            is_local_account: true,
            updated_at: 1700000000,
        };
        db.upsert_account(&acc).unwrap();

        let s1 = LpSnapshot {
            puuid: "puuid-123".into(),
            queue_type: "RANKED_SOLO_5x5".into(),
            tier: "DIAMOND".into(),
            division: "I".into(),
            lp: 45,
            wins: 50,
            losses: 40,
            match_id: Some("KR_1".into()),
            recorded_at: 1700001000,
        };
        let s2 = LpSnapshot {
            lp: 68,
            wins: 51,
            match_id: Some("KR_2".into()),
            recorded_at: 1700003000,
            ..s1.clone()
        };
        db.insert_lp_snapshot(&s1).unwrap();
        db.insert_lp_snapshot(&s2).unwrap();

        let history = db.get_lp_history("puuid-123", "RANKED_SOLO_5x5").unwrap();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].lp, 45);
        assert_eq!(history[1].lp, 68);
    }
}
```

- [ ] **Step 2: Run `cargo test -p baron-db` to verify SQLite persistence passes**

Run: `cargo test -p baron-db`
Expected: `test result: ok. 1 passed; 0 failed`

---

### Task 3: Zero-Key LCU & Live Client Service (`baron-lcu`) + Skin Value Calculator

**Files:**
- Create: `crates/baron-lcu/Cargo.toml`
- Create: `crates/baron-lcu/src/lib.rs`
- Create: `crates/baron-lcu/src/skin_vault.rs`
- Create: `crates/baron-lcu/src/draft_payloads.rs`

**Interfaces:**
- Consumes: `baron_core::models::*`
- Produces:
  - `baron_lcu::skin_vault::{SkinRarity, OwnedSkinEntry, SkinVaultSummary, evaluate_skin_collection}`
  - `baron_lcu::draft_payloads::{LcuRunePagePayload, LcuItemSetPayload, build_lcu_rune_page}`

- [ ] **Step 1: Implement `skin_vault.rs` and `draft_payloads.rs` with unit tests**

Create `crates/baron-lcu/src/skin_vault.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SkinRarity {
    Exalted,
    Ultimate,
    Mythic,
    Legendary,
    Epic,
    Standard,
}

impl SkinRarity {
    pub fn from_cdragon_str(rarity: &str) -> Self {
        match rarity.to_ascii_lowercase().as_str() {
            "kexalted" | "exalted" => Self::Exalted,
            "kultimate" | "ultimate" => Self::Ultimate,
            "kmythic" | "mythic" => Self::Mythic,
            "klegendary" | "legendary" => Self::Legendary,
            "kepic" | "epic" => Self::Epic,
            _ => Self::Standard,
        }
    }

    pub fn estimated_rp(&self) -> u32 {
        match self {
            Self::Exalted => 32000,
            Self::Ultimate => 3250,
            Self::Mythic => 2500,
            Self::Legendary => 1820,
            Self::Epic => 1350,
            Self::Standard => 975,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OwnedSkinEntry {
    pub skin_id: i32,
    pub name: String,
    pub is_base: bool,
    pub owned: bool,
    pub rarity: SkinRarity,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct SkinVaultSummary {
    pub total_owned_skins: usize,
    pub total_estimated_rp: u32,
    pub ultimate_count: usize,
    pub mythic_count: usize,
    pub legendary_count: usize,
    pub epic_count: usize,
    pub standard_count: usize,
}

pub fn evaluate_skin_collection(skins: &[OwnedSkinEntry]) -> SkinVaultSummary {
    let mut summary = SkinVaultSummary::default();
    for skin in skins.iter().filter(|s| s.owned && !s.is_base) {
        summary.total_owned_skins += 1;
        summary.total_estimated_rp += skin.rarity.estimated_rp();
        match skin.rarity {
            SkinRarity::Ultimate | SkinRarity::Exalted => summary.ultimate_count += 1,
            SkinRarity::Mythic => summary.mythic_count += 1,
            SkinRarity::Legendary => summary.legendary_count += 1,
            SkinRarity::Epic => summary.epic_count += 1,
            SkinRarity::Standard => summary.standard_count += 1,
        }
    }
    summary
}
```

Create `crates/baron-lcu/src/draft_payloads.rs`:
```rust
use serde::{Deserialize, Serialize};

/// Exact JSON payload accepted by LCU `POST /lol-perks/v1/pages`
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuRunePagePayload {
    pub name: String,
    pub primary_style_id: i32,
    pub sub_style_id: i32,
    pub selected_perk_ids: [i32; 9],
    pub current: bool,
}

pub fn build_lcu_rune_page(
    champion_name: &str,
    primary_style_id: i32,
    sub_style_id: i32,
    selected_perk_ids: [i32; 9],
) -> LcuRunePagePayload {
    LcuRunePagePayload {
        name: format!("Baron: {champion_name}"),
        primary_style_id,
        sub_style_id,
        selected_perk_ids,
        current: true,
    }
}
```

- [ ] **Step 2: Run `cargo test -p baron-lcu` to verify LCU payload builders and Skin Vault math**

Run: `cargo test -p baron-lcu`
Expected: `test result: ok`

---

### Task 4: Pure Native GPUI Kit Desktop App (`baron-app`) with Title `"Baron"`

**Files:**
- Create: `crates/baron-app/Cargo.toml`
- Create: `crates/baron-app/src/main.rs`
- Create: `crates/baron-app/src/theme.rs`
- Create: `crates/baron-app/src/workspace.rs`
- Create: `crates/baron-app/src/views/mod.rs`
- Create: `crates/baron-app/src/views/home.rs`
- Create: `crates/baron-app/src/views/draft.rs`
- Create: `crates/baron-app/src/views/lens.rs`
- Create: `crates/baron-app/src/views/extras.rs`

**Interfaces:**
- Consumes: `baron-core`, `baron-db`, `baron-lcu`, `gpui-kit` (`gpui_kit::*`, `gpui_kit::component::*`, `gpui_kit::base::*`, `gpui_kit::assets::Assets`)
- Produces: Native GPU-accelerated desktop binary `baron` opening a window titled `"Baron"` via `gpui_kit::open_window` with the 3-Zone App Shell (`Home`, `Live Draft`, `DPM Lens`, `Tier List`, `Leaderboards`, `Skin Vault`).

- [ ] **Step 1: Implement `crates/baron-app` with pure native `gpui-kit` (`gpui_kit::component`, `gpui_kit::base`, `gpui_kit::assets`) views**
- [ ] **Step 2: Run `cargo check --workspace` and `cargo test --workspace` to verify compilation and tests**
