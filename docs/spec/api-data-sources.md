# Free League of Legends Data Sources & API Specification

> Companion specification to [prd.md](file:///C:/Users/manue/desktop/projects/baron/docs/spec/prd.md) detailing every free API, endpoint, authentication mechanism, and rate-limit strategy used by **Baron**.

---

## 1. Overview of the 5 Free Data Pillars

| Pillar | Auth Required? | Rate Limit | Primary Rust Crate | What It Powers |
| :--- | :--- | :--- | :--- | :--- |
| **1. League Client Update (LCU) API** | Local `lockfile` (Auto-discovered) | **Unlimited** (`127.0.0.1`) | `baron-lcu` (`lockfile` + REST/WS) | Auto-Runes, Auto-Spells, Auto-Items, Live Champ Select, Local Match History, Current LP, Skin Inventory |
| **2. Live Client Data API** | None (Local HTTPS) | **Unlimited** (`127.0.0.1:2999`) | `baron-lcu` (`live_game`) | Real-time active game events (Baron/Dragon/Kills), live scoreboard, gold/item tracking, replay timestamps |
| **3. Data Dragon & CommunityDragon** | None (Public CDN) | **Unlimited** (CDN cached locally) | `baron-riot` (`assets`) | Champion icons, splashes, exact spell ratios, items, runes, Arena augments, skin rarity & RP prices |
| **4. Riot Games Official Web API** | Free Personal/Dev Key (`RGAPI-...`) | `20 req/1s`, `100 req/2m` per region | `baron-riot` (`web_api`) | Cross-account search (`Account-V1`), frame-by-frame `Match-V5 Timeline` (DPM Lens), Custom Leaderboards (`League-V4`) |
| **5. Multi-Provider Fallback API & REA MCP** | None (Public JSON / User Browser) | Cached per patch in SQLite | `baron-riot` (`fallback`) | Fallback Meta Builds, Matchup Shifts & Tier Lists (`U.GG`, `OP.GG`, `DPM.lol`, `Meraki CDN`) when Riot API key is absent/rate-limited |

---

## 2. Pillar 1: League Client Update (LCU) Local API

When the Riot/League Client is running on the user's desktop, `LeagueClientUx.exe` opens a local HTTPS & WebSocket server on `https://127.0.0.1:<port>` with HTTP Basic Auth (`riot:<auth_token>`). The `irelia` crate automatically inspects the running process to extract the port and token without user configuration.

### Key LCU REST Endpoints Used by Baron
| Feature | HTTP Method & Endpoint | Notes |
| :--- | :--- | :--- |
| **Current Summoner Profile** | `GET /lol-summoner/v1/current-summoner` | Returns `puuid`, `summonerId`, `gameName`, `tagLine`, `summonerLevel`, `profileIconId` |
| **Current Ranked Stats & LP** | `GET /lol-ranked/v1/current-ranked-stats` | Returns Solo/Duo, Flex, and Arena tiers, divisions, LP, wins, losses, and series |
| **Any Player Ranked Stats** | `GET /lol-ranked/v1/ranked-stats/{puuid}` | Inspect ally/lobby ranked stats without using Riot Web API quota |
| **Local Match History** | `GET /lol-match-history/v1/products/lol/{puuid}/matches` | Supports `begIndex` & `endIndex`; fetches recent matches directly via the client |
| **Single Match Details (LCU)** | `GET /lol-match-history/v1/games/{gameId}` | Full post-game scoreboard, items, damage dealt, gold, vision score |
| **Champ Select Session** | `GET /lol-champ-select/v1/session` | Active bans, ally picks, assigned roles, enemy revealed picks, timer phase |
| **Set Summoner Spells** | `PATCH /lol-champ-select/v1/session/my-selection` | Body: `{"spell1Id": 4, "spell2Id": 14}` |
| **List Rune Pages** | `GET /lol-perks/v1/pages` | Lists user's rune pages and identifies editable slots |
| **Delete / Create Rune Page** | `DELETE /lol-perks/v1/pages/{id}` / `POST /lol-perks/v1/pages` | Injects optimal Primary + Secondary + Stat Shards (`selectedPerkIds`) |
| **Inject Custom Item Set** | `PUT /lol-item-sets/v1/item-sets/{summonerId}/sets` | Writes starter, boots, core, and situational item blocks directly into the in-game shop |
| **Owned Skins Inventory** | `GET /lol-champions/v1/inventories/{summonerId}/skins-minimal` | Lists every skin owned (`ownership.owned == true`) for the Skin Collection Value calculator |
| **Client Gameflow Phase** | `GET /lol-gameflow/v1/gameflow-phase` | `None`, `Lobby`, `Matchmaking`, `ReadyCheck`, `ChampSelect`, `InProgress`, `EndOfGame` |

### Key LCU WebSocket Subscriptions (`irelia::ws`)
- `OnJsonApiEvent_lol-gameflow_v1_gameflow-phase`: Triggers automatic view transitions (e.g., opening Draft Assistant on `ChampSelect` and recording LP delta on `EndOfGame`).
- `OnJsonApiEvent_lol-champ-select_v1_session`: Fires on every hover, ban, lock-in, or trade during champion select for zero-latency matchup build updates.

---

## 3. Pillar 2: Live Client Data API (`127.0.0.1:2999`)

During an active match (`InProgress`), the game client exposes local read-only endpoints over `https://127.0.0.1:2999`:

- `GET /liveclientdata/allgamedata`: Consolidated payload containing:
  - `activePlayer`: Current gold, level, ability levels (`Q/W/E/R`), full live combat stats (`attackDamage`, `abilityPower`, `armor`, `magicResist`, `abilityHaste`, `moveSpeed`, etc.), and active runes.
  - `allPlayers`: Array of all 10 players with `championName`, `team`, `position`, `level`, `scores` (`kills`, `deaths`, `assists`, `creepScore`, `wardScore`), `items`, `summonerSpells`, `isDead`, and `respawnTimer`.
  - `events`: Chronological list of in-game events (`GameStart`, `MinionsSpawning`, `FirstBlood`, `ChampionKill`, `Multikill`, `TurretKilled`, `InhibKilled`, `DragonKill`, `HeraldKill`, `HordeKill` [Voidgrubs], `BaronKill`, `Ace`, `GameEnd`) with exact `EventTime` in seconds.
- `POST /replay/render` & `GET /replay/playback`: Local Replay API when viewing `.rofl` replays, enabling 1-click jump to any kill, objective steal, or teamfight timestamp.

---

## 4. Pillar 3: Static Assets (Data Dragon & CommunityDragon)

1. **Data Dragon (`ddragon.leagueoflegends.com`)**
   - Latest version check: `https://ddragon.leagueoflegends.com/api/versions.json`
   - Champions: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/championFull.json`
   - Items: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/item.json`
   - Runes Reforged: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/runesReforged.json`
   - Summoner Spells: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/summoner.json`

2. **CommunityDragon (`raw.communitydragon.org`)**
   - Skins & Rarity Metadata (for Skin Collection Value Calculator):
     `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json`
   - Arena / ARAM Mayhem Augments:
     `https://raw.communitydragon.org/latest/cdragon/arena/en_us.json`
   - Detailed Champion Bin Data (exact spell ratios, missile speeds, internal scalings missing from DDragon):
     `https://raw.communitydragon.org/latest/game/data/characters/{champ}/{champ}.bin.json`

---

## 5. Pillar 4: Riot Games Official Web API (`riven`)

Used for features that go beyond the local client (e.g., minute-by-minute `Match-V5 Timeline` frames for DPM Lens, cross-region `RiotId` search, and refreshing Custom Friends Leaderboards):

### Key Endpoints
- `Account-V1`: `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` → resolves `PUUID`.
- `Summoner-V4`: `/lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}` → resolves profile icon & level.
- `League-V4`: `/lol/league/v4/entries/by-puuid/{encryptedPUUID}` → resolves current Tier, Rank, LP, Wins/Losses.
- `Match-V5`:
  - `/lol/match/v5/matches/by-puuid/{puuid}/ids` → list of match IDs.
  - `/lol/match/v5/matches/{matchId}` → full post-game stats, `challenges` object (`damagePerMinute`, `goldPerMinute`, `killParticipation`, `laneMinionsFirst10Minutes`, `soloKills`, `visionScorePerMinute`, `teamDamagePercentage`).
  - `/lol/match/v5/matches/{matchId}/timeline` → 60-second `participantFrames` (`totalGold`, `xp`, `minionsKilled`, `jungleMinionsKilled`, `position {x, y}`, `damageStats`) + granular events (`ITEM_PURCHASED`, `ITEM_UNDO`, `SKILL_LEVEL_UP`, `WARD_PLACED`, `WARD_KILL`, `CHAMPION_KILL` with `x,y` coordinates and `victimDamageReceived`).

### Rate-Limit Budget & Caching Strategy
- **Personal / Development Key Limits:** `20 requests / 1 sec` and `100 requests / 2 min` per region.
- **SQLite Immutable Cache:** Match summaries (`Match-V5`) and timelines (`Match-V5 Timeline`) are immutable once a game finishes. Baron stores every fetched `matchId` in SQLite (`matches` and `match_timelines` tables). Subsequent views of that match require **0 network requests**.
- **Lazy Timeline Fetching:** Match history lists are populated first via LCU API (0 Riot API requests) or cached `Match-V5` summaries; the `Timeline` endpoint is only called when opening the deep **DPM Lens** tab or background-indexing the user's own matches at a throttled `1 req / 2s`.

---

## 6. Pillar 5: Multi-Provider Fallback API (`U.GG`, `OP.GG`, `DPM.lol`, `Meraki CDN`) & REA MCP Discovery

When a user runs **Baron** without a Riot Web API key, exceeds personal key rate limits (`100 req / 2 min`), or needs pre-aggregated patch meta tier lists and matchup builds, Baron resolves data through a **3-Tier Resolution Chain**:

1. **Tier 1 — Local Zero-Key (Primary):** LCU API (`127.0.0.1:<port>`) + Live Client Data API (`127.0.0.1:2999`).
2. **Tier 2 — Official Riot Web API:** `Account-V1`, `League-V4`, `Match-V5` + `Match-V5 Timeline` (when user key is present).
3. **Tier 3 — Multi-Provider Fallback API (`baron-riot::fallback`):** Normalized adapter trying `U.GG` -> `OP.GG` -> `DPM.lol` -> `Meraki CDN` and caching patch results in `baron.db` (`champion_builds`).

### Passive Endpoint & Schema Discovery via REA MCP
Because external stats APIs periodically evolve JSON payload shapes across patches and seasons, maintainers can inspect shapes passively with **REA MCP** (without bypassing anti-bot/Cloudflare Turnstile challenges):
- Launch your visible desktop browser with `--remote-debugging-port=9222` and navigate normally to `u.gg`, `op.gg`, or `dpm.lol`.
- Run `list_browser_targets` (`cdp_endpoint: "http://127.0.0.1:9222"`) followed by `inspect_web_page` (`include_json_body_shapes: true`) or `inspect_web_network_capture` on an exported `.har` archive to inspect JSON endpoint paths and field shapes cleanly, then update `baron-riot::fallback` parsers accordingly.
