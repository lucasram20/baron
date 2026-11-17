# Baron Changelog

All notable changes to **Baron** are documented in this single consolidated changelog file, ordered from newest to oldest following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v0.1.0-dev.11] — 2026-11-17

### Added
- **Live LCU Account Auto-Sync & Direct OP.GG Rune Import (`crates/baron-lcu`):** Added HTTPS League Client integration (`fetch_lcu_player_context`, `import_rune_page_to_lcu`, `fetch_lcu_owned_skins`) reading the logged-in League of Legends player's Riot ID (`gameName#tagLine`), region, summoner level, Solo/Duo & Flex standing, active Champ Select draft pick (preserving ranked lobby anonymity), and owned skin inventory automatically with zero app account login required.
- **Full OP.GG MCP Live Data Integration (`crates/baron-riot`, `src-tauri`):** Added a pure-Rust OP.GG TOON-to-JSON parser (`parse_toon_or_json`) and live IPC commands (`get_opgg_champion_analysis`, `get_opgg_summoner_overview`, `get_opgg_game_detail`, `get_opgg_leaderboard`, `get_opgg_discounted_skins`, `get_opgg_esports_results`, `get_opgg_matchup_guide`, `get_opgg_regions`) dynamically fetching OP.GG's supported server regions (`KR`, `BR`, `EUNE`, `EUW`, `LAN`, `LAS`, `NA`, `OCE`, `RU`, `TR`, `JP`, `TW`, `VN`, `ME`, `SEA`).
- **OP.GG-Style Champion Build View:** Clicking any champion row in `Tierlist & Builds` opens a full live build sheet with primary/secondary runes, stat shards, summoner spells, skill max priority & 15-level grid, starter/boots/core/late items, favorable/hard matchups, and 1-click **"Import Runes (`Baron: <Champion>`)"** directly into League Client `/lol-perks/v1/pages`.
- **System Tray Support:** Enabled Tauri `tray-icon` with `Show Baron`, `Hide to Tray`, and `Quit Baron` menu items plus minimize/hide-to-tray close interception on the main desktop window.

### Changed
- **Removed Mock Data:** Deleted `frontend/src/data/mockDpm.ts`, removed all sample profiles (`Hide on bush` / `Nyx`), sample tier rows, sample match ledgers, and hardcoded fallback rune IDs; gated `sample_dashboard_data()` and `sample_owned_skins()` behind `#[cfg(test)]` only.
- **Sidebar Polish & 21st.dev Icons:** Replaced sidebar route glyphs with MIT `Hugeicons` vector components (`frontend/src/components/icons/SidebarIcons.tsx`), removed the rotated square arrow diamond from collapsed sidebar tooltips (`showArrow={false}`), and connected the bottom-left account footer directly to the local LCU / OP.GG active summoner.

### Fixed
- **Windows Taskbar & NSIS Installer Icon Refresh:** Applied `win.set_icon(...)` at Tauri window setup, added Cargo rerun triggers for `src-tauri/icons/*`, closed stale background `Baron.exe` processes, removed cached `.lnk` shortcuts before recreation, and invoked `SHChangeNotify(0x08000000)` on NSIS install and uninstall.

## [v0.1.0-dev.10] — 2026-11-17

### Changed
- Integrated a unified frameless Tauri window title bar (`decorations: false`, `shadow: true`) directly into `TopCommandBar` matching Obsidian Dark and Daylight Slate chrome, eliminating the double OS header bar.
- Added draggable `data-tauri-drag-region` chrome spacers, Tauri `setTheme` synchronization, resize state tracking, and custom desktop window controls (`Minimize`, `Maximize/Restore`, `Close`) with `core:window` capability permissions.
- Fast-forwarded `dev-nightly` UI redesign and integrated window chrome changes onto `main`.

## [v0.1.0-dev.9] — 2026-11-17

