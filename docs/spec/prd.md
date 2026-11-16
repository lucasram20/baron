# Baron — Product Requirements Document (PRD)

> **Application Title:** Baron  
> **Category:** Pure Native Desktop League of Legends Analytics, Draft Assistant & Post-Game Lens  
> **Tech Stack:** 100% Native Rust, **GPUI Kit (`gpui-kit`: `gpui` + `gpui-component` + `gpui-base` + `gpui-assets`)**, `irelia` (LCU + Live Client), `riven` (Riot Web API), SQLite (`rusqlite`)  
> **Zero-Web Mandate:** Strictly ZERO JavaScript, ZERO TypeScript, ZERO HTML/CSS/WebView/Electron/Tauri — 100% native GPU-accelerated Rust via `gpui-kit`  
> **Target OS:** Windows (Primary — League Client Host), macOS  
> **License / Model:** 100% Free, Local-First, Zero Ads, Zero Subscriptions, Zero Telemetry

---

## 1. Executive Summary & Problem Statement

Modern League of Legends companion apps and stats platforms (**OP.GG**, **Blitz.gg**, **U.GG**, **Porofessor**, **Mobalytics**, **DPM.lol**) suffer from three severe problems:

1. **Aggressive Paywalls on Public/Local Data:** Platforms like **DPM.lol** lock essential features behind recurring monthly subscriptions ($5–$10+/mo), including:
   - Draft Assistant & Matchup Build Adjustments
   - Deep Post-Game Analytics ("DPM Lens" timeline metrics, lane diffs, efficiency scores)
   - LP Tracking Over Time
   - Multi-Account Linking & Custom Leaderboards (>1 leaderboard)
   - Skin Collection Valuation
   - 1-Click Pro Spectating & Highlight Timeline Markers
2. **Adware & Resource Bloat:** Desktop companions built on **Electron** or **Overwolf** (Blitz.gg, OP.GG Desktop, U.GG Desktop, Porofessor) embed auto-playing video ad containers that consume **800 MB to 1.8 GB of RAM** and significant CPU/GPU cycles during active gameplay, causing frame drops in League of Legends.
3. **Privacy & Telemetry Tracking:** Commercial overlays continuously harvest local client state, hardware fingerprints, and behavioral telemetry to monetize user attention.

### The Core Insight
**Almost 100% of the data powering OP.GG, Blitz.gg, U.GG, and DPM.lol comes from free, official Riot Games APIs and community CDNs**—and the most responsive real-time features (Champ Select detection, Auto-Runes, Auto-Item Sets, Lobby Multi-Search, Skin Inventory, Live Game Events, and Local Match History) run **entirely on `127.0.0.1` inside the player's own machine** via the League Client Update (LCU) API and Live Client Data API **without even needing a Riot API key**.

### Product Vision
**Baron** is a ultra-fast, native GPU-accelerated desktop application written in **Rust** using **GPUI** (`gpui` + `gpui-component`). It delivers the clean, data-dense analytics aesthetic of **DPM.lol** combined with the real-time client automation of **Blitz.gg / U.GG** and the deep match lookup of **OP.GG**—consuming **<50 MB of RAM**, starting in **<100ms**, with **zero ads and zero subscriptions**.

---

## 2. Competitor Paywall Audit vs. Free Feasibility

Research via Exa MCP across DPM.lol, OP.GG, Blitz.gg, U.GG, and Riot Developer documentation confirms what is paywalled commercially versus how Baron implements it for free:

