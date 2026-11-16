# Baron — Rust + GPUI Kit (`gpui-kit`) Technical Architecture

> Companion specification to [prd.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/prd.md) detailing the 100% pure native Rust application architecture built with **`gpui-kit`** (`gpui` + `gpui-component` + `gpui-base` + `gpui-assets` — strictly zero JavaScript, zero TypeScript, zero web frameworks/WebViews).

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph UI["GPUI Native Desktop Layer (120fps GPU Accelerated)"]
        Root["gpui_component::Root Window"]
        Dock["DockArea / DockLayout Workspace"]
        Dash["Dashboard & LP Tracker View\n(AreaChart, StatCards)"]
        Draft["Live Champ Select View\n(Build Tabs, Matchup Shifts, Auto-Import)"]
        Lens["DPM Lens Match View\n(AreaChart Gold/XP, RadarChart, DataTable)"]
        Extras["Leaderboards & Skin Vault\n(DataTable, VirtualList)"]
        Root --> Dock
        Dock --> Dash
        Dock --> Draft
        Dock --> Lens
        Dock --> Extras
    end

    subgraph Core["Baron Core Services (Tokio Async Runtime)"]
        State["AppState & Event Bus (GPUI Entity / Async Channels)"]
        LCU["LCU Service (irelia::rest + irelia::ws)"]
        Live["Live Game Poller (irelia::in_game 127.0.0.1:2999)"]
        Riot["Riot Web API Service (riven + Token Bucket)"]
        Assets["Asset & Build Sync (DDragon / CDragon / Meta Builds)"]
    end

    subgraph Storage["Local Persistence Layer (Zero-Cloud)"]
        SQLite[("SQLite (baron.db)\nMatches, Timelines, LP Logs,\nAccounts, Leaderboards, Builds")]
        Disk[("Disk Asset Cache\nChampion/Item/Rune/Skin Icons")]
    end

    UI <--> State
    State <--> LCU
    State <--> Live
    State <--> Riot
    State <--> Assets
    LCU --> SQLite
    Riot --> SQLite
    Assets --> SQLite
    Assets --> Disk
```

---

## 2. `gpui-kit` Mapping (100% Pure Rust — Zero JS/TS)

Verified via Context7 against `/longbridge/gpui-kit` and `/websites/rs_gpui-component_gpui_component`:
- **Why `gpui-kit`:** Adding `gpui-kit` in `Cargo.toml` re-exports compatible versions of `gpui` (`use gpui_kit::*;`), `gpui_kit::component` (`gpui-component`), `gpui_kit::base` (`gpui-base` behavior primitives), `gpui_kit::assets` (built-in icon assets), and `gpui_kit::platform` in one cohesive pure-Rust package (with **zero JavaScript or TypeScript** involved).

### 2.1 Application Entry, Theme & Window Initialization (`Title: "Baron"`)
`gpui_kit::init(cx)` must be called first inside `gpui_kit::application().with_assets(gpui_kit::assets::Assets).run(...)` before opening the main `"Baron"` window via `gpui_kit::open_window(...)` (which automatically wraps the root view in `Root` for dialogs, sheets, notifications, tooltips, and menus):

```rust
use gpui_kit::*;
use gpui_kit::component::{Theme, ThemeMode, TitleBar};

fn main() {
    gpui_kit::application()
        .with_assets(gpui_kit::assets::Assets)
        .run(move |cx| {
            // 1. Initialize gpui-kit (registers component styles, actions, and base primitives)
            gpui_kit::init(cx);

            // 2. Lock into Baron Obsidian Dark Mode
            Theme::change(ThemeMode::Dark, None, cx);

            // 3. Configure window options with title "Baron"
            let options = WindowOptions {
                titlebar: Some(TitleBarOptions {
                    title: Some("Baron".into()),
                    ..Default::default()
                }),
                window_min_size: Some(size(px(1180.), px(760.))),
                ..TitleBar::window_options()
            };

            // 4. Open main window (gpui_kit::open_window automatically mounts `Root`)
            gpui_kit::open_window(options, cx, |window, cx| {
                cx.new(|cx| BaronWorkspace::new(window, cx))
            })
            .expect("Failed to open Baron main window");
        });
}
```

### 2.2 UI Component Mapping by Feature (`gpui_kit::component` & `gpui_kit::base`)

| Baron UI Surface | `gpui-kit` Module / Struct | Usage Details |
| :--- | :--- | :--- |
| **Main Workspace Shell** | `gpui_kit::component::dock::{DockArea, DockLayout, panel_handle}` | `DockLayout::h_split()` and `DockLayout::tabs()` for dockable Live Draft + Match Lens panels |
| **LP Progression & Gold Diff Curves** | `gpui_kit::component::chart::{AreaChart, LineChart}` | Renders historical LP progression and 1-minute `Match-V5 Timeline` Team/Player Gold & XP diffs |
| **6-Axis Player Performance Profile** | `gpui_kit::component::chart::RadarChart` | Compares player `DPM`, `GPM`, `CS/m`, `KP%`, `Vision/m`, `DMG/Gold` against role benchmarks (`.appear(false)` when inside scrollable lists) |
| **Damage Share & Objective Bars** | `gpui_kit::component::chart::BarChart`, `Progress` | Team damage distribution, Baron/Dragon control ratios |
| **Tier Lists, Scoreboards & Leaderboards** | `gpui_kit::component::table::{DataTable, TableState, TableDelegate, Column, ColumnSort, Table}` | `DataTable` + `TableDelegate` for virtualized, sortable Champion Tier Lists & Custom Leaderboards; `Table` for 5v5 post-game scoreboards |
| **Match History Feed** | `gpui_kit::component::list` / `VirtualList` | Smooth 120fps scrolling through hundreds of cached matches with expandable `Match Lens` drawers |
| **Riot ID Command Search (`Ctrl+K`)** | `gpui_kit::component::input`, `modal`, `popover` | Instant search bar for `GameName#TAG` across regions (`NA1`, `EUW1`, `KR`, `PH2`, `SG2`, etc.) |
| **Behavior Primitives & Icons** | `gpui_kit::base::*`, `gpui_kit::assets::Assets` | Headless interactive behaviors (`gpui-base`) and built-in vector icons |

