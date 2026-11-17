# Baron — Design System (`DESIGN.md`)

> Obsidian desktop pro-tool aesthetic grounded in **DPM APP v1.8.1** density and an inset collapsible workbench shell, built with **Next.js 16.4**, **Tailwind CSS 4**, `@shadcn/ui` primitives, `@react-bits`, and Motion layout transitions inside a native **Tauri v2** window (`Edge WebView2` / `WKWebView`).

---

## 1. Semantic Token Architecture (`frontend/src/app/globals.css`)

| Token Variable | Dark Mode | Light Mode | Role |
| :--- | :--- | :--- | :--- |
| `--baron-chrome` | `#080A10` | `#E9EEF5` | Outer shell frame behind header & collapsible sidebar |
| `--baron-inset` | `#0D111A` | `#F7F9FC` | Primary rounded workspace inset (`rounded-tl-[14px]`) |
| `--baron-surface` | `#111622` | `#FFFFFF` | Hero header strip, table rows, popovers, skin cards |
| `--baron-elevated` | `#171E2E` | `#EDF1F8` | Control tracks, active keycaps, filter pills, expanded lens |
| `--baron-hover` | `#1D263A` | `#E2E8F3` | Hover wash on navigation items & ledger rows |
| `--baron-border` | `#1F283D` | `#D2DAE8` | Standard hairline separators (`1px`) |
| `--baron-border-strong` | `#2D3A57` | `#B4C2D8` | Focusable borders, active pill borders, avatar outlines |
| `--baron-ink` | `#F5F7FC` | `#0B1220` | Primary headings, player names, tabular numerals |
| `--baron-ink-secondary` | `#98A6BE` | `#435066` | Secondary metrics, CS/min, sidebar labels |
| `--baron-ink-muted` | `#65748E` | `#64748B` | Section headers, timestamps, table column headers |
| `--baron-accent` | `#6366F1` | `#4F46E5` | Brand indigo accent, sliding tab pill, interactive trajectory stroke |
| `--baron-victory` | `#3B82F6` | `#2563EB` | Victory stripes, Blue side draft & damage fills |
| `--baron-defeat` | `#F43F5E` | `#E11D48` | Defeat stripes, Red side draft & damage fills, death counts |
| `--baron-emerald` | `#10B981` | `#059669` | Verified live provider indicator, positive `@14m` diffs, owned pills |
| `--baron-gold` | `#F59E0B` | `#D97706` | `S+` / `OP` tier typography, `MVP` badge, Precision keystones |
| `--baron-ace` | `#A855F7` | `#9333EA` | `S` / `1` tier typography, `ACE` badge, Mythic gem |
| `--baron-cyan` | `#38BDF8` | `#0284C7` | Challenger LP accents, `ScoreRing`, Epic gem |

All numeric statistics (`KDA`, `CS/min`, `LP`, win rates, pick rates, games) use `tabular-nums` (`tnum`). System UI typography (`Segoe UI Variable Text` / `-apple-system`) avoids generic web-font dependencies and honors `prefers-reduced-motion`.

---

## 2. Desktop Inset Shell & Collapsible Navigation

1. **Integrated Frameless Title Bar & Command Header (`44px`, `decorations: false`):**
   - Left: Baron mascot logo (`assets/logo/baron_logo.png`), `BARON` brand mark, **Sidebar Collapse Toggle (`Ctrl+B`)**, and working `<` / `>` / `↻` view navigation controls.
   - Center: Draggable chrome spacers (`data-tauri-drag-region`) flanking the `Ctrl+K` Command Palette (`CommandDialog` + `@shadcn/kbd`) for instant route jumps, sidebar toggling, and dark/light switching.
   - Right: Interactive **Patch & Sample Window** popover, **API Provider Mode Dropdown (`OP.GG` enabled; unverified sources explicitly disabled & greyed out)**, 3-state theme toggle (`Light` / `Dark` / `System`, synced via Tauri `setTheme`), honest **LCU Status** pill, Data Studio gear shortcut, and custom desktop window controls (`Minimize`, `Maximize/Restore`, `Close`) inside the Tauri host.
2. **Collapsible Left Sidebar (`204px ↔ 58px` rail):**
   - Persistent `localStorage` state synced via `useSyncExternalStore` + `Ctrl+B` keybinding.
   - Left active/hover edge bar (`@react-bits/LineSidebar` pattern) with collapsed-rail `@shadcn/tooltip` labels and pinned profile footer.
3. **8 Workbench Views (`rounded-tl-[14px]` inset canvas):**
   - `Dashboard`: Feathered Ahri splash Hero (`SpotlightCard`), interactive Bezier LP Trajectory curve, `ScoreRing`, flush 5-column KPI strip, Match History ledger with `2x3` item grids and clickable `@14:00` lane differential drawers, plus `16.22 Meta Pulse` and regional sample ladder. All illustrative data is visibly labeled as sample data.
   - `Tierlist & Builds`: Live `OP.GG` MCP lane feed via `baron-riot`, `AnimatedTabs` lane switcher, `@shadcn/skeleton` loading rows, sortable `@shadcn/table`, OP.GG attribution, and explicit error/empty states without faking live feeds outside the desktop host.
   - `Leaderboards`: Regional Challenger sample table (`EUW` / `KR` / `NA`) with `@shadcn/table` and filter input.
   - `Spectate`, `Collections`, `Data Studio`, `Champ Select`, and `Post-game`: Unified flush workspace density, verified `16.22.1` Data Dragon splash posters (`SKIN_POSTERS`), fixed-aspect radar (`viewBox="-28 -10 236 180"`), 10-player DPM scoreboard with average damage tick marks, and Riot Fair Play compliance.
