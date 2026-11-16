# Baron — Agent Engineering Rules (`AGENTS.md`)

> **Note:** `CLAUDE.md` is symlinked directly to this file. Always update `AGENTS.md`; never edit `CLAUDE.md` independently.

---

## 1. Project Identity & Core Mandate
- **Application Title:** **`Baron`** (used verbatim in the desktop window title bar, navigation header, local SQLite file `baron.db`, and injected LCU rune pages `Baron: <ChampionName>`).
- **Mission:** A 100% free, zero-ad, zero-subscription, local-first desktop companion and deep analytics platform for League of Legends replacing bloated or paywalled apps (OP.GG, Blitz.gg, U.GG, DPM.lol).

## 2. Technology Architecture (Tauri v2 + Next.js Frontend + 100% Rust Backend)
- **Desktop Host & IPC (`src-tauri/`, crate `baron-app`):**
  - **Tauri v2** (`tauri = "2"`, `@tauri-apps/api = "2.12.4"`) using the OS native system WebView (`Edge WebView2` on Windows, `WKWebView` on macOS) — zero bundled Chromium, zero Electron, zero Overwolf, and zero Node.js server at runtime.
- **Frontend UI & Styling (`frontend/`):**
  - **Framework:** **Next.js `16.4.6+`** (`output: 'export'`, `images: { unoptimized: true }`, React 19, strictly TypeScript) compiling to pure static `frontend/out/` assets.
  - **Styling:** **Tailwind CSS `4.3.5+`** (`@tailwindcss/postcss`, Oxide engine) with CSS-first `@theme` design tokens in `frontend/src/app/globals.css`.
  - **Component Registries & MCP:** Use the shared [`components.json`](components.json) registry and **`shadcn` MCP server** (`@shadcn`, `@react-bits`, `@aceternity`, `@magicui` across Antigravity, Claude Code, and OpenCode, plus `21st.dev` CLI & `lucide-react`) to inspect and install UI components cleanly via `bunx shadcn@latest add ...`.
  - **Exclusive Package Manager & VoidZero Tooling:** Use **Bun** (`bun install`, `bun run`, `bunx`, `bun.lock`) and **VoidZero `Oxc`** (`oxlint` `1.93.0+`) exclusively for all frontend dependencies, builds, and linting. **STRICTLY FORBIDDEN:** NEVER use `npm`, `pnpm`, `yarn`, `package-lock.json`, `pnpm-lock.yaml`, or slow ESLint plugin chains.