---

## 3. Tokio <-> GPUI Async Bridge

Because `gpui` manages its own UI executor on the main thread while `irelia` (hyper/rustls/tungstenite) and `riven` (reqwest/tokio) run on a `tokio` runtime:
1. Baron spawns a dedicated background multi-threaded `tokio::runtime::Runtime` on startup.
2. Background services (`LcuService`, `LiveGameService`, `RiotApiService`, `AssetService`) run on Tokio and communicate with GPUI entities via `async_channel` (or `futures::channel::mpsc`).
3. Inside GPUI views, `cx.spawn(async move |this, cx| { ... })` awaits events from the channel and calls `this.update(cx, |view, cx| { ...; cx.notify(); })` to trigger instantaneous GPU re-renders.

---

## 4. Local SQLite Schema (`baron.db`)

```sql
-- Tracked Summoner Accounts (auto-detected from LCU + manually added)
CREATE TABLE accounts (
    puuid TEXT PRIMARY KEY,
    summoner_id INTEGER,
    game_name TEXT NOT NULL,
    tag_line TEXT NOT NULL,
    platform_route TEXT NOT NULL, -- e.g. 'NA1', 'EUW1', 'KR', 'PH2'
    profile_icon_id INTEGER,
    summoner_level INTEGER,
    is_local_account BOOLEAN DEFAULT 0,
    updated_at INTEGER NOT NULL
);

-- Historical Ranked LP Snapshots (powers the LP Tracker Chart)
CREATE TABLE lp_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puuid TEXT NOT NULL,
    queue_type TEXT NOT NULL, -- 'RANKED_SOLO_5x5', 'RANKED_FLEX_SR'
    tier TEXT NOT NULL,       -- 'IRON' .. 'CHALLENGER'
    division TEXT NOT NULL,   -- 'I', 'II', 'III', 'IV'
    lp INTEGER NOT NULL,
    wins INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    match_id TEXT,            -- optional link to the match that caused the LP change
    recorded_at INTEGER NOT NULL,
    FOREIGN KEY(puuid) REFERENCES accounts(puuid)
);

-- Immutable Match-V5 Summary Payloads
CREATE TABLE matches (
    match_id TEXT PRIMARY KEY,
    game_creation INTEGER NOT NULL,
    game_duration INTEGER NOT NULL,
    game_version TEXT NOT NULL,
    queue_id INTEGER NOT NULL,
    raw_json TEXT NOT NULL -- Zstd-compressed or raw Match-V5 JSON
);

-- Immutable Match-V5 Timeline Payloads (powers DPM Lens)
CREATE TABLE match_timelines (
    match_id TEXT PRIMARY KEY,
    raw_json TEXT NOT NULL, -- 60-second frames & coordinate events
    FOREIGN KEY(match_id) REFERENCES matches(match_id)
);

-- Indexed Participant Rows for Instant SQL Filtering & Champion Stats
CREATE TABLE match_participants (
    match_id TEXT NOT NULL,
    puuid TEXT NOT NULL,
    champion_id INTEGER NOT NULL,
    team_position TEXT NOT NULL, -- 'TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'
    win BOOLEAN NOT NULL,
    kills INTEGER NOT NULL,
    deaths INTEGER NOT NULL,
    assists INTEGER NOT NULL,
    dpm REAL NOT NULL,
    gpm REAL NOT NULL,
    cs_per_min REAL NOT NULL,
    vision_per_min REAL NOT NULL,
    gold_diff_14 INTEGER,
    xp_diff_14 INTEGER,
    cs_diff_14 INTEGER,
    baron_score REAL,
    PRIMARY KEY (match_id, puuid)
);

-- Custom Leaderboards (Unlimited Free Groups)
CREATE TABLE leaderboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE leaderboard_members (
    leaderboard_id INTEGER NOT NULL,
    puuid TEXT NOT NULL,
    PRIMARY KEY (leaderboard_id, puuid)
);

-- Cached Patch Meta Builds & Matchup Shifts
CREATE TABLE champion_builds (
    patch TEXT NOT NULL,
    champion_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    vs_champion_id INTEGER DEFAULT 0, -- 0 = general build, >0 = specific lane matchup
    build_json TEXT NOT NULL,         -- Runes, Spells, Skill Order, Item Blocks
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (patch, champion_id, role, vs_champion_id)
);
```

