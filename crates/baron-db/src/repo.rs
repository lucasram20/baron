use std::path::Path;
use std::sync::Mutex;

use baron_core::models::{Account, LpSnapshot};
use rusqlite::{params, Connection, OptionalExtension};

use crate::schema;

/// Local SQLite repository managing persistence for Baron.
///
/// Wraps a thread-safe SQLite connection and provides high-level APIs
/// for accounts, LP progression snapshots, match caches, timelines,
/// leaderboards, and champion builds.
#[derive(Debug)]
pub struct BaronDatabase {
    conn: Mutex<Connection>,
}

impl BaronDatabase {
    /// Opens an in-memory SQLite database and applies migrations.
    pub fn open_in_memory() -> rusqlite::Result<Self> {
        let conn = Connection::open_in_memory()?;
        schema::run_migrations(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Opens or creates an SQLite database at the specified file path and applies migrations.
    pub fn open_path(path: &Path) -> rusqlite::Result<Self> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                let _ = std::fs::create_dir_all(parent);
            }
        }
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;
        schema::run_migrations(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Inserts or updates a Riot account in the local registry.
    pub fn upsert_account(&self, acc: &Account) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let summoner_id = acc.summoner_id.map(|id| id as i64);
        let is_local = if acc.is_local_account { 1i32 } else { 0i32 };

        conn.execute(
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
                summoner_id,
                acc.game_name,
                acc.tag_line,
                acc.platform_route,
                acc.profile_icon_id,
                acc.summoner_level,
                is_local,
                acc.updated_at,
            ],
        )?;

