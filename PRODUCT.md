# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Pure native Rust desktop application built with `gpui-kit` (`0.9.1`, `gpui` + `gpui-component` + `gpui-base`) and `anomalyco/rune` (`rune-kit`) semantic design token and component patterns. Strictly zero JavaScript, TypeScript, HTML, CSS, Electron, Tauri, or WebView2.

## Users
Competitive League of Legends players (Solo/Duo, Flex, ARAM, Arena) who want instant pre-game draft intelligence, live high-elo match spectating, deep post-game timeline analytics, meta tier lists, and skin collection tracking without ad-heavy browser tabs or subscription paywalls.

## Product Purpose
Baron (`Baron`) is a 100% free, zero-ad, zero-subscription, local-first desktop companion and deep analytics platform for League of Legends replacing bloated or paywalled apps (`DPM.LOL`, `OP.GG`, `U.GG`, `Blitz.gg`).

## Positioning
Every feature that competitors lock behind monthly "Plus/Premium" subscriptions—live 5v5 draft win probability, team composition radar charts, pro build feeds, post-game Baron Score (0–100) with MVP/ACE badges, @14m lane differentials, and full RP skin collection valuation—is computed locally in native Rust and unlocked 100% free.

## Operating Context
Runs alongside the League of Legends Client (`LCU` lockfile + `127.0.0.1:2999` Live Client Data API) in a dark gaming environment (`1280x820+` desktop window), using `rusqlite` (`baron.db`) for local persistence and a 6-provider fallback pipeline (`LoLalytics`, `Meraki CDN`, `U.GG`, `OP.GG`, `DPM.lol`, `MetaSRC`).

## Capabilities and Constraints
- Application & window title must be verbatim `Baron` (`Baron: <ChampionName>` for LCU rune pages, `baron.db` for SQLite).
- Strictly compliant with Riot Games' Fair Play policies (no enemy cooldown timers, no Fog of War tracking, no lobby deanonymization).
- All verification, linting, testing, and NSIS installer packaging run on GitHub-hosted Actions runners (never run local `cargo` builds).

## Brand Commitments
- **Visual Authority:** Matches the **DPM APP v1.8.1** desktop interface across all views (`Dashboard`, `Tierlist & Builds`, `Leaderboards`, `Spectate`, `Collections`, `Data Studio / Matchups`, `Champ Select`, and `Post-game`), built with `gpui-kit` components and `anomalyco/rune` (`rune-kit`) semantic layering (`Palette`, `SegmentedControl`, `Badge`, `Card`, `Table`).
- **Obsidian Dark Palette:** Deep matte `#090B10` canvas, `#0F1219` sidebar, `#131722` card surfaces, `#1A2030` raised layers, `#1E2536` `1px` borders, `#6366F1` periwinkle accent, `#3B82F6` Victory Blue, `#F43F5E` Defeat Rose, `#F59E0B` S+/MVP Gold, and `#A855F7` S/ACE Purple.

## Evidence on Hand
- Reference screenshots of DPM APP v1.8.1 (`Champ Select`, `Spectate`, `Post-game`, `Tierlist`, `Collection`).
- `crates/baron-core`, `crates/baron-db`, `crates/baron-lcu`, `crates/baron-riot`, and `crates/baron-app`.

## Product Principles
1. **Desktop Pro-Tool Density:** High-signal tabular numerals, visual rune trees, proportional damage bars, and circular score rings without wasted hero banners or marketing fluff.
2. **Zero Paywalls, Zero Ads:** Every analytics tab, draft recommendation, and skin valuation is open by default.
3. **Instant Visual Scanning:** Color-coded tier typography (`S+`, `S`, `A`, `B`, `C`), champion/item medallions, and role badges let players read a draft or scoreboard in under two seconds.