---

## 5. Proposed Workspace Crate Layout

```text
baron/
├── Cargo.toml
├── docs/
│   ├── README.md
│   └── spec/
│       ├── prd.md
│       ├── api-data-sources.md
│       └── architecture-gpui.md
└── crates/
    ├── baron-app/          # Binary crate: GPUI window, Root, DockLayout, Views (or Tauri v2 host)
    ├── baron-core/         # Domain models, Baron Score engine, DPM Lens timeline analyzer
    ├── baron-lcu/          # irelia LCU REST + WebSocket + LiveClient (127.0.0.1:2999) service
    ├── baron-riot/         # riven Riot Web API client + DDragon/CDragon/Meta build sync
    └── baron-db/           # rusqlite schema migrations, match/timeline cache, LP tracker queries
```

---

## 6. Tauri v2 Hybrid Architecture & Frontend Framework Research (Memory & Storage Optimization)

### 6.1 Why Pivot the UI Layer to `Tauri v2` While Keeping the 100% Rust Backend?
In `v0.1.0-dev.1` through `v0.1.0-dev.4`, we evaluated pure-Rust GPU UI toolkits (`gpui-kit` and `anomalyco/rune`). Because both ecosystems are still young, they exhibit practical limitations for a visual-asset-heavy League of Legends companion like **DPM APP v1.8.1**:
1. **Remote CDN Asset Streaming (`Data Dragon` & `CommunityDragon`):** Rendering hundreds of champion splash cards, circular rune medallions, 6-slot item grids, and skin posters requires concurrent HTTP/2 image fetching, disk caching, `object-fit: cover` cropping, and alpha-masking—all of which the OS native WebView handles in hardware with zero binary bloat.
2. **Smaller Disk Storage Footprint:** A compiled `gpui-kit` binary embeds its own WGPU/DirectX shaders and text-shaping engine (**~18–25 MB**). **Tauri v2** uses the OS's existing system WebView (`Edge WebView2` on Windows 10/11, `WKWebView` on macOS) and compiles to a **~3–6 MB** installer while keeping **`baron-core`**, **`baron-db`**, **`baron-lcu`**, and **`baron-riot` 100% in native Rust**.

```mermaid
flowchart LR
    subgraph Frontend["Lightweight Tauri v2 Frontend (SolidJS or Svelte 5)"]
        Views["DPM v1.8.1 Views\n(Champ Select, Spectate, Post-game,\nTierlist, Collections, Dashboard)"]
        CDN["Native Hardware Image Cache\n(Data Dragon & CommunityDragon)"]
    end

    subgraph RustBackend["100% Native Rust Backend (Unchanged Workspace Crates)"]
        TauriHost["Tauri v2 Core (#[tauri::command] & Events)"]
        BCore["baron-core\n(Baron Score, @14m Math)"]
        BDb["baron-db\n(rusqlite baron.db)"]
        BLcu["baron-lcu\n(LCU Lockfile & 127.0.0.1:2999)"]
        BRiot["baron-riot\n(OP.GG #1 / U.GG #2 / Riot API)"]
        TauriHost --> BCore
        TauriHost --> BDb
        TauriHost --> BLcu
        TauriHost --> BRiot
    end

    Views <-->|"Zero-Overhead Tauri v2 IPC"| TauriHost
```

---

### 6.2 Tauri v2 Frontend Framework Benchmark Matrix (`js-framework-benchmark` & Tauri v2 Profiling)

Because **Tauri v2** is completely framework-agnostic and only bundles the compiled static `dist/` assets (`HTML + CSS + JS`—`node_modules` is **never** shipped in the installer), choosing a **compiler-first, Virtual-DOM-free** framework directly minimizes both **RAM usage** and **disk storage**:

