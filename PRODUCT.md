# Product

<!-- impeccable:product-schema 1 -->

## Platform

desktop (Tauri v2 native host with static Next.js frontend and 100% Rust core crates)

## Stack

- **Desktop Host & IPC (`src-tauri/`, crate `baron-app`):** Tauri v2 using OS native WebView (`Edge WebView2` on Windows, `WKWebView` on macOS) with zero bundled Chromium, Electron, or Overwolf.
- **Frontend UI (`frontend/`):** Next.js `16.4.6+` (`output: 'export'`, strict TypeScript), Tailwind CSS `4.3.5+`, `@shadcn/ui` primitives, Motion layout primitives, Bun package management, and VoidZero `oxlint`.
- **Native Rust Backend (`crates/`):**
  - `baron-core`: Domain models, Baron Score (`0–100`), MVP/ACE scoring, timeline differential math.
  - `baron-db`: Local SQLite persistence (`baron.db` via `rusqlite`).
  - `baron-lcu`: League Client (`LCU` lockfile / REST / WS), `Baron: <ChampionName>` rune page payload builder, Live Client Data (`127.0.0.1:2999`).
  - `baron-riot`: Data Dragon (`16.22.1`) / CommunityDragon URLs and verified OP.GG MCP tier-list client. Unverified third-party providers remain explicitly disabled until real integrations are implemented.

## Users

Competitive League of Legends players (Solo/Duo, Flex, ARAM, Arena) seeking fast pre-game draft clarity, post-game scoreboard & `@14:00` differential breakdowns, live OP.GG lane tier lists, and local-first inventory views without ads or subscriptions.

## Product Purpose

Baron (`Baron`) is a 100% free, zero-ad, zero-subscription, local-first desktop companion and analytics tool for League of Legends replacing bloated or paywalled apps (`OP.GG`, `Blitz.gg`, `U.GG`, `DPM.lol`).

## Operating Context & Honesty Boundaries

- Runs alongside the League of Legends Client inside a compact `1440×900`+ desktop frame featuring dark obsidian and high-legibility light slate themes, collapsible sidebar rail (`204px ↔ 58px`), and Windows/macOS system tray minimize-on-close support.
- **Strict Honesty:** Only `OP.GG` is active and selectable in the provider switcher; unverified providers (`U.GG`, `DPM.LOL`, `LoLalytics`, `MetaSRC`, `Meraki CDN`) stay disabled (`Unavailable`). All runtime views (`Dashboard`, `Tierlist & Builds`, `Leaderboards`, `Spectate`, `Collections`, `Champ Select`, `Post-game`) render live local LCU data and/or live OP.GG MCP feeds with zero mock or sample datasets — showing honest empty/offline states when the League Client or desktop IPC host is unavailable.
- **Riot Games Fair Play:** Zero automated enemy ultimate or summoner cooldown tracking, zero Fog-of-War camp timers, zero Ranked lobby anonymity bypasses, and zero in-game input macros.
- **Tooling & CI:** Frontend tooling is Bun + VoidZero `oxlint` exclusively; all Rust compilation, linting (`clippy`, `rustfmt`), testing, and installer packaging execute on GitHub-hosted Actions runners (no local `cargo` builds or `target/` directories).
