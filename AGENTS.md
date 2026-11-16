# Baron — Agent Engineering Rules (`AGENTS.md`)

> **Note:** `CLAUDE.md` is symlinked directly to this file. Always update `AGENTS.md`; never edit `CLAUDE.md` independently.

---

## 1. Project Identity & Core Mandate
- **Application Title:** **`Baron`** (used verbatim in the desktop window title bar, navigation header, local SQLite file `baron.db`, and injected LCU rune pages `Baron: <ChampionName>`).
- **Mission:** A 100% free, zero-ad, zero-subscription, local-first desktop companion and deep analytics platform for League of Legends replacing bloated or paywalled apps (OP.GG, Blitz.gg, U.GG, DPM.lol).

## 2. Strict Technology Constraints (Zero JS / TS / Web Frameworks)
- **100% Pure Native Rust:**
  - **GUI & Components:** `gpui-kit` (`0.9.1+`), which provides pure-Rust `gpui`, `gpui_kit::component` (`gpui-component`), `gpui_kit::base` (`gpui-base`), and `gpui_kit::assets`.
  - **Strictly Forbidden:** NEVER bundle or add JavaScript, TypeScript, HTML, CSS, Node.js, Electron, Tauri, WebView2, CEF, `gpui-shell`, or any DOM/browser runtime. Every UI pixel must be GPU-rendered natively in Rust via `gpui-kit`.
- **League Client & Live Game:** `irelia` (`0.11.2+`) and local `lockfile` / `https://127.0.0.1:2999/liveclientdata/*` clients.
- **Riot Web API & Assets:** `riven` (`2.81+`), Data Dragon (`ddragon.leagueoflegends.com`), and CommunityDragon (`raw.communitydragon.org`).
- **Local Storage:** `rusqlite` (`0.32+`, `bundled`) storing immutable match summaries, `Match-V5` timelines, LP snapshots, multi-account registries, cached builds, and custom leaderboards in `baron.db`.

## 3. UI/UX & Anti-Clutter Rules
Follow [**docs/spec/ui-ux-design.md**](docs/spec/ui-ux-design.md):
- **3-Zone Desktop Shell:**
  1. `64px` Left Navigation Rail (`Home`, `Live Draft`, `DPM Lens`, `Tier List`, `Leaderboards`, `Skin Vault`, `Settings`)
  2. `48px` Top Command Bar (Riot ID search, Region badge, Patch badge, Live LCU Status Pill)
  3. Main Workspace (`DockArea` / View Router)
- **3-Layer Progressive Disclosure:** Keep top-level cards/rows glanceable (4–5 data groups max), push deep timelines (`@14m` lane diffs, `AreaChart` gold curves, `RadarChart` combat profiles) into expandable drawers/split panels, and keep formula/scaling details in hover tooltips.
- **Obsidian Dark Palette:** Canvas `#090B10`, Card Surface `#11151F`, Elevated Surface `#171C29`, `1px` Subtle Border `#1E2536`, Victory Blue `#3B82F6`, Defeat Rose `#F43F5E`, Positive Emerald `#10B981`, MVP Gold `#F59E0B`, ACE Purple `#A855F7`.
- **Tabular Numerals:** Use aligned numeric formatting for KDA, CS/min, Gold diffs, LP deltas, and scores.

## 4. Riot Games Fair Play & Legal Boundaries
- Strictly comply with Riot Games' Third-Party Application Policies:
  - **NEVER** track enemy ultimate or summoner spell cooldowns automatically, track jungle camps through Fog of War, or automate in-game mouse/keyboard inputs.
  - **NEVER** bypass Ranked Champ Select lobby anonymity (only inspect data legitimately exposed by the official LCU session endpoint).
  - Keep user Riot API keys local and out of git history.

## 5. Workspace Layout & Engineering Standards
```text
crates/
├── baron-core/   # Domain models, Baron Score (0-100) + MVP/ACE engine, Match-V5 timeline math
├── baron-db/     # SQLite schema migrations & local cache repository (baron.db)
├── baron-lcu/    # Zero-key LCU lockfile/REST/WS, auto-runes/items, Live Client (127.0.0.1:2999), Skin Vault
├── baron-riot/   # Data Dragon / CommunityDragon URLs & Riot Web API (Match-V5 / Account-V1 / League-V4)
└── baron-app/    # Pure native Rust desktop app built with gpui-kit (Window title: "Baron")
```
- **Verification Before Completion:** Always run `cargo test --workspace` and `cargo check --workspace` after edits and verify exact passing output before committing or reporting success.
- **Documentation References:** Consult [docs/spec/prd.md](docs/spec/prd.md), [docs/spec/api-data-sources.md](docs/spec/api-data-sources.md), [docs/spec/architecture-gpui.md](docs/spec/architecture-gpui.md), and [docs/spec/ui-ux-design.md](docs/spec/ui-ux-design.md) before altering architecture or UI flows.