### Changed
- Redesigned Baron's desktop shell and all 8 workbench views around a collapsible sidebar (`204px` to `58px` icon rail with `Ctrl+B` shortcut and tooltips), a full-width top command bar, and a rounded inset canvas supporting both Obsidian Dark and Daylight Slate themes.
- Rebuilt `Dashboard`, `Tierlist & Builds`, `Leaderboards`, `Spectate`, `Collections`, `Data Studio`, `Champ Select`, and `Post-game` with flush KPI strips, smooth Bezier LP trajectory scrubbing, `2x3` item grids, expandable `@14:00` lane differential drawers, shared `ScoreRing` and `AnimatedTabs` primitives, and restrained `SpotlightCard` accents.
- Re-added the `API: OP.GG` provider mode selector in the top command bar alongside Data Studio with `OP.GG` enabled for live tier lists and unverified providers visibly disabled and greyed out.
- Fixed skin poster URLs in `Collections` to verified Data Dragon `16.22.1` skin IDs, corrected `NumberTicker` theme contrast, widened `ChampSelectView` radar `viewBox` to eliminate label clipping, removed decorative `BorderBeam`/`HoverBorderGradient`/`MagicCard` components, and ensured web-preview LCU fallback status reports offline instead of faking live client state.
- Updated `DESIGN.md` and `PRODUCT.md` to reflect the Tauri v2 + Next.js static frontend + OP.GG MCP architecture and design tokens.

## [v0.1.0-dev.8] — 2026-11-16

### Changed
- Updated the Baron logo and matching frontend, installer, and desktop application icons.
- Updated the dashboard layout and command-bar styling, labeled dashboard data as sample data, and added a dashboard rendering check.
- Added frontend-specific Next.js agent guidance.

---

## [v0.1.0-dev.7] — 2026-11-16

### Added
- Connected the tier-list view to the official OP.GG MCP tier-list tool, with a session handshake, lane selection, error handling, and OP.GG attribution.
- Added provider response and transport tests, plus an opt-in hosted live OP.GG check.

### Changed
- Replaced the tier-list mock rows and hardcoded build dialog with live OP.GG data and explicit loading, empty, and error states. Patch, rank, region, and period filtering are not available for this feed.
- Disabled U.GG, DPM.LOL, LoLalytics, MetaSRC, and Meraki in provider selectors until verified integrations are available. Automatic failover and provider build data are not yet implemented.
- Rejected sample and unsupported tier-list and build payloads instead of presenting them as provider data. Other application views still contain sample data.
- Updated the README and agent guidance for the current Tauri architecture, live provider support, and remaining limitations.

---

## [v0.1.0-dev.6] — 2026-11-16

### Fixed
- Enabled default `custom-protocol` feature (`custom-protocol = ["tauri/custom-protocol"]`) in `src-tauri/Cargo.toml` and explicitly passed `--features custom-protocol` in `.github/workflows/pre-release.yml` and `.github/workflows/release.yml` so compiled Windows and macOS release binaries embed static Next.js assets (`frontend/out/`) instead of attempting to connect to `http://localhost:3000` (`ERR_CONNECTION_REFUSED`).
- Added explicit `"label": "main"` window identifier in `src-tauri/tauri.conf.json` matching `src-tauri/capabilities/default.json` permissions.
- Exported `isTauriRuntime()` and logged invocation warnings on `get_bootstrap_data` fallback in `frontend/src/lib/tauri.ts`.

---

## [v0.1.0-dev.5] — 2026-11-16

