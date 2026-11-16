# Baron — UI/UX Architecture & Anti-Clutter Design Specification

> Companion specification to [prd.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/prd.md) and [architecture-gpui.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/architecture-gpui.md).  
> Defines the visual hierarchy, information density rules, layout patterns, and `gpui-component` composition for a **complete yet clutter-free** native desktop experience inspired by the strongest elements of **DPM.lol**, **U.GG**, and **OP.GG**.

---

## 1. REA MCP Inspection Notice & Evidence Ledger

When running `rea` MCP (`capture_browser_scenario` in headless Chrome launch mode at `1440x900`) against the live web origins:
- **`https://dpm.lol/`** (`ev_38d8582c71a960db8a59cf3013b5456603ba08a0baf67061d6ebe38a428505ad`): Blocked by a **Cloudflare Turnstile** ("Verify you are human") anti-bot gate (`Ray ID: a5af52e388a4bc3d`).
- **`https://u.gg/lol/tier-list`** (`ev_f875ffaa390225b6f8389bee45f74b7325fb1450d66013b3bccbf211fbe6b96d`): Blocked by a **Cloudflare Turnstile** ("Verify you are human") anti-bot gate (`Ray ID: a5af53542f8c56e6`).
- **`https://www.op.gg/`** (`ev_ba730b3ee51b01e0240758afac715030b9ffab922ca426ca60d887cdc4f051ff`): Blocked by an AWS **CloudFront `403 ERROR`** against headless browser traffic.

> [!NOTE]
> **Optional Passive Inspection Workflow:** Because automated tools must never solve or bypass anti-bot/CAPTCHA gates, if you ever want REA to passively inspect the live DOM (`list_browser_targets` + `inspect_web_page` / `capture_web_screenshot`), you can open those tabs in your own visible Chrome/Brave browser launched with `--remote-debugging-port=9222` after viewing them normally.

---

## 2. Dissecting the Reference Trio: What to Keep vs. What to Strip

Why do **OP.GG**, **U.GG**, and **Blitz.gg** feel cluttered while **DPM.lol** feels cleaner—and how do we combine all three without overwhelming the user?

| Reference | Best UX Patterns to Adopt in Baron | Clutter & Anti-Patterns to Eliminate |
| :--- | :--- | :--- |
| **DPM.lol** | - **High-contrast matte dark surfaces** (`#0B0D12` canvas, `#12151E` cards, subtle `1px` `#1E2330` borders)<br>- **Bento-grid Profile Summary** (Rank badge + LP sparkline + Top 3 Champs in one glanceable header row)<br>- **Single Metric Score Badge** ("DPM Score" / **Baron Score `0–100`** with `MVP` / `ACE` pills)<br>- **Clean Timeline Charts** with objective event pins | - Paywall lock badges & blurred "Upgrade to Premium" teasers scattered inside post-game tabs<br>- Promotional banners for pro leaderboards when inspecting personal matches |
| **U.GG** | - **ultra-scannable Build Card hierarchy**: Primary Rune Tree + Secondary Tree + 3 Stat Shards side-by-side with Core Item progression (`Starter` → `Boots` → `Core 3` → `4th/5th Options`)<br>- **1-Row Skill Priority Strip** (`Q > W > E` badges above a compact 1–18 level grid)<br>- **S+/S/A/B/C/D Tier Badges** with clear color coding | - Up to 40% of viewport width/height consumed by sticky video ad sidebars, top leaderboard banners, and inter-row sponsored banners<br>- Redundant "Pro Builds / Promo" widgets pushing Skill Order below the fold |
| **OP.GG** | - **Information-dense Match History Row**: Champion Avatar + Summoner Spells + Keystones, KDA + KDA Ratio + KP%, 6-slot Item grid + Trinket, and 10-player mini participant list in a single **`72px`-tall row**<br>- **Inline Expandable Match Drawer** with clean sub-tabs (`Scoreboard`, `Team Analysis`, `Build`, `Timeline`) | - Cluttered multi-bar top navigation (15+ links to otros games, esports, talk, skins, Duo finder)<br>- Visual noise from overlapping promotional tags ("OP Score", "streaks", "ad slots" between every 5 match rows) |

