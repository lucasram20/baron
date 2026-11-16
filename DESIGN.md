# Baron — Design System (`DESIGN.md`)

> Grounded in the **DPM APP v1.8.1** desktop visual language, implemented natively in Rust using **`gpui-kit`** (`https://gpui-kit.com/component/`) and **`anomalyco/rune` (`rune-kit`)** (`https://github.com/anomalyco/rune`) semantic token & component patterns.

---

## 1. Semantic Token Architecture (`rune-kit` + `gpui-kit`)

| Token Role | Hex | Usage |
| :--- | :--- | :--- |
| `page` / `BG_CANVAS` | `#090B10` | Deepest window backdrop behind main views |
| `bg_deep` / `BG_SIDEBAR` | `#0B0E14` | Left 210px navigation sidebar & top command bar |
| `bg_base` / `BG_SURFACE` | `#11151F` | Primary card, table, and panel container surface |
| `layer_01` / `BG_ELEVATED` | `#161B28` | Segmented control tracks, filter bars, inactive rune medallions |
| `layer_02` / `BG_HOVER` | `#1E2536` | Raised active segment pills, row hover states, item slots |
| `border_muted` | `#161C2A` | Subtle row dividers inside tables and scoreboards |
| `border_base` | `#1E2536` | Standard `1px` card and input border |
| `border_strong` | `#2E3852` | Active segment outline and highlighted `[YOU]` row border |
| `text_base` | `#F8FAFC` | Primary headings, player names, KDA numerals |
| `text_muted` | `#94A3B8` | Secondary labels, CS counts, timestamps |
| `text_faint` | `#64748B` | Sidebar section headers (`BARON CORE`, `IN GAME`), table headers |
| `ACCENT_PRIMARY` | `#6366F1` | Periwinkle/Indigo active pills, `Watch` buttons, Collection progress bar |
| `VICTORY_BLUE` | `#3B82F6` | Blue team win probability (`54%`), Victory text, Blue damage bars |
| `DEFEAT_RED` | `#F43F5E` | Red team win probability (`46%`), Defeat text, Red damage bars, death count |
| `TIER_S_PLUS` / `MVP_GOLD` | `#F59E0B` | `S+` tier typography, `MVP` badge, Precision keystone ring, Champ Select highlight |
| `TIER_S` / `ACE_PURPLE` | `#A855F7` | `S` tier typography, `ACE` badge, Mythic gem |
| `TIER_A` / `CHALLENGER_CYAN` | `#38BDF8` | `A` tier typography, Score ring (`75`), Challenger LP text |
| `TIER_B` / `POSITIVE_GREEN` | `#10B981` | `B` tier typography, positive winrate deltas (`+0.8%`), `+21 LP` pill |

---

## 2. Reusable `rune-kit` + `gpui-kit` Components (`crates/baron-app/src/rune_ui.rs`)

1. **`rune_segmented_control` (`anomalyco/rune` `SegmentedControl` pattern):**
   - `28px` height, `6px` border radius, `layer_01` background track, `1px` `border_base` outline.
   - Selected item sits on a raised `layer_02` / `ACCENT_PRIMARY` indicator with bold `text_base` ink.
   - Used for `All | Owned | Missing` (Collections), `Ranked | Aram | Arena | Duo` (Tierlist), and `Scoreboard | Loadout | Details | Advanced` (Post-game).
2. **`champ_portrait_tile` & `draft_vertical_card`:**
   - Uses `gpui_kit::component::avatar::Avatar` + deterministic champion color-graded backdrop, level badge overlay, role badge, and bold Tier overlay (`S+`, `S`, `A`, `B`, `C`).
3. **`rune_tree_medallion_grid`:**
   - Full 4-row Primary Rune Tree + 3-row Secondary Rune Tree + 3-row Stat Shard grid.
   - Active runes render at `100%` opacity with a `2px` glowing tree-colored ring (`#F59E0B` Precision, `#F43F5E` Domination, `#818CF8` Sorcery, `#10B981` Resolve, `#38BDF8` Inspiration); unselected runes in the same row render as `28%` opacity dark circular medallions so the player reads the exact spatial rune pattern instantly.
4. **`score_ring_badge`:**
   - `30px` circular ring medallion (`border_2` colored by score tier: `#F59E0B` for 85+, `#38BDF8` for 70+, `#94A3B8` for 55+, `#F97316` for <55) displaying the integer `0–100` Baron Score (`75`, `86`, `66`).
5. **`item_slot_grid`:**
   - Compact `2x3` or `1x6` grid of `24x24` rounded square item tiles with item ID color-coding and border highlights.
6. **`skin_poster_card`:**
   - `168px x 228px` vertical poster card with layered skin theme gradient, top-right rarity diamond gem (`Epic` cyan, `Legendary` crimson, `Mythic` purple, `Ultimate` gold), champion badge, and bottom dark gradient scrim with Skin Name and `1,350 RP` / `750 RP` / `Earned` subtitle.

---

## 3. Desktop Shell & 8 Views (Matching DPM APP v1.8.1)

1. **Left Sidebar (`210px` width):**
   - Brand header: Indigo `B` emblem + **`BARON`** + `APP V0.1.0`.
   - `BARON CORE`: `Dashboard` (with indented active summoner pill `Nyx#DPM`), `Tierlist & Builds`, `Leaderboards`.
   - `BARON APP`: `Spectate`, `Collections`.
   - `BARON INSIGHTS`: `Data Studio`, `Matchups`.
   - `IN GAME`: `✦ Champ Select` (gold active accent), `⚔ Post-game` (gold active accent).
   - Bottom pinned profile card: `[EUW]` / `[KR]` avatar with level `612` + `DPM #LOL` + `CHALLENGER`.
2. **Top Command Bar (`44px` height):**
   - `<` `>` `↻` navigation buttons | Centered `460px` search input (`Search a player, a champion, a team, a pro...`) with `Kbd` (`Ctrl` `K`) | Right status icons (`L` LCU connected pill, provider badge, Settings gear).