| Feature | Commercial App Status (DPM.lol / Blitz / OP.GG) | Can Baron Build It 100% Free? | Free Data Source / Mechanism |
| :--- | :--- | :--- | :--- |
| **Auto-Import Runes, Spells & Item Sets** | Ad-supported or Premium tier | **YES (100% Free, No Key)** | Local **LCU API** (`PUT /lol-perks/v1/pages`, `PATCH /lol-champ-select/v1/session/my-selection`, `/lol-item-sets/v1/...`) |
| **Live Champ Select & Draft Assistant** | **Paywalled** on DPM.lol Premium | **YES (100% Free, No Key)** | Local **LCU WebSocket** (`OnJsonApiEvent_lol-champ-select_v1_session`) + cached matchup matrix |
| **Lobby Multi-Search & Streak / Tilt Detection** | Ad-supported / Paywalled overlays | **YES (100% Free, No Key)** | Local **LCU API** (`/lol-champ-select/v1/session` + `/lol-match-history/v1/products/lol/{puuid}/matches`) |
| **DPM Lens (Deep Timeline Analytics)** | **Paywalled** on DPM.lol Premium | **YES (100% Free)** | Riot **`Match-V5`** + **`Match-V5 Timeline`** (1-min frames: Gold/XP/CS @ 10/14m, DPM, DMG/Gold, Vision, Roam paths) |
| **LP Tracking Over Time** | **Paywalled** on DPM.lol Premium | **YES (100% Free, No Key)** | Local **LCU API** (`/lol-ranked/v1/current-ranked-stats`) or **`League-V4`** persisted to local SQLite after each game |
| **Multi-Account Switcher & Combined Stats** | **Paywalled** on DPM.lol Premium | **YES (100% Free)** | Local SQLite profile registry (`PUUID` list) + auto-detection when logging into any account in League Client |
| **Skin Collection Value Calculator** | **Paywalled** on DPM.lol Premium | **YES (100% Free, No Key)** | Local **LCU API** (`/lol-champions/v1/inventories/{summonerId}/skins-minimal`) + **CommunityDragon** skin tier metadata |
| **Custom Friends / SoloQ Leaderboards** | **Paywalled** (>1 on DPM.lol) | **YES (100% Free)** | Unlimited local/exportable SQLite leaderboards refreshed via **`Account-V1` + `League-V4` + `Match-V5`** |
| **ARAM & Arena Augment Tiers** | **Paywalled** on DPM.lol Premium | **YES (100% Free, No Key)** | **CommunityDragon** Arena/ARAM data (`cherry-augments.json`) + cached community tier lists |
| **Live In-Game Objective Timers & Gold Lead** | **Paywalled** on DPM.lol Premium | **YES (100% Free, No Key)** | Local **Live Client Data API** (`https://127.0.0.1:2999/liveclientdata/eventdata` & `playerlist`) |
| **Replay Timeline Event Markers (Kills/Baron)** | **Paywalled** on DPM.lol Premium | **YES (100% Free, No Key)** | Local **Live Client API** event timestamps + **Replay API** (`127.0.0.1:2999/replay/*`) |
| **Global Meta Tier Lists & Matchup Builds** | Free with heavy ads | **YES (Hybrid Free)** | Cached patch build manifests from public community aggregators + **Data Dragon / CommunityDragon** |

---

## 3. Free Data Architecture & Constraints

### 3.1 Zero-Key Local APIs (Unlimited, Zero Rate Limit Bottlenecks)
1. **League Client Update (LCU) API (`irelia::rest::LcuClient` & `irelia::ws::LcuWebSocket`)**
   - **How it works:** When the League Client (`LeagueClientUx.exe`) runs, it spawns a local HTTPS + WebSocket server on `127.0.0.1:<random_port>` authenticated with a local password found in the process arguments or `lockfile`.
   - **What it gives us for free:**
     - Current logged-in summoner (`PUUID`, Summoner ID, Riot ID, Level, Profile Icon).
     - Live Ranked LP, Tier, Division, Wins/Losses, and Series progress (`/lol-ranked/v1/current-ranked-stats`).
     - Real-time state machine events (`None` → `Lobby` → `Matchmaking` → `ReadyCheck` → `ChampSelect` → `InProgress` → `PreEndOfGame` → `EndOfGame`).
     - Full Match History for the current player and any queried `PUUID` (`/lol-match-history/v1/products/lol/{puuid}/matches`) **without consuming Riot Web API quota**.
     - Full Read/Write access to Rune Pages (`/lol-perks/v1/pages`), Item Sets (`/lol-item-sets/v1/...`), and Champ Select Summoner Spells.
     - Owned Champions and Owned Skins (`/lol-champions/v1/inventories/{id}/skins-minimal`).