- **100% Native Rust Backend Crates (Unchanged):**
  - **League Client & Live Game (`baron-lcu`):** `irelia` (`0.11.2+`) and local `lockfile` / `https://127.0.0.1:2999/liveclientdata/*` clients.
  - **Riot Web API & Meta Providers (`baron-riot`):** `riven` (`2.81+`), Data Dragon (`ddragon.leagueoflegends.com`), CommunityDragon (`raw.communitydragon.org`), and the 6-provider pipeline (`OP.GG` #1 direct JSON API → `U.GG` #2 fallback → `DPM.LOL` → `LoLalytics` → `MetaSRC` → `Meraki CDN`).
  - **Local Storage (`baron-db`):** `rusqlite` (`0.32+`, `bundled`) storing immutable match summaries, `Match-V5` timelines, LP snapshots, multi-account registries, cached builds, and custom leaderboards in `baron.db`.

## 3. UI/UX & DPM v1.8.1 Design System
Follow [**docs/spec/spec.md**](docs/spec/spec.md), [**DESIGN.md**](DESIGN.md), and [**docs/spec/ui-ux-design.md**](docs/spec/ui-ux-design.md):
- **Desktop Pro-Tool Shell (DPM APP v1.8.1 Aesthetic):**
  1. Left Grouped Sidebar (`204px`): Baron mascot logo ([assets/logo/baron_logo.png](assets/logo/baron_logo.png)), `BARON CORE` (`Dashboard`, `Tierlist & Builds`, `Leaderboards`), `BARON APP` (`Spectate`, `Collections`), `BARON INSIGHTS` (`Data Studio`), `IN GAME` (`✦ Champ Select`, `⚔ Post-game`), and bottom pinned Summoner Profile card.
  2. Top Command Bar (`44px`): Back/Forward/Refresh, `Ctrl+K` global search bar, interactive **Patch (`16.22`..`16.10`) & Period (`7d`/`14d`/`30d`)** popover, **API Provider Mode dropdown** (`OP.GG` / `U.GG` / etc.), and Live LCU status pill.
  3. Main Workspace: 8 hardware-accelerated views loading real Data Dragon & CommunityDragon images (`16.22.1`).
- **3-Layer Progressive Disclosure:** Keep top-level cards/rows glanceable (4–5 data groups max), push deep timelines (`@14m` lane diffs, gold curves, 6-axis radar charts) into drawers/tabs, and keep scaling breakdowns in tooltips.
- **Obsidian Dark Palette & Tabular Numerals:** Canvas `#090B10`, Sidebar `#0B0E14`, Surface `#11151F`, Elevated `#161B28`, Border `#1E2536`, Accent `#6366F1`, Victory Blue `#3B82F6`, Defeat Rose `#F43F5E`, Positive Emerald `#10B981`, MVP/`S+` Gold `#F59E0B`, ACE/`S` Purple `#A855F7`, Challenger Cyan `#38BDF8`. Enforce `tabular-nums` (`tnum`) on KDA, CS/min, LP deltas, and scores.

## 4. Riot Games Fair Play & Legal Boundaries
- Strictly comply with Riot Games' Third-Party Application Policies:
  - **NEVER** track enemy ultimate or summoner spell cooldowns automatically, track jungle camps through Fog of War, or automate in-game mouse/keyboard inputs.
  - **NEVER** bypass Ranked Champ Select lobby anonymity (only inspect data legitimately exposed by the official LCU session endpoint).
  - Keep user Riot API keys local and out of git history.

## 5. Workspace Layout & Engineering Standards
```text
baron/
├── components.json             # Shared shadcn / @react-bits / @aceternity MCP registry config
├── assets/logo/                # Transparent Baron mascot PNG & multi-size Windows ICO
├── installer/baron.nsi         # NSIS Windows installer (Title: "Baron", Icon: baron.ico)
├── frontend/                   # Next.js 16.4.6 (strict TS) + Tailwind CSS 4.3.5 + Bun + VoidZero (Oxlint) UI
├── src-tauri/                  # Tauri v2 desktop host crate (baron-app; Window title: "Baron")
└── crates/
    ├── baron-core/             # Domain models, Baron Score (0-100) + MVP/ACE engine, Match-V5 timeline math
    ├── baron-db/               # SQLite schema migrations & local cache repository (baron.db)
    ├── baron-lcu/              # Zero-key LCU lockfile/REST/WS, auto-runes/items, Live Client (2999), Skin Vault
    └── baron-riot/             # DDragon 16.22 / CDragon URLs, Riot Web API & OP.GG/U.GG fallback providers
```
- **Verification & GitHub-Hosted CI/CD (Strict No-Local-Cargo-Build Rule):**
  - **NEVER** run `cargo test`, `cargo build`, `cargo check`, or `cargo run` locally — local Cargo builds (`target/`) consume excessive disk storage and RAM. Never leave a local `target/` directory in the workspace.
  - Frontend linting (`bun run lint` via VoidZero `oxlint --deny-warnings`), typechecking (`bun run typecheck`), static export (`bun run build`), and all Rust checks (`cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo check`, `cargo test --workspace`) and release packaging run on GitHub-hosted Actions runners:
    - [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — CI testing & linting on pushes (`main`, `dev`, `feat/**`, `fix/**`) and PRs.
    - [`.github/workflows/pre-release.yml`](.github/workflows/pre-release.yml) — Automated dev pre-release builds on `dev` pushes, `v*-dev*`/`v*-alpha*`/`v*-beta*`/`v*-rc*` tags, or manual dispatch.
    - [`.github/workflows/release.yml`](.github/workflows/release.yml) — Official stable release builds on semver tags (`vX.Y.Z`) or manual dispatch.
- **Ponytail Anti-Bloat & Component Reuse Discipline:**
  - Keep code minimal, flat, and free of unrequested abstractions or boilerplate. Follow the Ponytail ladder: YAGNI → reuse `shadcn`/`@react-bits`/`@aceternity` registry primitives & `baron-core` helpers → `std` → existing workspace deps → minimal working code.
  - Mark deliberate simplifications with `// ponytail: <ceiling and upgrade path>`.
- **Documentation References:** Consult [docs/spec/spec.md](docs/spec/spec.md), [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), [docs/spec/prd.md](docs/spec/prd.md), [docs/spec/api-data-sources.md](docs/spec/api-data-sources.md), [docs/spec/architecture-gpui.md](docs/spec/architecture-gpui.md), and [docs/spec/ui-ux-design.md](docs/spec/ui-ux-design.md) before altering architecture or UI flows.