---

## 3. Core UX Principles for Baron ("Complete Yet Uncluttered")

To make Baron feel **complete** (every stat you ever need is 1 click away) yet **uncluttered** (never overwhelming the eye), we enforce four structural rules:

### Rule 1: 3-Layer Progressive Disclosure
Never dump 50 numbers onto a single screen. Every workflow in Baron is organized into **3 strict layers**:
1. **Layer 1 — Glanceable Summary (0 clicks):**
   - Maximum **4–5 data groups** per card or row.
   - Example (Match Row): `Win/Loss Accent Bar` | `Champ + Runes/Spells + Mode/Time` | `KDA + KP% + CS/m + Baron Score Pill` | `6 Items + Ward` | `10-Player Mini List`.
2. **Layer 2 — Contextual Drawer / Split Panel (1 click):**
   - Clicking any match row expands (or opens in the right dock split) the **Match Lens**, cleanly segmented into 4 focused tabs:
     - **`Overview`** (5v5 Scoreboard + Damage/Gold bars)
     - **`DPM Lens`** (Gold/XP/CS @14m Lane Head-to-Head + Team Gold Advantage `AreaChart` + 6-Axis `RadarChart`)
     - **`Builds & Skills`** (Item purchase timeline + Undo markers + 1–18 Skill grid)
     - **`Map & Events`** (Kill/Objective log + Replay timestamp jump buttons)
3. **Layer 3 — Deep Hover Tooltips (On demand):**
   - Exact AP/AD scaling ratios, per-rank cooldowns, item gold efficiency, and rune stat breakdowns live inside rich GPUI hover tooltips (`gpui_component::tooltip`), keeping the main canvas clean.

### Rule 2: Strict 3-Zone App Shell (No Nested Scrollbars or Multi-Header Bars)
Unlike websites that stack a utility bar, a brand header, a game switcher, a sub-nav, and a filter bar (eating 260px of vertical height), Baron uses a **Native Desktop 3-Zone Shell**:

```text
+-----------------------------------------------------------------------------------+
| [Baron]   [ Search Riot ID (Ctrl+K)...       [Region: PH2 v] ]   [LCU: Connected] | <- 48px Top Bar
+--------+--------------------------------------------------------------------------+
|        |  +--------------------------------------------------------------------+  |
|  [H]   |  |  BENTO HEADER: Profile Emblem | LP Chart (AreaChart) | Top 3 Champs|  |
|  Home  |  +--------------------------------------------------------------------+  |
|        |                                                                          |
|  [D]   |  +-----------------------+  +-----------------------------------------+  |
|  Draft |  | LEFT COLUMN (320px)   |  | MAIN FEED / DOCK PANEL (Flex 1)         |  |
|        |  |                       |  | [All] [Ranked Solo] [Flex] [ARAM]       |  |
|  [L]   |  | - Session Summary     |  | --------------------------------------- |  |
|  Lens  |  |   (Today: 4W 1L +64LP)|  | [W] Ahri   12/2/9  8.4 CS/m  [MVP 94]   |  |
|        |  | - Champion Pool       |  | [W] Sylas   9/4/11 7.8 CS/m  [82.1]     |  |
|  [T]   |  |   (Top 5 Played W/R)  |  | [L] Yone    4/6/5  7.1 CS/m  [ACE 76]   |  |
|  Tiers |  | - Recent Teammates    |  |   +-----------------------------------+ |  |
|        |  |                       |  |   | EXPANDED DPM LENS DRAWER          | |  |
|  [B]   |  +-----------------------+  |   | [Scoreboard] [DPM Lens] [Builds]  | |  |
|  Board |                             |   | Gold Diff @14: +1,420g | DPM: 892 | |  |
|        |                             |   +-----------------------------------+ |  |
|  [S]   |                             +-----------------------------------------+  |
|  Skins |                                                                          |
+--------+--------------------------------------------------------------------------+
  64px                                 Main Workspace
Nav Rail
```