| Framework | Reactivity Architecture | Compiled Runtime Size *(Minified + Gzipped)* | Tauri v2 Idle / Active JS Heap RAM | GC Churn Under Live LCU / Game Polling | UI Component Ecosystem | Verdict for **Baron** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. SolidJS** *(Recommended #1 for Lowest RAM)* | **Fine-Grained Signals (`createSignal`, No VDOM)** | **~6.5 – 8 KB** | **~18 – 30 MB** *(Lowest & flattest memory curve)* | **Near-Zero** *(Components run **once**; signals update exact DOM nodes directly)* | `@kobalte/core`, `@ark-ui/solid`, Tailwind CSS v4 *(Note: `@opencode/ui` in `anomalyco/rune` is also built on SolidJS)* | **Best for ultra-low memory & real-time telemetry** |
| **2. Svelte 5 (Runes)** *(Recommended #1 Co-Winner for DX & Polish)* | **Compile-Time Runes (`$state`, `$derived`, No VDOM)** | **~4 – 10 KB** | **~20 – 34 MB** *(Extremely low)* | **Near-Zero** *(Compiles templates to surgical vanilla DOM mutations)* | `Bits UI`, `shadcn-svelte`, Tailwind CSS v4, Lucide Svelte | **Best balance of tiny bundle size, low RAM, and rich dark-mode UI primitives** |
| **3. Preact + Signals** | Lightweight VDOM + Signals | **~3.5 – 5 KB** | **~24 – 40 MB** | **Low** *(Small VDOM diffing cost on large table re-renders)* | Radix/React-compatible via `preact/compat` | Good lightweight fallback if React compatibility is required |
| **4. Vue 3.5+ / Vapor** | Proxy Signals (`alien-signals`) / Vapor Mode | **~25 – 45 KB** | **~28 – 48 MB** | **Low-Moderate** | `Reka UI` (`Radix Vue`), `shadcn-vue` | Heavier baseline runtime than SolidJS or Svelte 5 |
| **5. Leptos / Dioxus (WASM)** | Rust Fine-Grained Signals in WebAssembly | **~150 – 450 KB** *(WASM binary)* | **~22 – 38 MB** | **Low** *(Linear WASM memory + DOM bridge calls)* | Custom CSS / limited prebuilt headless primitives | Larger static bundle than Solid/Svelte; slower UI iteration |
| **6. React 19** | Virtual DOM + React Compiler | **~45 – 130+ KB** | **~45 – 80+ MB** *(Highest)* | **High** *(Frequent VDOM tree allocations during 15-row/10-player updates)* | `Radix UI`, `shadcn/ui` | **Avoid** — defeats the low-memory goal |

---

### 6.3 Final Recommendation for Baron (`Tauri v2` + `SolidJS` or `Svelte 5`)

To achieve the **DPM APP v1.8.1** visual quality while using the **least possible RAM and disk storage**:

1. **Top Pick A — `Tauri v2 + SolidJS + Tailwind CSS v4` (Absolute Lowest RAM & Zero Re-render Overhead):**
   - **Why it wins on Memory:** In `js-framework-benchmark`, **SolidJS** consistently records the lowest runtime memory allocation of any UI framework (within ~3% of raw vanilla JavaScript). Because Solid components execute **only once** on mount, streaming live Champ Select timer ticks or post-game damage bars never re-renders component trees or triggers garbage-collection spikes.
   - **Storage:** Total compiled frontend (`index.html` + `assets/*.js` + `assets/*.css`) is **< 35 KB gzipped**, keeping the entire `Baron-Setup-x86_64.exe` NSIS installer under **~4–6 MB**.
2. **Top Pick B — `Tauri v2 + Svelte 5 (Runes) + Tailwind CSS v4 + Bits UI / shadcn-svelte` (Tiny Footprint + Turnkey Dark-Mode Components):**
   - **Why it wins on UI Speed & Polish:** Svelte 5 compiles away the framework into direct DOM operations (`~4–10 KB` runtime, zero VDOM) while giving instant access to `shadcn-svelte` / `Bits UI` for the Patch/Period Popover (`16.22..16.10`), API Mode Dropdown (`OP.GG` / `U.GG`), Command Palette (`Ctrl+K`), and sortable tables.
3. **Zero Change to the Rust Backend Crates:**
   - `crates/baron-core` (Baron Score `0–100`, MVP/ACE badges, `@14m` lane diff math)
   - `crates/baron-db` (`rusqlite` local `baron.db` cache)
   - `crates/baron-lcu` (Zero-key LCU lockfile, auto-runes `Baron: <Champion>`, Live Client `127.0.0.1:2999`, Skin Vault)
   - `crates/baron-riot` (`OP.GG` #1 direct JSON API, `U.GG` #2 fallback, `LoLalytics`, `MetaSRC`, `Data Dragon`, `CommunityDragon`)
   all remain **100% native Rust** inside the Cargo workspace and are called directly via Tauri v2's zero-copy IPC (`#[tauri::command]`).