2. **Live Client Data API (`irelia::in_game::LiveClient`)**
   - **How it works:** While inside an active League of Legends match (`League of Legends.exe`), the game client exposes an unauthenticated local HTTPS endpoint at `https://127.0.0.1:2999/liveclientdata/`.
   - **What it gives us for free:**
     - `/allgamedata`: Active player stats (current gold, ability levels, full stat block, runes), all 10 players' items, KDA, CS, respawn timers, summoner spells, and a chronological list of game events (`ChampionKill`, `DragonKill`, `BaronKill`, `HeraldKill`, `TurretKilled`, `InhibKilled`, `Multikill`, `Ace`).

3. **Data Dragon (DDragon) & CommunityDragon (CDragon)**
   - **How it works:** Official Riot static CDN (`ddragon.leagueoflegends.com`) and community-extracted raw game files (`raw.communitydragon.org`).
   - **What it gives us for free:**
     - Champion square icons, loading slices, splash art, exact spell cooldowns, mana costs, AP/AD scaling ratios, item trees, rune icons, Arena augments, and skin rarity/RP pricing tables.

### 3.2 Riot Games Official Web API (`riven` crate)
For cross-region player lookups, custom leaderboards, and frame-by-frame post-game timelines (`Match-V5 Timeline` is richer than LCU's summary endpoint), Baron supports a **Personal / Development Riot API Key** (or user-supplied key in Settings):
- **Rate Limits (Free Personal/Dev Key):** `20 requests / 1 second` and `100 requests / 2 minutes` per region.
- **Why this is plenty for a single user / friend group:**
  - Fetching 1 match summary + 1 match timeline takes **2 requests**.
  - Once fetched, Baron stores the match and timeline permanently in **local SQLite (`baron.db`)**, so revisiting match history or computing cumulative stats costs **0 API requests**.
  - With `riven`'s built-in token-bucket rate limiter and SQLite caching, a player can inspect 50+ full deep-timeline matches every 2 minutes without ever hitting a 429 error.

### 3.3 Solving the "Global Meta Tier List" Problem for Free
- **Why you cannot crawl global stats yourself on a free key:** Computing global champion win rates from scratch (like U.GG or Lolalytics) requires crawling millions of matches per patch across all tiers, which demands a Riot Production API Key (`30,000 req / 10 min`).
- **How Baron solves this for free:**
  - Rather than crawling 10 million games locally, Baron includes a **Meta Build & Tier List Sync Service** that fetches pre-computed champion build JSON/data per patch from public community endpoints (just as open-source apps like `query-lol-desktop` and `ChampR` do) and caches the patch snapshot locally in SQLite.
  - This gives instant access to Primary/Alternative Rune builds, Core Item progressions, Skill orders, Counter-matchup shifts (e.g., swapping Armor boots/items vs AP lane opponents), and Role Tier Lists with zero Riot API quota consumption.

---

## 4. Product Modules & Functional Requirements

### Module 1: Dashboard, Profile & LP Tracker ("Home")
- **Auto-Linked Client Profile:** Automatically detects the active League Client account via LCU and displays Riot ID (`Name#TAG`), Rank Emblem, LP, Win/Loss, Winrate %, and Recent Form (last 20 games).
- **Multi-Account Switcher:** Automatically saves every account logged into on the PC (plus manually added `Name#TAG` accounts) and allows instant switching or combined "All Accounts" daily summary.
- **Session & Tilt Tracker:**
  - Tracks daily games played, net LP gain/loss, session duration, and current win/loss streak.
  - Displays personal winrate drop warnings on 3+ loss streaks ("Tilt Gate").
- **LP Progression Chart (`gpui_component::chart::AreaChart` / `LineChart`):**
  - Records a snapshot of Tier + Division + LP after every ranked game in SQLite and renders a smooth historical LP trajectory chart.

### Module 2: Live Draft & Champ Select Assistant ("Draft")
- **Automatic State Activation:** Subscribes to LCU WebSocket (`/lol-champ-select/v1/session`); switches or pops open the Draft panel the millisecond a lobby enters Champ Select.
- **1-Click & Auto Import:**
  - **Auto-Runes:** Writes Primary Tree, Secondary Tree, and 3 Stat Shards directly to an active rune page (`Baron: <ChampName>`).
  - **Auto-Spells:** Sets recommended Summoner Spells (respecting user's preferred Flash key `D` or `F`).
  - **Auto-Item Set:** Injects starter items, boots, core 3-item spike, and situational items directly into the in-game shop.
- **Matchup-Adjusted Builds:**
  - Detects when the enemy lane opponent locks in a champion and highlights matchup-specific adjustments (e.g., Mercury's Treads vs heavy CC/AP, early anti-heal, or alternative keystone).
- **Lobby Multi-Search & Scouting:**
  - Inspects visible allies (in Ranked/Normal/Clash) to display their main role, autofill status, recent win streak, top played champions, and KDA badges.

### Module 3: DPM Lens — Deep Post-Game & Timeline Analytics ("Match Lens")
Powered by `Match-V5` + `Match-V5 Timeline` (60-second frames + coordinate events):
- **Baron Score (0–100 Rating) & MVP/ACE Badges:** Transparent, open formula weighting Kill Participation, Damage/Gold ratio, Vision/min, Objective contribution, and Lane Phase diff @ 14m.
- **Lane Phase Head-to-Head (@10m & @14m):**
  - Exact `Gold Diff @14`, `XP Diff @14`, `CS Diff @14`, and Solo Kills against the direct lane opponent.
- **Interactive Timeline Charts (`AreaChart` / `LineChart`):**
  - Team Gold Advantage timeline with clickable icons for Dragon, Baron, Voidgrubs, Herald, and Ace events.
  - Individual Player Gold, XP, and CS curves across game time.
- **Combat & Efficiency Radar (`RadarChart`):**
  - 6-axis radar comparing player metrics against role averages: `DPM` (Damage/min), `GPM` (Gold/min), `CS/min`, `KP%` (Kill Participation), `Vision/min`, and `DMG/Gold Efficiency`.
- **Build & Skill Timeline:**
  - Exact timestamp of every item bought/sold/undone and level 1–18 skill point allocation.

### Module 4: Custom Leaderboards & Skin Vault ("Extras")
- **Unlimited Custom Leaderboards:**
  - Create custom groups (e.g., "Discord Squad", "SoloQ Race", "Smurf Accounts") with unlimited Riot IDs.
  - Sort by Rank/LP, 7-day LP gain, Winrate %, Average KDA, or Average DPM.
- **Skin Collection Value Calculator:**
  - Reads owned skins from LCU (`/lol-champions/v1/inventories/{id}/skins-minimal`), maps against CommunityDragon rarity tiers (Ultimate, Mythic, Exalted, Legendary, Epic, Legacy), and displays total collection RP value, owned % by champion, and rarity breakdown.

### Module 5: Live Game Companion ("Live")
- Polls `https://127.0.0.1:2999/liveclientdata/allgamedata` every 1–2 seconds during an active game.
- Logs real-time objective kills, multikills, and gold/item milestones so the post-game summary is ready the instant the Nexus explodes.

---

## 5. Technical Stack & GPUI UI Design

### 5.1 Core Crate Ecosystem (100% Native Rust — Zero JS/TS Web Frameworks)

> [!IMPORTANT]
> **Strict Zero-Web-Framework Constraint:** Baron is written in **100% pure Rust** with **zero JavaScript, zero TypeScript, zero HTML/CSS, and zero WebView/Electron/Tauri**. We use **`gpui-kit`** (which bundles compatible versions of `gpui`, `gpui_kit::component` [`gpui-component`], `gpui_kit::base` [`gpui-base`], `gpui_kit::assets`, and `gpui_kit::platform` in pure Rust without any JS/TS layer) so every pixel renders natively on the GPU with ~30–50 MB idle RAM.

| Layer | Crate / Library | Purpose |
| :--- | :--- | :--- |
| **GUI & Component Suite** | `gpui-kit` | Unified pure-Rust desktop framework re-exporting `gpui`, `gpui_kit::component` (`gpui-component`: `DockArea`, `DataTable`, `Table`, `AreaChart`, `LineChart`, `BarChart`, `RadarChart`, `Theme`), `gpui_kit::base` (`gpui-base`), and `gpui_kit::assets` |
| **LCU & Live Client** | `irelia` (`0.11+`) | Native Rust wrapper for LCU REST (`LcuClient`), LCU WebSocket (`LcuWebSocket`), and `in_game` (`LiveClient`) |
| **Riot Web API** | `riven` (`2.81+`) | Strongly-typed async Riot Games API client with built-in regional rate-limiting and retry logic |
| **Database** | `rusqlite` (bundled) | Zero-config local SQLite storage for matches, timelines, LP history, leaderboards, and cached builds |
| **Async & HTTP** | `tokio`, `reqwest`, `serde` | Async runtime, DDragon/CDragon asset downloader, JSON serialization |

### 5.2 GPUI Kit Window & Dock Architecture
Baron uses `gpui_kit::application()`, `gpui_kit::init(cx)`, `gpui_kit::open_window(...)` (which automatically wraps the workspace in `Root`), and `gpui_kit::component::dock::{DockArea, DockLayout}` with window title `"Baron"`:
- **Left Navigation Rail / Sidebar:** Quick switching between `Dashboard`, `Match Lens`, `Live Draft`, `Tier List`, `Leaderboards`, `Skin Vault`, and `Settings`, plus a live LCU connection indicator badge (`Connected: Name#TAG` / `Waiting for League Client`).
- **Top Command / Search Bar:** Instant Riot ID search (`Player#TAG` + Region selector) and quick action triggers.
- **Main Dockable Center Area:** Composable `DockLayout` supporting split views (e.g., keeping Live Draft on the left while scouting a player's Match History on the right).

---

## 6. Riot Games Fair Play & Legal Compliance

Baron strictly adheres to Riot Games' [Third-Party Application Policies](https://support-leagueoflegends.riotgames.com/hc/en-us/articles/225266848-Third-Party-Applications):
1. **No In-Game Unfair Advantage:** Baron does **not** track enemy ultimate or summoner spell cooldowns automatically, does **not** track jungle camps through Fog of War, and does **not** automate in-game mouse/keyboard inputs.
2. **Respecting Champ Select Anonymity:** In Ranked Solo/Duo Champ Select, Riot masks enemy and non-party summoner identities at the LCU level; Baron only displays information legitimately exposed by the official LCU session endpoint (never attempting memory reading or packet sniffing).
3. **API Key Security:** Personal Riot API keys are stored locally in the user's OS credential store / local config and never transmitted to third parties.

---

## 7. Phased Implementation Roadmap

### Phase 1: Foundation & LCU Zero-Key MVP
- Initialize Rust workspace with `gpui`, `gpui-component`, `irelia`, `rusqlite`, and `tokio`.
- Build **DDragon / CDragon Asset Manager** (auto-detect latest patch, cache champion/item/rune icons to local app data).
- Build **LCU Bridge** (auto-detect running League Client, display live Summoner Profile, Current Ranked LP, Local Match History list, and Skin Vault calculator).

### Phase 2: Live Champ Select & Auto-Importer
- Subscribe to LCU WebSocket (`lol-champ-select/v1/session`).
- Implement **1-Click & Auto Rune Importer**, **Auto Summoner Spells**, and **Auto Item Set Injector**.
- Add **Meta Build Provider** with local SQLite patch caching and matchup adjustment cards.

### Phase 3: DPM Lens (`Match-V5` + `Timeline` Analytics)
- Integrate `riven` with personal API key config and SQLite match/timeline caching.
- Build the **Match Lens** view with `AreaChart` (Gold/XP diff timeline), `RadarChart` (6-axis combat profile), Lane Head-to-Head @14m cards, and Baron Score calculation.

### Phase 4: LP Tracker, Multi-Account & Custom Leaderboards
- Automatic post-game LP snapshot recorder and historical `LineChart`.
- Multi-account switcher and Custom Friends Leaderboard (`DataTable`).
