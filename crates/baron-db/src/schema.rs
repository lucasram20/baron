use rusqlite::Connection;

/// Runs database migrations to set up the SQLite schema for Baron.
///
/// Ensures foreign key constraints are enabled and all required tables
/// exist with appropriate constraints and indices.
pub fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;

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
            PRIMARY KEY (leaderboard_id, puuid),
            FOREIGN KEY(leaderboard_id) REFERENCES leaderboards(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS champion_builds (
            patch TEXT NOT NULL,
            champion_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            vs_champion_id INTEGER NOT NULL DEFAULT 0,
            build_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (patch, champion_id, role, vs_champion_id)
        );",
    )?;

    Ok(())
}