### Added
- **DPM APP v1.8.1 Full UI & Registry Components (`@shadcn`, `@react-bits`, `@aceternity`, `@magicui`):**
  - Migrated desktop host from GPUI (`crates/baron-app`) to **Tauri v2** (`src-tauri/`, crate `baron-app`) paired with a strictly TypeScript **Next.js 16.4.6** (`output: 'export'`), **Tailwind CSS 4.3.5**, **Bun**, and **VoidZero `oxlint`** frontend in `frontend/`.
  - Added **Cool-Black Dark**, **Cool-Slate Light**, and **System Default** theme switcher in `TopCommandBar` and `Data Studio & Preferences` (`frontend/src/lib/theme.tsx`, `frontend/src/app/globals.css`).
  - Added interactive `Ctrl+K` **Command Palette** (`@shadcn/command`), `@shadcn/select`, `@shadcn/tooltip`, `@shadcn/checkbox`, `@shadcn/progress`, `@shadcn/dialog`, `@magicui/magic-card`, `@magicui/border-beam`, `@magicui/number-ticker`, `@react-bits/SpotlightCard`, and `@aceternity/hover-border-gradient`.
  - Authored crisp SVG icon set in `frontend/src/components/icons/LolIcons.tsx` (Lane Role icons, Ranked Tier Crests, Team Objectives, Rarity Diamonds, Stat Shards).
  - Completed all views:
    - **Champ Select:** 5v5 draft board, 6-axis team composition radar, interactive build archetypes dynamically updating rune & shard highlights, Pro Builds, LCU rune payload injection (`Baron: <ChampionName>`), and item progression.
    - **Post-game:** Splash-faded match hero card, team objective badges & slashed ban icons, `ScoreRing`, `MVP`/`ACE` badges, proportional damage bars, full **Loadout** tab (item timeline + level 1–18 skill matrix + runes), **Details** `@14m` gold curve & lane differentials, and **Advanced** 10-player combat/vision comparison table.
    - **Tierlist & Builds:** Sortable columns, role SVG tabs, rank/region filters, `OFF-META` switch, and clickable Champion Build & Matchup quick modal.
    - **Spectate:** Live Challenger/Grandmaster game cards with Region, Team, and Sort filters.
    - **Collections:** Tier, Set (`Worlds`), Champion, and Availability sidebar filters, animated ownership RP progress banner, skin splash lightbox, and `2026`/`2025` year groupings.
    - **Dashboard, Leaderboards & Data Studio:** Multi-match history feed, regional leaderboard tabs (`EUW`/`KR`/`NA`), theme selector, and 6-provider inspection.
- Updated `.github/workflows/ci.yml`, `.github/workflows/pre-release.yml`, and `.github/workflows/release.yml` to build and verify the Bun + Next.js static export prior to Rust/Tauri compilation on Windows and macOS runners.
- Updated `AGENTS.md`, `docs/spec/spec.md`, `components.json`, and `frontend/components.json`.

### Verified
- Passed `oxlint --deny-warnings src`, `tsc --noEmit`, `next build`, `impeccable detect`, and both `windows-latest` and `macos-latest` GitHub Actions release builds.

---

## [v0.1.0-dev.4] — 2026-11-16

### Added
- Generated transparent Baron mascot PNG (`assets/logo/baron_logo.png`) and multi-resolution Windows ICO (`assets/logo/baron.ico`) wired into the desktop window header and NSIS installer.
- Hardened Cargo network retries and sparse registry configuration for macOS runners in GitHub Actions workflows.
- Added `docs/spec/spec.md` and Tauri v2 frontend framework memory & storage benchmark research.

---

## [v0.1.0-dev.3] — 2026-11-16

### Added
- **6-Provider Fallback Pipeline & Patch Controls (`baron-riot`, UI):**
  - Integrated interactive `Patch` (`16.22`..`16.10`) & `Period` (`7d` / `14d` / `30d`) selector popover and `API Provider Mode` dropdown (`OP.GG` #1 JSON API → `U.GG` #2 fallback → `DPM.LOL` → `LoLalytics` → `MetaSRC` → `Meraki CDN`).
  - Redesigned views after **DPM APP v1.8.1** layout with obsidian dark surface palette and tabular numerals.

---

## [v0.1.0-dev.2] — 2026-11-16

### Added
- Added `LoLalytics` and `MetaSRC` fallback endpoints and parsers in `baron-riot` using `REA MCP` passive discovery.

---

## [v0.1.0-dev.1] — 2026-11-16

### Added
- **Core Rust Workspace & Initial Desktop Release:**
  - `crates/baron-core`: Domain models, `Baron Score (0–100)` + `MVP`/`ACE` scoring engine, `@14m` laning differential & team gold curve math, combat radar metrics.
  - `crates/baron-db`: Local SQLite storage (`rusqlite`, `baron.db`) schema migrations and match/account repository.
  - `crates/baron-lcu`: Local League Client lockfile parser, REST/Live Client (`127.0.0.1:2999`) integration, `Baron: <ChampionName>` rune payload builder, and Skin Vault collection evaluator.
  - `crates/baron-riot`: Data Dragon (`16.22.1`), CommunityDragon URL builders, and Match-V5 parsers.
  - Windows NSIS installer (`installer/baron.nsi`) producing `Baron-Setup-<tag>-x86_64.exe`, plus GitHub Actions `ci.yml`, `pre-release.yml`, and `release.yml` workflows (upgraded to Node 24 actions).
  - Project specification documentation (`README.md`, `LICENSE`, `AGENTS.md`, `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `docs/spec/*`).
