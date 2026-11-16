# Baron Documentation

Welcome to the documentation for **Baron** — a 100% free, pure native Rust + GPUI desktop companion and deep analytics platform for League of Legends (replacing ad-heavy and subscription-gated tools like OP.GG, Blitz.gg, U.GG, and DPM.lol with zero bundled web frameworks).

## Specification Documents (`docs/spec/`)

1. [**Main Product Requirements Document (PRD)**](file:///C:/Users/manue/desktop/projects/baron/docs/spec/prd.md)
   - Executive summary, competitor paywall audit (DPM.lol, Blitz.gg, OP.GG, U.GG), free feasibility breakdown, strict zero-web-framework mandate, core product modules, Riot Fair Play compliance, and phased roadmap.
2. [**Free Data Sources & API Specification**](file:///C:/Users/manue/desktop/projects/baron/docs/spec/api-data-sources.md)
   - Detailed reference for the 4 free data pillars:
     1. **League Client Update (LCU) Local API** (`127.0.0.1`, lockfile auth, zero API key, unlimited rate limit)
     2. **Live Client Data API** (`https://127.0.0.1:2999/liveclientdata/*`, real-time active game telemetry)
     3. **Data Dragon & CommunityDragon** (static champion/item/rune/augment/skin rarity CDNs)
     4. **Riot Games Official Web API** (`Match-V5`, `Match-V5 Timeline`, `Account-V1`, `League-V4` with SQLite caching)
3. [**Rust + GPUI Component Technical Architecture**](file:///C:/Users/manue/desktop/projects/baron/docs/spec/architecture-gpui.md)
   - System architecture diagram, pure native `gpui` + `gpui-component` mapping (`TitleBar`, `Root`, `DockArea`, `DataTable`, `AreaChart`, `RadarChart`, `VirtualList`), Tokio-to-GPUI async bridge, SQLite schema (`baron.db`), and workspace crate structure.
4. [**UI/UX Architecture & Anti-Clutter Design Specification**](file:///C:/Users/manue/desktop/projects/baron/docs/spec/ui-ux-design.md)
   - Reference dissection of **DPM.lol**, **U.GG**, and **OP.GG** (what to adopt vs. what clutter to strip), 3-layer progressive disclosure rules, native 3-zone desktop shell, screen-by-screen wireframes, and dark-mode GPUI design tokens.
5. [**Implementation Plan**](file:///C:/Users/manue/desktop/projects/baron/docs/spec/implementation-plan.md)
   - Task-by-task TDD implementation plan for the **Baron** Cargo workspace (`baron-core`, `baron-db`, `baron-lcu`, `baron-riot`, `baron-app`).