        Ok(())
    }

    /// Lists all accounts in the local registry, ordered by most recently updated first.
    pub fn list_accounts(&self) -> rusqlite::Result<Vec<Account>> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let mut stmt = conn.prepare(
            "SELECT puuid, summoner_id, game_name, tag_line, platform_route,
                    profile_icon_id, summoner_level, is_local_account, updated_at
             FROM accounts
             ORDER BY updated_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let summoner_id: Option<i64> = row.get(1)?;
            let is_local: i32 = row.get(7)?;
            Ok(Account {
                puuid: row.get(0)?,
                summoner_id: summoner_id.map(|id| id as u64),
                game_name: row.get(2)?,
                tag_line: row.get(3)?,
                platform_route: row.get(4)?,
                profile_icon_id: row.get(5)?,
                summoner_level: row.get(6)?,
                is_local_account: is_local != 0,
                updated_at: row.get(8)?,
            })
        })?;

        let mut accounts = Vec::new();
        for acc in rows {
            accounts.push(acc?);
        }
        Ok(accounts)
    }

    /// Appends a ranked LP progression snapshot for an account.
    pub fn insert_lp_snapshot(&self, snap: &LpSnapshot) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        conn.execute(
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

    /// Retrieves chronological LP progression snapshots for a specific account and queue type.
    pub fn get_lp_history(&self, puuid: &str, queue_type: &str) -> rusqlite::Result<Vec<LpSnapshot>> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let mut stmt = conn.prepare(
            "SELECT puuid, queue_type, tier, division, lp, wins, losses, match_id, recorded_at
             FROM lp_snapshots
             WHERE puuid = ?1 AND queue_type = ?2
             ORDER BY recorded_at ASC, id ASC",
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

        let mut history = Vec::new();
        for snap in rows {
            history.push(snap?);
        }
        Ok(history)
    }

    /// Caches full match JSON metadata.
    pub fn cache_match_json(
        &self,
        match_id: &str,
        game_creation: i64,
        game_duration: i64,
        game_version: &str,
        queue_id: i32,
        raw_json: &str,
    ) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        conn.execute(
            "INSERT INTO matches (
                match_id, game_creation, game_duration, game_version, queue_id, raw_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(match_id) DO UPDATE SET
                game_creation = excluded.game_creation,
                game_duration = excluded.game_duration,
                game_version = excluded.game_version,
                queue_id = excluded.queue_id,
                raw_json = excluded.raw_json",
            params![
                match_id,
                game_creation,
                game_duration,
                game_version,
                queue_id,
                raw_json,
            ],
        )?;

        Ok(())
    }

    /// Fetches cached raw match JSON by match ID.
    pub fn get_cached_match_json(&self, match_id: &str) -> rusqlite::Result<Option<String>> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let mut stmt = conn.prepare("SELECT raw_json FROM matches WHERE match_id = ?1")?;
        let res = stmt.query_row(params![match_id], |row| row.get(0)).optional()?;
        Ok(res)
    }

    /// Caches raw Match-V5 timeline JSON.
    pub fn cache_match_timeline_json(
        &self,
        match_id: &str,
        raw_json: &str,
    ) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        conn.execute(
            "INSERT INTO match_timelines (match_id, raw_json)
             VALUES (?1, ?2)
             ON CONFLICT(match_id) DO UPDATE SET raw_json = excluded.raw_json",
            params![match_id, raw_json],
        )?;

        Ok(())
    }

    /// Fetches cached raw Match-V5 timeline JSON by match ID.
    pub fn get_cached_match_timeline_json(&self, match_id: &str) -> rusqlite::Result<Option<String>> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let mut stmt = conn.prepare("SELECT raw_json FROM match_timelines WHERE match_id = ?1")?;
        let res = stmt.query_row(params![match_id], |row| row.get(0)).optional()?;
        Ok(res)
    }

    /// Creates a new custom leaderboard and returns its assigned ID.
    pub fn create_leaderboard(&self, name: &str, created_at: i64) -> rusqlite::Result<i64> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        conn.execute(
            "INSERT INTO leaderboards (name, created_at) VALUES (?1, ?2)",
            params![name, created_at],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// Adds a player's PUUID to a custom leaderboard. Idempotent.
    pub fn add_leaderboard_member(&self, leaderboard_id: i64, puuid: &str) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        conn.execute(
            "INSERT INTO leaderboard_members (leaderboard_id, puuid)
             VALUES (?1, ?2)
             ON CONFLICT(leaderboard_id, puuid) DO NOTHING",
            params![leaderboard_id, puuid],
        )?;
        Ok(())
    }

    /// Lists all custom leaderboards with their associated member PUUIDs.
    pub fn list_leaderboards(&self) -> rusqlite::Result<Vec<(i64, String, Vec<String>)>> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let mut l_stmt = conn.prepare("SELECT id, name FROM leaderboards ORDER BY id ASC")?;
        let mut m_stmt = conn.prepare(
            "SELECT puuid FROM leaderboard_members WHERE leaderboard_id = ?1 ORDER BY rowid ASC",
        )?;

        let leaderboards_iter = l_stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            Ok((id, name))
        })?;

        let mut result = Vec::new();
        for lb in leaderboards_iter {
            let (id, name) = lb?;
            let members_iter = m_stmt.query_map(params![id], |row| row.get(0))?;
            let mut members = Vec::new();
            for m in members_iter {
                members.push(m?);
            }
            result.push((id, name, members));
        }

        Ok(result)
    }

    /// Caches a recommended champion build.
    pub fn cache_champion_build(
        &self,
        patch: &str,
        champion_id: i32,
        role: &str,
        vs_champion_id: i32,
        build_json: &str,
        updated_at: i64,
    ) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        conn.execute(
            "INSERT INTO champion_builds (
                patch, champion_id, role, vs_champion_id, build_json, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(patch, champion_id, role, vs_champion_id) DO UPDATE SET
                build_json = excluded.build_json,
                updated_at = excluded.updated_at",
            params![patch, champion_id, role, vs_champion_id, build_json, updated_at],
        )?;
        Ok(())
    }

    /// Retrieves a cached champion build, if present.
    pub fn get_champion_build(
        &self,
        patch: &str,
        champion_id: i32,
        role: &str,
        vs_champion_id: i32,
    ) -> rusqlite::Result<Option<String>> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let mut stmt = conn.prepare(
            "SELECT build_json FROM champion_builds
             WHERE patch = ?1 AND champion_id = ?2 AND role = ?3 AND vs_champion_id = ?4",
        )?;
        let res = stmt
            .query_row(params![patch, champion_id, role, vs_champion_id], |row| row.get(0))
            .optional()?;
        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_account_upsert_and_list() {
        let db = BaronDatabase::open_in_memory().expect("failed to open in-memory db");

        let acc1 = Account {
            puuid: "faker-puuid-1".to_string(),
            summoner_id: Some(111222333),
            game_name: "Hide on bush".to_string(),
            tag_line: "KR1".to_string(),
            platform_route: "kr".to_string(),
            profile_icon_id: 548,
            summoner_level: 684,
            is_local_account: true,
            updated_at: 1715000000,
        };

        db.upsert_account(&acc1).expect("failed to upsert acc1");

        let accounts = db.list_accounts().expect("failed to list accounts");
        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0], acc1);

        // Update acc1 level and timestamp
        let mut acc1_updated = acc1.clone();
        acc1_updated.summoner_level = 685;
        acc1_updated.updated_at = 1715001000;
        db.upsert_account(&acc1_updated).expect("failed to update acc1");

        let accounts = db.list_accounts().expect("failed to list accounts");
        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].summoner_level, 685);
        assert_eq!(accounts[0].updated_at, 1715001000);

        // Add a second account
        let acc2 = Account {
            puuid: "chovy-puuid-2".to_string(),
            summoner_id: None,
            game_name: "Chovy".to_string(),
            tag_line: "GEN".to_string(),
            platform_route: "kr".to_string(),
            profile_icon_id: 123,
            summoner_level: 512,
            is_local_account: false,
            updated_at: 1715002000,
        };
        db.upsert_account(&acc2).expect("failed to upsert acc2");

        let accounts = db.list_accounts().expect("failed to list accounts");
        assert_eq!(accounts.len(), 2);
        // Ordered by updated_at DESC: acc2 (1715002000) then acc1_updated (1715001000)
        assert_eq!(accounts[0].puuid, acc2.puuid);
        assert_eq!(accounts[1].puuid, acc1_updated.puuid);
    }

    #[test]
    fn test_lp_snapshot_roundtrip_sorted_by_time() {
        let db = BaronDatabase::open_in_memory().expect("failed to open in-memory db");

        let acc = Account {
            puuid: "player-puuid-xyz".to_string(),
            summoner_id: Some(999888),
            game_name: "Caps".to_string(),
            tag_line: "G2".to_string(),
            platform_route: "euw1".to_string(),
            profile_icon_id: 1,
            summoner_level: 400,
            is_local_account: true,
            updated_at: 1710000000,
        };
        db.upsert_account(&acc).expect("failed to insert account");

        // Insert snapshots out of chronological order
        let snap2 = LpSnapshot {
            puuid: acc.puuid.clone(),
            queue_type: "RANKED_SOLO_5x5".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 920,
            wins: 150,
            losses: 100,
            match_id: Some("EUW1_2".to_string()),
            recorded_at: 1710002000,
        };

        let snap1 = LpSnapshot {
            puuid: acc.puuid.clone(),
            queue_type: "RANKED_SOLO_5x5".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 900,
            wins: 149,
            losses: 100,
            match_id: Some("EUW1_1".to_string()),
            recorded_at: 1710001000,
        };

        let snap3 = LpSnapshot {
            puuid: acc.puuid.clone(),
            queue_type: "RANKED_SOLO_5x5".to_string(),
            tier: "CHALLENGER".to_string(),
            division: "I".to_string(),
            lp: 940,
            wins: 151,
            losses: 100,
            match_id: Some("EUW1_3".to_string()),
            recorded_at: 1710003000,
        };

        let snap_flex = LpSnapshot {
            puuid: acc.puuid.clone(),
            queue_type: "RANKED_FLEX_SR".to_string(),
            tier: "DIAMOND".to_string(),
            division: "I".to_string(),
            lp: 50,
            wins: 20,
            losses: 5,
            match_id: None,
            recorded_at: 1710001500,
        };

        db.insert_lp_snapshot(&snap2).expect("insert snap2");
        db.insert_lp_snapshot(&snap1).expect("insert snap1");
        db.insert_lp_snapshot(&snap3).expect("insert snap3");
        db.insert_lp_snapshot(&snap_flex).expect("insert snap_flex");

        let solo_history = db
            .get_lp_history(&acc.puuid, "RANKED_SOLO_5x5")
            .expect("fetch solo history");
        assert_eq!(solo_history.len(), 3);
        assert_eq!(solo_history[0], snap1);
        assert_eq!(solo_history[1], snap2);
        assert_eq!(solo_history[2], snap3);

        let flex_history = db
            .get_lp_history(&acc.puuid, "RANKED_FLEX_SR")
            .expect("fetch flex history");
        assert_eq!(flex_history.len(), 1);
        assert_eq!(flex_history[0], snap_flex);
    }

    #[test]
    fn test_match_and_timeline_cache_roundtrip() {
        let db = BaronDatabase::open_in_memory().expect("failed to open in-memory db");

        let match_id = "KR_709823412";
        let raw_match = r#"{"gameId":709823412,"gameDuration":1548,"gameMode":"CLASSIC"}"#;
        let raw_timeline = r#"{"frames":[{"events":[],"participantFrames":{}}]}"#;

        // Verify non-existent returns None
        assert_eq!(db.get_cached_match_json(match_id).unwrap(), None);
        assert_eq!(db.get_cached_match_timeline_json(match_id).unwrap(), None);

        // Cache match and timeline
        db.cache_match_json(match_id, 1715800000, 1548, "14.10", 420, raw_match)
            .expect("cache match json");
        db.cache_match_timeline_json(match_id, raw_timeline)
            .expect("cache timeline json");

        // Verify roundtrip retrieval
        let cached_match = db.get_cached_match_json(match_id).unwrap();
        assert_eq!(cached_match.as_deref(), Some(raw_match));

        let cached_timeline = db.get_cached_match_timeline_json(match_id).unwrap();
        assert_eq!(cached_timeline.as_deref(), Some(raw_timeline));
    }

    #[test]
    fn test_custom_leaderboard_crud() {
        let db = BaronDatabase::open_in_memory().expect("failed to open in-memory db");

        let id1 = db
            .create_leaderboard("LCK Pro Track", 1710000000)
            .expect("create leaderboard 1");
        let id2 = db
            .create_leaderboard("Flex Squad", 1710001000)
            .expect("create leaderboard 2");

        db.add_leaderboard_member(id1, "puuid-faker").expect("add faker");
        db.add_leaderboard_member(id1, "puuid-chovy").expect("add chovy");
        // Test idempotency of duplicate member insertion
        db.add_leaderboard_member(id1, "puuid-faker").expect("re-add faker idempotent");

        db.add_leaderboard_member(id2, "puuid-member-a").expect("add member a");

        let leaderboards = db.list_leaderboards().expect("list leaderboards");
        assert_eq!(leaderboards.len(), 2);

        assert_eq!(leaderboards[0].0, id1);
        assert_eq!(leaderboards[0].1, "LCK Pro Track");
        assert_eq!(leaderboards[0].2, vec!["puuid-faker", "puuid-chovy"]);

        assert_eq!(leaderboards[1].0, id2);
        assert_eq!(leaderboards[1].1, "Flex Squad");
        assert_eq!(leaderboards[1].2, vec!["puuid-member-a"]);
    }

    #[test]
    fn test_champion_build_cache_roundtrip() {
        let db = BaronDatabase::open_in_memory().expect("failed to open in-memory db");

        let patch = "14.10";
        let champ_id = 103; // Ahri
        let role = "MIDDLE";
        let vs_champ = 517; // Sylas
        let build_json = r#"{"items":[6653,3020,3089],"runes":{"keystone":"Electrocute"}}"#;

        assert_eq!(
            db.get_champion_build(patch, champ_id, role, vs_champ).unwrap(),
            None
        );

        db.cache_champion_build(patch, champ_id, role, vs_champ, build_json, 1715800000)
            .expect("cache champion build");

        assert_eq!(
            db.get_champion_build(patch, champ_id, role, vs_champ).unwrap().as_deref(),
            Some(build_json)
        );
    }

    #[test]
    fn test_foreign_key_enforcement() {
        let db = BaronDatabase::open_in_memory().expect("failed to open in-memory db");

        let snap_orphan = LpSnapshot {
            puuid: "non-existent-puuid".to_string(),
            queue_type: "RANKED_SOLO_5x5".to_string(),
            tier: "IRON".to_string(),
            division: "IV".to_string(),
            lp: 0,
            wins: 0,
            losses: 1,
            match_id: None,
            recorded_at: 1710000000,
        };

        // Should fail due to FOREIGN KEY(puuid) REFERENCES accounts(puuid)
        let res = db.insert_lp_snapshot(&snap_orphan);
        assert!(res.is_err(), "Expected foreign key violation error");
    }

    #[test]
    fn test_open_path_persistence() {
        let temp_dir = std::env::temp_dir().join(format!("baron_test_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let db_file = temp_dir.join("test_baron.db");

        {
            let db = BaronDatabase::open_path(&db_file).expect("open path db");
            let acc = Account {
                puuid: "persist-puuid-1".to_string(),
                summoner_id: Some(42),
                game_name: "PersistenceTest".to_string(),
                tag_line: "TEST".to_string(),
                platform_route: "euw1".to_string(),
                profile_icon_id: 1,
                summoner_level: 50,
                is_local_account: true,
                updated_at: 123456,
            };
            db.upsert_account(&acc).expect("upsert account");
        }

        // Re-open from disk and verify data persisted across database handles
        {
            let db_reopened = BaronDatabase::open_path(&db_file).expect("reopen path db");
            let accounts = db_reopened.list_accounts().expect("list accounts");
            assert_eq!(accounts.len(), 1);
            assert_eq!(accounts[0].puuid, "persist-puuid-1");
            assert_eq!(accounts[0].game_name, "PersistenceTest");
        }

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