- **Left Icon + Label Rail (`64px` collapsed / `180px` expanded):** Only 6 top-level destinations (`Home`, `Live Draft`, `DPM Lens`, `Tier List`, `Leaderboards`, `Skin Vault`) + `Settings` pinned at the bottom.
- **Top Command Header (`48px` height):** Global `Ctrl+K` Riot ID search input, Account Switcher pill, Patch version badge (`Patch 16.x`), and live **LCU Status Pill** (`🟢 Client Connected` / `⚪ In Lobby` / `🔵 In Champ Select`).
- **Main Workspace (`DockArea`):** Uses a clean `16px` outer padding, `12px` card gap, and a maximum of **2 columns** (`320px` context column + flexible main canvas).

---

## 4. Screen-by-Screen UX Blueprint

### 4.1 Screen 1: Summoner Profile & Match History ("Home")
Combines **DPM.lol's Bento Top Bar** with **OP.GG's compact Match Feed**:
1. **Top Bento Strip (3 Cards, fixed `160px` height):**
   - **Card 1 — Ranked Identity:**Summoner Icon, `Name#TAG`, Solo/Duo Emblem, Tier/Division, `LP`, Win/Loss & Winrate %, plus a subtle pill for Session Net LP (`Today: +58 LP`).
   - **Card 2 — LP Trajectory (`gpui_component::chart::AreaChart`):** Clean sparkline of the last 30 LP snapshots with a gradient fill (Emerald for positive trend, Indigo for steady).
   - **Card 3 — Recent Form (Last 20 Games):** Winrate donut, average KDA, average KP%, and 3 mini avatars of the highest-winrate played champions.
2. **Two-Column Body:**
   - **Left Column (`320px`):**
     - **Champion Performance Card:** Top 5 most-played champions with Games, Winrate %, KDA, and average CS/m.
     - **Session & Tilt Monitor:** Daily games count, current streak badge, and personal winrate delta.
   - **Right Column (`Flex 1` — `VirtualList`):**
     - Filter bar: Queue Tabs (`All`, `Solo/Duo`, `Flex`, `ARAM`, `Arena`) + Champion filter dropdown.
     - **Match Cards (`72px` height):** Left border color-coded (`4px` solid `#3B82F6` Victory Blue or `#EF4444` Defeat Red, with `#F59E0B` Gold accent for Remake). Clicking expands the inline **DPM Lens** tabs without leaving the page.

### 4.2 Screen 2: Live Draft & Champ Select Assistant ("Live Draft")
Combines **U.GG's clean Build Cards** with **query-lol / DPM.lol's Matchup Shifts**:
- **Header Strip:** Live phase indicator (`Ban Phase`, `Pick Phase`, `Finalization — 18s`) + 3 one-click/auto toggles (`[✓] Auto-Runes`, `[✓] Auto-Spells`, `[✓] Auto-Item Set`) and a manual **`Apply to Client`** button.
- **2-Column Layout (Zero Clutter):**
  - **Left Column — Runes & Skill Order:**
    - Build selector tabs: `Recommended (53.4% WR)` | `vs. <EnemyLaner> Matchup Shift` | `High OTP Build`.
    - Visual Rune Tree (active perks illuminated at 100% opacity, inactive dimmed to 25% opacity so the eye immediately reads the pattern).
    - 1-Row Skill Priority (`Q > E > W`) + compact 1–15 level pips.
  - **Right Column — Item Progression & Lobby Scouting:**
    - Horizontal flow cards: `Starter` → `Boots` → `Core 3 Items (with winrate & pickrate)` → `Situational 4th/5th Items` (with 1-line explanations like *"vs. Heavy AP Burst"*).
    - **Compact Ally/Lobby Table:** 5 rows showing your team's roles, recent winrate, main role indicator (flags autofilled teammates quietly with an amber pill), and top 3 champions.

### 4.3 Screen 3: DPM Lens — Deep Post-Game Breakdown ("Match Lens")
Inspired by **DPM.lol's signature analytics**, unlocked 100% free via `Match-V5 Timeline`:
- **Top Head-to-Head Bar (Lane Opponent Comparison):**
  - Side-by-side comparison of **You vs. Direct Lane Opponent** at **14:00**:
    - `Gold @14` (`+840g` green delta pill)
    - `XP @14` (`+410 XP`)
    - `CS @14` (`+14 CS`)
    - `Baron Score` (`91.4 MVP` vs `64.2`)
- **2x2 Visual Analytics Grid:**
  1. **Team Gold & XP Advantage (`AreaChart`):** Interactive 1-minute curve where positive values fill in Blue/Teal and negative values fill in Red/Rose, annotated with Dragon/Baron/Voidgrub markers.
  2. **6-Axis Combat Profile (`RadarChart`):** Overlays your performance polygon (`DPM`, `GPM`, `CS/m`, `KP%`, `Vision/m`, `DMG/Gold`) against the rank/role baseline polygon.
  3. **Damage & Gold Share (`BarChart`):** Side-by-side horizontal bars comparing each player's % of Team Damage vs. % of Team Gold (`DMG/Gold Efficiency`).
  4. **5v5 Unified Scoreboard (`Table`):** Clean tabular breakdown with sortable columns (`Baron Score`, `KDA`, `DPM`, `Damage Taken`, `Vision`, `CS`, `Final Build`).

---

## 5. Visual Design Tokens (GPUI Theme Palette)

Designed specifically for **Operate Mode** (long gaming sessions in dimly lit rooms, high numerical legibility, zero eye strain):

| Token Role | Hex / Value | Usage |
| :--- | :--- | :--- |
| **`bg.canvas`** | `#090B10` | Deep obsidian main window background |
| **`bg.surface`** | `#11151F` | Primary card & panel background |
| **`bg.elevated`** | `#171C29` | Hover state, active tab, and expanded drawer surface |
| **`border.subtle`** | `#1E2536` | `1px` crisp card dividers (replaces heavy drop shadows) |
| **`text.primary`** | `#F3F4F6` | Summoner names, primary numbers, KDA |
| **`text.secondary`** | `#9CA3AF` | Labels, timestamps, secondary stats (`CS/m`, `KP%`) |
| **`text.muted`** | `#6B7280` | Inactive tabs, table headers, subtle hints |
| **`accent.primary`** | `#6366F1` | Baron brand Indigo / active selection indicator |
| **`semantic.victory`** | `#3B82F6` (Surface: `#111D35`) | Match win row tint, positive team gold advantage |
| **`semantic.defeat`** | `#F43F5E` (Surface: `#2A121B`) | Match loss row tint, negative team gold advantage |
| **`semantic.positive`** | `#10B981` | Positive lane diff (`+Gold @14`), >52% Winrate, streak badge |
| **`semantic.warning`** | `#F59E0B` | **`MVP` Gold Badge**, S-Tier highlight, autofill warning |
| **`semantic.purple`** | `#A855F7` | **`ACE` Badge** (best player on losing team), S+ Tier, Baron buff |

### Typography & Numeric Discipline
- **UI Sans:** `Inter` or system native (`Segoe UI Variable Display` on Windows) for crisp headings and labels.
- **Tabular Numerals (`font-variant-numeric: tabular-nums` / Monospace fallback):** Every KDA, CS/min, Gold diff, LP delta, and timer uses fixed-width numeral alignment so columns in `gpui_component::table::Table` and match rows never jitter visually.
