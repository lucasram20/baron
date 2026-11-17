import { AVAILABLE_PATCHES, AVAILABLE_PERIODS, LATEST_DDRAGON, LATEST_PATCH } from "@/lib/ddragon";

export function isProviderAvailable(id: string): boolean {
  return id === "opgg";
}

export interface ProviderMeta {
  id: string;
  label: string;
  roleTag: string;
  tierListUrl: string;
  sampleBuildUrl: string;
}

export interface LcuStatusDto {
  connected: boolean;
  baseUrl: string | null;
  port: number | null;
  message: string;
}

export interface LcuRunePagePayload {
  name: string;
  primaryStyleId: number;
  subStyleId: number;
  selectedPerkIds: number[];
  current: boolean;
}

export interface LcuRankedQueueDto {
  queueType: string;
  tier: string;
  division: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface LcuChampSelectContext {
  phase: string;
  assignedPosition: string;
  championId: number;
  spell1Id: number;
  spell2Id: number;
  enemyChampionIds: number[];
}

export interface LcuPlayerContext {
  connected: boolean;
  baseUrl: string | null;
  port: number | null;
  gameName: string;
  tagLine: string;
  summonerId: number;
  puuid: string;
  summonerLevel: number;
  profileIconId: number;
  region: string;
  opggRegion: string;
  soloRanked?: LcuRankedQueueDto | null;
  flexRanked?: LcuRankedQueueDto | null;
  champSelect?: LcuChampSelectContext | null;
}

export interface LcuRuneImportResult {
  imported: boolean;
  pageName: string;
  pageId: number | null;
  message: string;
}

export interface LcuOwnedSkinDto {
  skin_id: number;
  champion_name: string;
  name: string;
  is_base: boolean;
  owned: boolean;
  rarity: string;
}

export interface BaronBootstrapPayload {
  appTitle: string;
  latestPatch: string;
  ddragonVersion: string;
  patches: string[];
  periods: string[];
  providers: ProviderMeta[];
  lcuStatus: LcuStatusDto;
  lcuPlayer?: LcuPlayerContext | null;
}

export const DEFAULT_PROVIDERS: ProviderMeta[] = [
  {
    id: "opgg",
    label: "OP.GG",
    roleTag: "Primary #1",
    tierListUrl: "https://mcp-api.op.gg/mcp",
    sampleBuildUrl: "https://mcp-api.op.gg/mcp",
  },
  {
    id: "ugg",
    label: "U.GG",
    roleTag: "Unavailable",
    tierListUrl: `https://stats2.u.gg/lol/1.5/tier_list/${LATEST_PATCH}/ranked_solo_5x5.json`,
    sampleBuildUrl: `https://stats2.u.gg/lol/1.5/overview/${LATEST_PATCH}/ranked_solo_5x5/Ahri/1.5.0.json`,
  },
  {
    id: "dpmlol",
    label: "DPM.LOL",
    roleTag: "Unavailable",
    tierListUrl: `https://dpm.lol/api/v1/tier-list?patch=${LATEST_PATCH}`,
    sampleBuildUrl: `https://dpm.lol/api/v1/champions/Ahri/build?patch=${LATEST_PATCH}`,
  },
  {
    id: "lolalytics",
    label: "LoLalytics",
    roleTag: "Unavailable",
    tierListUrl: `https://a1.lolalytics.com/mega/?ep=tier&v=1&patch=${LATEST_PATCH}&tier=emerald_plus&queue=420&region=all`,
    sampleBuildUrl: `https://a1.lolalytics.com/mega/?ep=champion&v=1&patch=${LATEST_PATCH}&c=ahri&lane=middle&tier=emerald_plus&queue=420&region=all`,
  },
  {
    id: "metasrc",
    label: "MetaSRC",
    roleTag: "Unavailable",
    tierListUrl: `https://www.metasrc.com/lol/${LATEST_PATCH}/tier-list`,
    sampleBuildUrl: `https://www.metasrc.com/lol/${LATEST_PATCH}/build/ahri/middle`,
  },
  {
    id: "merakicdn",
    label: "Meraki CDN",
    roleTag: "Unavailable",
    tierListUrl: "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json",
    sampleBuildUrl: "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json",
  },
];

const FALLBACK_BOOTSTRAP: BaronBootstrapPayload = {
  appTitle: "Baron",
  latestPatch: LATEST_PATCH,
  ddragonVersion: LATEST_DDRAGON,
  patches: [...AVAILABLE_PATCHES],
  periods: [...AVAILABLE_PERIODS],
  providers: DEFAULT_PROVIDERS,
  lcuStatus: {
    connected: false,
    baseUrl: null,
    port: null,
    message: "LCU offline in preview. Launch Baron desktop app alongside League Client.",
  },
};

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("Live OP.GG data requires the Baron desktop app.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function fetchBootstrapData(patch?: string): Promise<BaronBootstrapPayload> {
  if (!isTauriRuntime()) {
    return FALLBACK_BOOTSTRAP;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<BaronBootstrapPayload>("get_bootstrap_data", { patch: patch ?? null });
  } catch (err) {
    console.warn("Tauri invoke(get_bootstrap_data) failed:", err);
    return FALLBACK_BOOTSTRAP;
  }
}

export type TierRole = "Top" | "Jungle" | "Middle" | "Bottom" | "Utility";

export interface ProviderTierEntry {
  rank: number;
  champion_name: string;
  role: TierRole;
  tier: string;
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
  matches_label: string;
}

export async function fetchProviderTierList(
  provider: string,
  role: TierRole,
): Promise<ProviderTierEntry[]> {
  return invokeTauri<ProviderTierEntry[]>("get_provider_tier_list", { provider, role });
}

export interface OpggItemOption {
  ids: number[];
  ids_names: string[];
  play: number;
  win: number;
  pick_rate: number;
}

export interface OpggCounterEntry {
  champion_id: number;
  champion_name: string;
  play: number;
  win: number;
  my_win_rate?: number;
  counter_win_rate?: number;
  win_rate?: number;
}

export interface OpggSynergyEntry {
  champion_name: string;
  position: string;
  synergy_champion_name: string;
  synergy_position: string;
  score: number;
  play: number;
  win: number;
  win_rate: number;
}

export interface OpggRuneOption {
  id: number;
  primary_page_id: number;
  primary_page_name: string;
  primary_rune_ids: number[];
  primary_rune_names: string[];
  secondary_page_id: number;
  secondary_page_name: string;
  secondary_rune_ids: number[];
  secondary_rune_names: string[];
  stat_mod_ids: number[];
  play: number;
  win: number;
  pick_rate: number;
}

export interface OpggSkillBuild {
  order: string[];
  play: number;
  win: number;
  pick_rate: number;
}

export interface OpggSkillMastery {
  ids: string[];
  play: number;
  win: number;
  pick_rate: number;
  builds?: OpggSkillBuild[];
}

export function asList<T>(val: T | T[] | null | undefined): T[] {
  if (val === null || val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

export interface OpggChampionAnalysis {
  champion: string;
  position: string;
  data: {
    damage_type?: string;
    summary?: {
      id?: number;
      average_stats?: {
        play?: number;
        win_rate?: number;
        pick_rate?: number;
        ban_rate?: number;
        kda?: number;
        tier?: number;
        rank?: number;
      };
    };
    strong_counters?: OpggCounterEntry[] | OpggCounterEntry;
    weak_counters?: OpggCounterEntry[] | OpggCounterEntry;
    synergies?: Record<string, OpggSynergyEntry[] | OpggSynergyEntry>;
    core_items?: OpggItemOption[] | OpggItemOption;
    boots?: OpggItemOption[] | OpggItemOption;
    starter_items?: OpggItemOption[] | OpggItemOption;
    fourth_items?: OpggItemOption[] | OpggItemOption;
    fifth_items?: OpggItemOption[] | OpggItemOption;
    sixth_items?: OpggItemOption[] | OpggItemOption;
    summoner_spells?:
      | { ids: number[]; play: number; win: number; pick_rate: number }[]
      | { ids: number[]; play: number; win: number; pick_rate: number };
    runes?: OpggRuneOption[] | OpggRuneOption;
    skills?: OpggSkillBuild[] | OpggSkillBuild;
    skill_masteries?: OpggSkillMastery[] | OpggSkillMastery;
    skill_combos?: { name: string; video_url?: string }[] | { name: string; video_url?: string };
  };
}

export async function fetchOpggChampionAnalysis(
  champion: string,
  role: TierRole,
): Promise<OpggChampionAnalysis> {
  return invokeTauri<OpggChampionAnalysis>("get_opgg_champion_analysis", { champion, role });
}

export interface OpggLeagueStat {
  game_type: string;
  tier_info?: {
    tier?: string;
    division?: number;
    lp?: number;
    level?: number;
    tier_image_url?: string;
  };
  win?: number;
  lose?: number;
  is_hot_streak?: boolean;
}

export interface OpggLpHistory {
  created_at: string;
  tier_info?: { tier?: string; division?: number; lp?: number };
  elo_point?: number;
}

export interface OpggMatchParticipant {
  is_target?: boolean;
  summoner?: {
    puuid?: string;
    game_name?: string;
    tagline?: string;
    profile_image_url?: string;
  };
  champion_id: number;
  champion_name: string;
  team_key: string;
  position: string;
  items: number[];
  items_names?: string[];
  rune?: {
    primary_page_id: number;
    primary_rune_id: number;
    secondary_page_id: number;
  };
  spells?: number[];
  stats?: {
    champion_level?: number;
    total_damage_dealt_to_champions?: number;
    total_damage_taken?: number;
    vision_wards_bought_in_game?: number;
    ward_place?: number;
    kill?: number;
    death?: number;
    assist?: number;
    minion_kill?: number;
    neutral_minion_kill?: number;
    gold_earned?: number;
    result?: string;
    op_score?: number;
    op_score_rank?: number;
  };
}

export interface OpggGameSummary {
  id: string;
  created_at: string;
  game_map?: string;
  game_type?: string;
  game_length_second?: number;
  average_tier_info?: { tier?: string; division?: number };
  participants?: OpggMatchParticipant[];
  teams?: {
    key: string;
    game_stat?: {
      is_win?: boolean;
      champion_kill?: number;
      tower_kill?: number;
      dragon_kill?: number;
      baron_kill?: number;
      rift_herald_kill?: number;
      horde_kill?: number;
      gold_earned?: number;
    };
    banned_champions_names?: string[];
    participants?: OpggMatchParticipant[];
  }[];
}

export interface OpggSummonerOverview {
  profile: {
    data?: {
      summoner?: {
        game_name?: string;
        tagline?: string;
        region?: string;
        level?: number;
        profile_image_url?: string;
        lp_histories?: OpggLpHistory[];
        league_stats?: OpggLeagueStat[];
        ladder_rank?: { rank?: number; total?: number };
        most_champions?: {
          champion_stats?: {
            id?: number;
            champion_name?: string;
            play?: number;
            win?: number;
            lose?: number;
            kill?: number;
            death?: number;
            assist?: number;
            minion_kill?: number;
            op_score?: number;
          }[];
        };
      };
    };
  };
  matches: {
    data?: {
      game_history?: OpggGameSummary[];
    };
  };
}

export async function fetchOpggSummonerOverview(
  gameName: string,
  tagLine: string,
  region: string,
): Promise<OpggSummonerOverview> {
  return invokeTauri<OpggSummonerOverview>("get_opgg_summoner_overview", {
    gameName,
    tagLine,
    region,
  });
}

export interface OpggGameDetailResponse {
  data?: {
    game_detail?: OpggGameSummary;
  };
}

export async function fetchOpggGameDetail(
  gameName: string,
  tagLine: string,
  region: string,
  gameId: string,
  createdAt: string,
): Promise<OpggGameDetailResponse> {
  return invokeTauri<OpggGameDetailResponse>("get_opgg_game_detail", {
    gameName,
    tagLine,
    region,
    gameId,
    createdAt,
  });
}

export interface OpggLeaderboardResponse {
  region?: string;
  champion?: string;
  leaderboard?: {
    rank: number;
    summoner?: {
      game_name?: string;
      tagline?: string;
      level?: number;
      profile_image_url?: string;
      league_stats?: OpggLeagueStat[];
    };
    most_champion_stat?: {
      play?: number;
      win?: number;
      lose?: number;
    };
  }[];
}

export async function fetchOpggLeaderboard(
  region: string,
  champion: string,
): Promise<OpggLeaderboardResponse> {
  return invokeTauri<OpggLeaderboardResponse>("get_opgg_leaderboard", { region, champion });
}

export interface OpggDiscountedSkinsResponse {
  data?: {
    champion_id: number;
    skin_id: number;
    currency: string;
    cost: number;
    discount_rate: number;
    started_at?: string;
    ended_at?: string;
    champion_key?: string;
    champion_name: string;
    skin_name: string;
  }[];
}

export async function fetchOpggDiscountedSkins(): Promise<OpggDiscountedSkinsResponse> {
  return invokeTauri<OpggDiscountedSkinsResponse>("get_opgg_discounted_skins");
}

export interface OpggEsportsMatch {
  id: number;
  name: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  scheduledAt?: string;
  numberOfGames?: number;
  league?: string;
  details?: string;
  homeTeam?: { name?: string; acronym?: string; image_url?: string };
  awayTeam?: { name?: string; acronym?: string; image_url?: string };
}

export async function fetchOpggEsportsResults(): Promise<OpggEsportsMatch[]> {
  return invokeTauri<OpggEsportsMatch[]>("get_opgg_esports_results");
}

export interface OpggMatchupGuide {
  summary?: { summary?: string };
  lane_strategy?: { lane_tips?: string[] };
  [key: string]: unknown;
}

export async function fetchOpggMatchupGuide(
  champion: string,
  opponent: string,
  role: TierRole,
): Promise<OpggMatchupGuide> {
  return invokeTauri<OpggMatchupGuide>("get_opgg_matchup_guide", {
    champion,
    opponent,
    role,
  });
}

export async function buildBaronRunePayload(
  championName: string,
  primaryStyleId: number,
  subStyleId: number,
  selectedPerkIds: number[],
): Promise<LcuRunePagePayload> {
  if (!isTauriRuntime()) {
    return {
      name: `Baron: ${championName}`,
      primaryStyleId,
      subStyleId,
      selectedPerkIds,
      current: true,
    };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<LcuRunePagePayload>("build_baron_rune_page_payload", {
    championName,
    primaryStyleId,
    subStyleId,
    selectedPerkIds,
  });
}

export async function fetchLcuPlayerContext(): Promise<LcuPlayerContext | null> {
  if (!isTauriRuntime()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<LcuPlayerContext | null>("get_lcu_player_context");
}

export async function importOpggRunesToLcu(
  championName: string,
  primaryStyleId: number,
  subStyleId: number,
  selectedPerkIds: number[],
): Promise<LcuRuneImportResult> {
  return invokeTauri<LcuRuneImportResult>("import_opgg_runes_to_lcu", {
    championName,
    primaryStyleId,
    subStyleId,
    selectedPerkIds,
  });
}

export interface OpggRegionOption {
  code: string;
  label: string;
}

export async function fetchOpggRegions(): Promise<OpggRegionOption[]> {
  return invokeTauri<OpggRegionOption[]>("get_opgg_regions");
}

export async function fetchLcuOwnedSkins(): Promise<LcuOwnedSkinDto[]> {
  return invokeTauri<LcuOwnedSkinDto[]>("get_lcu_owned_skins");
}

export type OpggGameMode =
  | "ranked"
  | "aram_mayhem"
  | "classic"
  | "arena"
  | "flex"
  | "aram"
  | "urf"
  | "brawl"
  | "doom"
  | "nexus_blitz";

export type OpggTierFilter =
  | "emerald_plus"
  | "all"
  | "diamond_plus"
  | "master_plus"
  | "grandmaster"
  | "challenger"
  | "platinum_plus"
  | "gold_plus";

export interface OpggGameModeDef {
  id: OpggGameMode;
  label: string;
  shortLabel: string;
  badge: string | null;
  hasRoles: boolean;
  hasTierFilter: boolean;
  primaryBar: boolean;
}

export const OPGG_GAME_MODES: OpggGameModeDef[] = [
  {
    id: "ranked",
    label: "Ranked Solo/Duo",
    shortLabel: "Ranked Solo/Duo",
    badge: null,
    hasRoles: true,
    hasTierFilter: true,
    primaryBar: true,
  },
  {
    id: "aram_mayhem",
    label: "ARAM: Mayhem",
    shortLabel: "ARAM: Mayhem",
    badge: null,
    hasRoles: false,
    hasTierFilter: false,
    primaryBar: true,
  },
  {
    id: "classic",
    label: "Classic",
    shortLabel: "Classic",
    badge: "NEW",
    hasRoles: true,
    hasTierFilter: false,
    primaryBar: true,
  },
  {
    id: "arena",
    label: "Arena",
    shortLabel: "Arena",
    badge: null,
    hasRoles: false,
    hasTierFilter: false,
    primaryBar: true,
  },
  {
    id: "flex",
    label: "Ranked Flex",
    shortLabel: "Ranked Flex",
    badge: null,
    hasRoles: true,
    hasTierFilter: true,
    primaryBar: false,
  },
  {
    id: "aram",
    label: "ARAM",
    shortLabel: "ARAM",
    badge: null,
    hasRoles: false,
    hasTierFilter: true,
    primaryBar: false,
  },
  {
    id: "urf",
    label: "Ultra Rapid Fire",
    shortLabel: "Ultra Rapid Fire",
    badge: null,
    hasRoles: false,
    hasTierFilter: false,
    primaryBar: false,
  },
  {
    id: "brawl",
    label: "Brawl",
    shortLabel: "Brawl",
    badge: null,
    hasRoles: false,
    hasTierFilter: false,
    primaryBar: false,
  },
  {
    id: "doom",
    label: "Doom Bots of Doom",
    shortLabel: "Doom Bots of Doom",
    badge: null,
    hasRoles: false,
    hasTierFilter: false,
    primaryBar: false,
  },
  {
    id: "nexus_blitz",
    label: "Nexus Blitz",
    shortLabel: "Nexus Blitz",
    badge: null,
    hasRoles: false,
    hasTierFilter: false,
    primaryBar: false,
  },
];

export const OPGG_TIER_FILTERS: { id: OpggTierFilter; label: string }[] = [
  { id: "emerald_plus", label: "Emerald+" },
  { id: "all", label: "All Ranks" },
  { id: "diamond_plus", label: "Diamond+" },
  { id: "master_plus", label: "Master+" },
  { id: "grandmaster", label: "Grandmaster" },
  { id: "challenger", label: "Challenger" },
  { id: "platinum_plus", label: "Platinum+" },
  { id: "gold_plus", label: "Gold+" },
];

export interface OpggModeTierEntry {
  championId: number;
  championKey: string;
  championName: string;
  mode: string;
  role: TierRole | "Unknown";
  tier: string;
  rank: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  kda: number;
  play: number;
  avgPlace: number | null;
  firstRate: number | null;
  top2Rate: number | null;
}

export interface OpggDesktopRuneBuild {
  id: number;
  primary_page_id: number;
  primary_rune_ids: number[];
  secondary_page_id: number;
  secondary_rune_ids: number[];
  stat_mod_ids: number[];
  play: number;
  win: number;
  pick_rate: number;
}

export interface OpggSingleRuneStat {
  id: number;
  play: number;
  win: number;
  pick_rate: number;
}

export interface OpggDesktopItemStat {
  ids: number[];
  play: number;
  win: number;
  pick_rate: number;
  total_place?: number;
  first_place?: number;
}

export interface OpggDesktopSkillRow {
  ids?: string[];
  order?: string[];
  play: number;
  win: number;
  pick_rate: number;
}

export interface OpggDesktopAugmentStat {
  id: number;
  win: number;
  play: number;
  total_place?: number;
  first_place?: number;
  pick_rate: number;
  win_rate?: number;
}

export interface OpggDesktopAugmentGroup {
  rarity: number;
  augments: OpggDesktopAugmentStat[];
}

export interface OpggAugmentMeta {
  id: number;
  name: string;
  key: string;
  largeIcon: string;
  smallIcon: string;
  rarity: number;
  desc: string;
  tooltip: string;
}

export interface OpggDesktopData {
  summary?: {
    id?: number;
    average_stats?: {
      win_rate?: number;
      pick_rate?: number;
      ban_rate?: number;
      play?: number;
      win?: number;
      total_place?: number;
      first_place?: number;
      kda?: number;
      tier?: number;
      rank?: number;
      tier_data?: { tier?: number; rank?: number; rank_prev?: number; rank_prev_patch?: number };
    };
    positions?: {
      name: string;
      stats?: {
        win_rate?: number;
        pick_rate?: number;
        ban_rate?: number;
        play?: number;
        role_rate?: number;
        kda?: number;
        tier_data?: { tier?: number; rank?: number };
      };
      counters?: { champion_id: number; play: number; win: number }[];
    }[];
  };
  runes?: OpggDesktopRuneBuild[];
  rune_pages?: {
    id: number;
    primary_page_id: number;
    secondary_page_id: number;
    play: number;
    win: number;
    pick_rate: number;
    builds?: OpggDesktopRuneBuild[];
  }[];
  single_runes?: {
    primary_page?: { runes?: OpggSingleRuneStat[] };
    secondary_page?: { runes?: OpggSingleRuneStat[] };
    stat_mods?: { runes?: OpggSingleRuneStat[] };
  };
  summoner_spells?: OpggDesktopItemStat[];
  starter_items?: OpggDesktopItemStat[];
  boots?: OpggDesktopItemStat[];
  core_items?: OpggDesktopItemStat[];
  last_items?: OpggDesktopItemStat[];
  prism_items?: OpggDesktopItemStat[];
  skill_masteries?: OpggDesktopSkillRow[];
  skills?: OpggDesktopSkillRow[];
  counters?: { champion_id: number; play: number; win: number }[];
  augment_group?: OpggDesktopAugmentGroup[];
  synergies?: {
    champion_id: number;
    op_rank?: number;
    play: number;
    win: number;
    total_place?: number;
    first_place?: number;
    pick_rate: number;
  }[];
  trends?: {
    total_rank?: number;
    total_position_rank?: number;
    win?: { version: string; rate: number; rank: number }[];
    pick?: { version: string; rate: number; rank: number }[];
    ban?: { version: string; rate: number; rank: number }[];
  };
}

export interface OpggChampionDetailMcp {
  id?: number;
  key?: string;
  name?: string;
  title?: string;
  tags?: string[];
  lore?: string;
  partype?: string;
  ally_tips?: string[];
  enemy_tips?: string[];
  passive?: { name?: string; description?: string };
  spells?: {
    key?: string;
    name?: string;
    description?: string;
    cooldown?: number[];
    cost?: number[];
  }[];
  stats?: Record<string, number>;
}

export interface OpggSkinStat {
  rank: number;
  skin_id: number;
  skin_name: string;
}

export interface OpggAramAugment {
  id: number;
  name: string;
  desc: string;
  tier: number;
  performance: number;
  popular: number;
}

export interface OpggMasteryLeaderEntry {
  rank: number;
  summoner?: {
    game_name?: string;
    tagline?: string;
    level?: number;
    profile_image_url?: string;
    league_stats?: {
      tier_info?: { tier?: string; division?: number; lp?: number };
    }[];
  };
  most_champion_stat?: {
    play?: number;
    win?: number;
    lose?: number;
    kill?: number;
    death?: number;
    assist?: number;
    op_score?: number;
  };
}

export interface OpggChampionBundle {
  championId: number;
  key: string;
  name: string;
  mode: string;
  role: TierRole;
  tier: string;
  region: string;
  endpointUrl: string;
  desktopData: OpggDesktopData | null;
  mcpAnalysis: OpggChampionAnalysis | null;
  championDetails: OpggChampionDetailMcp | null;
  aramAugments: OpggAramAugment[];
  arenaAugmentsMeta: Record<string, OpggAugmentMeta>;
  skins: OpggSkinStat[];
  masteryLeaderboard: OpggMasteryLeaderEntry[];
  championCatalogById: Record<string, { id: number; key: string; name: string }>;
  errors: string[];
}

export interface UggOptionStat {
  itemId: number;
  wins: number;
  games: number;
  winRate: number;
}

export interface UggBuildResponse {
  championId: number;
  patch: string;
  role: TierRole;
  tierLabel: string;
  endpointUrl: string;
  games: number;
  wins: number;
  winRate: number;
  roleGames: number;
  roleWins: number;
  roleWinRate: number;
  primaryStyle: number;
  subStyle: number;
  runes: number[];
  statShards: number[];
  spells: number[];
  starterItems: number[];
  coreItems: number[];
  fourthItems: UggOptionStat[];
  fifthItems: UggOptionStat[];
  sixthItems: UggOptionStat[];
  skillOrder: string[];
  skillPriority: string;
}

export interface MerakiAbilitySpell {
  name: string;
  icon: string;
  cooldown: string;
  cost: string;
  resource: string;
  effects: string[];
}

export interface MerakiChampionDetail {
  id: number;
  key: string;
  name: string;
  title: string;
  fullName: string;
  icon: string;
  resource: string;
  attackType: string;
  adaptiveType: string;
  patchLastChanged: string;
  releasePatch: string;
  positions: string[];
  roles: string[];
  lore: string;
  stats: Record<string, { flat?: number; perLevel?: number }>;
  abilities: Record<string, MerakiAbilitySpell[]>;
  endpointUrl: string;
}

export interface ProviderDiagnostic {
  id: string;
  name: string;
  tierListStatus: string;
  buildDataStatus: string;
  summary: string;
  sampleEndpoint: string;
}

function opggRoleParam(role: TierRole | null): string {
  switch (role) {
    case "Top":
      return "TOP";
    case "Jungle":
      return "JUNGLE";
    case "Middle":
    case null:
      return "MID";
    case "Bottom":
      return "ADC";
    case "Utility":
      return "SUPPORT";
  }
}

function parseOpggPosRole(pos: string): TierRole | "Unknown" {
  switch (pos.toUpperCase()) {
    case "TOP":
      return "Top";
    case "JUNGLE":
      return "Jungle";
    case "MID":
    case "MIDDLE":
      return "Middle";
    case "ADC":
    case "BOTTOM":
      return "Bottom";
    case "SUPPORT":
    case "UTILITY":
      return "Utility";
    default:
      return "Unknown";
  }
}

function toPct(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n >= 0 && n <= 1 ? n * 100 : n;
}

function normChampionStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function resolveBrowserChampEntry(
  champion: string,
  ddVersion: string,
): Promise<{ id: number; key: string; name: string } | null> {
  const idMap = await import("./ddragon").then((m) => m.fetchChampionIdNameMap(ddVersion));
  const needle = normChampionStr(champion);
  for (const [idStr, meta] of Object.entries(idMap)) {
    if (normChampionStr(meta.name) === needle || normChampionStr(meta.id) === needle || idStr === champion.trim()) {
      return { id: Number(idStr), key: meta.id, name: meta.name };
    }
  }
  return null;
}

export async function fetchOpggModeTierList(
  mode: OpggGameMode,
  role: TierRole | null,
  tier: string = "emerald_plus",
  ddVersion: string = "16.22.1",
): Promise<OpggModeTierEntry[]> {
  if (isTauriRuntime()) {
    return invokeTauri<OpggModeTierEntry[]>("get_opgg_mode_tier_list", { mode, role, tier });
  }

  const idMap = await import("./ddragon").then((m) => m.fetchChampionIdNameMap(ddVersion));
  if (mode === "aram_mayhem" || mode === "brawl") {
    const url =
      mode === "aram_mayhem"
        ? "https://lol-api-champion.op.gg/api/contents/tiers?type=aram_mayhem"
        : "https://lol-api-champion.op.gg/api/contents/tiers";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading OP.GG ${mode} tiers`);
    const body = (await res.json()) as { data?: { champion_id?: number; id?: number; tier?: number; rank?: number }[] };
    const mapped = (body.data ?? [])
      .map((row): OpggModeTierEntry | null => {
        const cid = row.champion_id ?? row.id ?? 0;
        const meta = idMap[cid];
        if (!meta) return null;
        return {
          championId: cid,
          championKey: meta.id,
          championName: meta.name,
          mode,
          role: "Unknown",
          tier: row.tier === 0 ? "OP" : String(row.tier ?? 5),
          rank: row.rank ?? 999,
          winRate: 0,
          pickRate: 0,
          banRate: 0,
          kda: 0,
          play: 0,
          avgPlace: null,
          firstRate: null,
          top2Rate: null,
        };
      })
      .filter((x): x is OpggModeTierEntry => x !== null);
    return mapped.toSorted((a, b) => a.rank - b.rank);
  }

  const url =
    mode === "ranked" || mode === "flex" || mode === "aram"
      ? `https://lol-api-champion.op.gg/api/global/champions/${mode}?tier=${encodeURIComponent(tier)}`
      : `https://lol-api-champion.op.gg/api/global/champions/${mode}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} loading OP.GG ${mode} tier list`);
  const body = (await res.json()) as { data?: Record<string, unknown>[] };
  const targetPos = opggRoleParam(role);
  const isLaneMode = mode === "ranked" || mode === "flex" || mode === "classic";
  const entries: OpggModeTierEntry[] = [];

  for (const row of body.data ?? []) {
    const cid = Number(row.id ?? 0);
    const meta = idMap[cid];
    if (!meta) continue;
    const positions = Array.isArray(row.positions)
      ? (row.positions as { name?: string; stats?: Record<string, unknown> }[])
      : [];
    if (isLaneMode && role !== null) {
      const posObj = positions.find((p) => p.name === targetPos);
      if (!posObj?.stats) continue;
      const td = (posObj.stats.tier_data ?? {}) as { tier?: number; rank?: number };
      entries.push({
        championId: cid,
        championKey: meta.id,
        championName: meta.name,
        mode,
        role: parseOpggPosRole(targetPos),
        tier: td.tier === 0 ? "OP" : String(td.tier ?? 5),
        rank: Number(td.rank ?? 999),
        winRate: toPct(posObj.stats.win_rate),
        pickRate: toPct(posObj.stats.pick_rate),
        banRate: toPct(posObj.stats.ban_rate),
        kda: Number(posObj.stats.kda ?? 0),
        play: Number(posObj.stats.play ?? 0),
        avgPlace: null,
        firstRate: null,
        top2Rate: null,
      });
      continue;
    }

    const avg = (row.average_stats ?? {}) as Record<string, unknown>;
    const td = (avg.tier_data ?? {}) as { tier?: number; rank?: number };
    const play = Number(avg.play ?? 0);
    if (play === 0 && mode !== "doom") continue;
    const isArena = mode === "arena" && play > 0;
    const top2 = isArena ? (Number(avg.win ?? 0) / play) * 100 : null;
    entries.push({
      championId: cid,
      championKey: meta.id,
      championName: meta.name,
      mode,
      role: positions[0]?.name ? parseOpggPosRole(positions[0].name) : "Unknown",
      tier: (avg.tier ?? td.tier) === 0 ? "OP" : String(avg.tier ?? td.tier ?? 5),
      rank: Number(avg.rank ?? td.rank ?? 999),
      winRate: isArena ? top2 ?? 0 : toPct(avg.win_rate),
      pickRate: toPct(avg.pick_rate),
      banRate: toPct(avg.ban_rate),
      kda: Number(avg.kda ?? 0),
      play,
      avgPlace: isArena ? Number(avg.total_place ?? 0) / play : null,
      firstRate: isArena ? (Number(avg.first_place ?? 0) / play) * 100 : null,
      top2Rate: top2,
    });
  }

  return entries.toSorted((a, b) => a.rank - b.rank || b.play - a.play);
}

export async function fetchOpggChampionBundle(
  champion: string,
  mode: OpggGameMode,
  role: TierRole,
  tier: string = "emerald_plus",
  region: string = "NA",
  ddVersion: string = "16.22.1",
): Promise<OpggChampionBundle> {
  if (isTauriRuntime()) {
    return invokeTauri<OpggChampionBundle>("get_opgg_champion_bundle", {
      champion,
      mode,
      role,
      tier,
      region,
    });
  }

  const idMap = await import("./ddragon").then((m) => m.fetchChampionIdNameMap(ddVersion));
  const resolved = await resolveBrowserChampEntry(champion, ddVersion);
  if (!resolved) throw new Error(`Champion '${champion}' not found`);
  const pos = opggRoleParam(role);
  const desktopUrl =
    mode === "arena"
      ? `https://lol-api-champion.op.gg/api/global/champions/arena/${resolved.id}`
      : mode === "ranked" || mode === "flex"
        ? `https://lol-api-champion.op.gg/api/global/champions/${mode}/${resolved.id}/${pos}?tier=${encodeURIComponent(tier)}&is_more=true`
        : mode === "classic"
          ? `https://lol-api-champion.op.gg/api/global/champions/classic/${resolved.id}/${pos}`
          : mode === "aram"
            ? `https://lol-api-champion.op.gg/api/global/champions/aram/${resolved.id}/none?tier=${encodeURIComponent(tier)}&is_more=true`
            : mode === "aram_mayhem"
              ? `https://lol-api-champion.op.gg/api/global/champions/aram_mayhem_classic/${resolved.id}/none?tier=all&is_more=true`
              : mode === "brawl"
                ? ""
                : `https://lol-api-champion.op.gg/api/global/champions/${mode}/${resolved.id}/none`;

  const errors: string[] = [];
  let desktopData: OpggDesktopData | null = null;
  if (desktopUrl) {
    try {
      const r = await fetch(desktopUrl);
      if (r.ok) {
        const j = (await r.json()) as { data?: OpggDesktopData };
        desktopData = j.data ?? null;
      } else {
        errors.push(`desktop_api: HTTP ${r.status}`);
      }
    } catch (e) {
      errors.push(`desktop_api: ${String(e)}`);
    }
  }

  const arenaAugmentsMeta: Record<string, OpggAugmentMeta> = {};
  if (mode === "arena" && desktopData?.augment_group?.length) {
    try {
      const augRes = await fetch("https://lol-api-champion.op.gg/api/meta/augments");
      if (augRes.ok) {
        const augJson = (await augRes.json()) as { data?: OpggAugmentMeta[] };
        const wantedIds = new Set(
          desktopData.augment_group.flatMap((g) => g.augments.map((a) => a.id)),
        );
        for (const m of augJson.data ?? []) {
          if (wantedIds.has(m.id)) {
            arenaAugmentsMeta[String(m.id)] = m;
          }
        }
      }
    } catch (e) {
      errors.push(`arena_augments: ${String(e)}`);
    }
  }

  const championCatalogById: Record<string, { id: number; key: string; name: string }> = {};
  for (const [idStr, meta] of Object.entries(idMap)) {
    championCatalogById[idStr] = { id: Number(idStr), key: meta.id, name: meta.name };
  }

  return {
    championId: resolved.id,
    key: resolved.key,
    name: resolved.name,
    mode,
    role,
    tier,
    region,
    endpointUrl: desktopUrl,
    desktopData,
    mcpAnalysis: null,
    championDetails: null,
    aramAugments: [],
    arenaAugmentsMeta,
    skins: [],
    masteryLeaderboard: [],
    championCatalogById,
    errors,
  };
}

export async function fetchUggChampionBuild(
  champion: string,
  patch: string,
  role: TierRole,
  championIdHint?: number,
  ddVersion: string = "16.22.1",
): Promise<UggBuildResponse> {
  if (isTauriRuntime()) {
    return invokeTauri<UggBuildResponse>("get_ugg_champion_build", { champion, patch, role });
  }
  let cid = championIdHint ?? 0;
  if (!cid) {
    const resolved = await resolveBrowserChampEntry(champion, ddVersion);
    cid = resolved?.id ?? 0;
  }
  if (!cid) throw new Error(`Champion '${champion}' not found for U.GG`);
  const slug = patch.split(".").slice(0, 2).join("_") || "16_22";
  const endpointUrl = `https://stats2.u.gg/lol/1.5/overview/${slug}/ranked_solo_5x5/${cid}/1.5.0.json`;
  const res = await fetch(endpointUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} returned by U.GG overview`);
  const json = (await res.json()) as Record<string, Record<string, Record<string, unknown[][]>>>;
  const world = json["1"] ?? {};
  const tierBucket = world["10"] ?? Object.values(world)[0] ?? {};
  const uggRoleKey =
    role === "Jungle" ? "1" : role === "Utility" ? "2" : role === "Bottom" ? "3" : role === "Top" ? "4" : "5";
  const tuple = (tierBucket[uggRoleKey] ?? Object.values(tierBucket)[0] ?? [])[0] as unknown[];
  if (!Array.isArray(tuple)) throw new Error("U.GG overview tuple unavailable");
  const runeBlock = (tuple[0] as unknown[]) ?? [];
  const spellBlock = (tuple[1] as unknown[]) ?? [];
  const starterBlock = (tuple[2] as unknown[]) ?? [];
  const coreBlock = (tuple[3] as unknown[]) ?? [];
  const skillBlock = (tuple[4] as unknown[]) ?? [];
  const lateBlocks = (tuple[5] as unknown[][][]) ?? [];
  const totals = (tuple[6] as number[]) ?? [];
  const shardBlock = (tuple[8] as unknown[]) ?? [];
  const mapLate = (idx: number): UggOptionStat[] =>
    ((lateBlocks[idx] as number[][]) ?? [])
      .slice(0, 6)
      .map(([itemId, wins, games]) => ({
        itemId,
        wins,
        games,
        winRate: games > 0 ? (wins / games) * 100 : 0,
      }));
  const games = Number(runeBlock[0] ?? 0);
  const wins = Number(runeBlock[1] ?? 0);
  const roleWins = Number(totals[0] ?? 0);
  const roleGames = Number(totals[1] ?? 0);
  return {
    championId: cid,
    patch,
    role,
    tierLabel: "Emerald+",
    endpointUrl,
    games,
    wins,
    winRate: games > 0 ? (wins / games) * 100 : 0,
    roleGames,
    roleWins,
    roleWinRate: roleGames > 0 ? (roleWins / roleGames) * 100 : 0,
    primaryStyle: Number(runeBlock[2] ?? 0),
    subStyle: Number(runeBlock[3] ?? 0),
    runes: ((runeBlock[4] as number[]) ?? []).map(Number),
    statShards: ((shardBlock[2] as unknown[]) ?? []).map(Number),
    spells: ((spellBlock[2] as number[]) ?? []).map(Number),
    starterItems: ((starterBlock[2] as number[]) ?? []).map(Number),
    coreItems: ((coreBlock[2] as number[]) ?? []).map(Number),
    fourthItems: mapLate(0),
    fifthItems: mapLate(1),
    sixthItems: mapLate(2),
    skillOrder: (skillBlock[2] as string[]) ?? [],
    skillPriority: String(skillBlock[3] ?? ""),
  };
}

export async function fetchMerakiChampionKit(champion: string): Promise<MerakiChampionDetail> {
  if (!isTauriRuntime()) {
    throw new Error(
      "Meraki CDN champion kit reference runs through Baron desktop IPC (cdn.merakianalytics.com blocks browser CORS).",
    );
  }
  return invokeTauri<MerakiChampionDetail>("get_meraki_champion_kit", { champion });
}

export async function fetchProviderDiagnostics(patch: string): Promise<ProviderDiagnostic[]> {
  if (isTauriRuntime()) {
    return invokeTauri<ProviderDiagnostic[]>("get_provider_diagnostics", { patch });
  }
  const slug = patch.replace(/\./g, "_");
  return [
    {
      id: "opgg",
      name: "OP.GG",
      tierListStatus: "Live",
      buildDataStatus: "Live",
      summary:
        "Official MCP + OP.GG Desktop JSON APIs covering Ranked, Flex, ARAM, ARAM: Mayhem, Arena, URF, Nexus Blitz, Brawl, Classic & Doom Bots.",
      sampleEndpoint: "https://lol-api-champion.op.gg/api/global/champions/ranked?tier=emerald_plus",
    },
    {
      id: "ugg",
      name: "U.GG",
      tierListStatus: "Blocked (HTTP 403)",
      buildDataStatus: "Live",
      summary:
        "stats2.u.gg serves open JSON per-champion Ranked Solo/Duo overview builds (runes, items, skill order, late options); global tier_list JSON is 403-restricted.",
      sampleEndpoint: `https://stats2.u.gg/lol/1.5/overview/${slug}/ranked_solo_5x5/54/1.5.0.json`,
    },
    {
      id: "merakicdn",
      name: "Meraki CDN",
      tierListStatus: "Not Provided",
      buildDataStatus: "Live (Desktop IPC)",
      summary:
        "cdn.merakianalytics.com serves open JSON champion kits, attack types, adaptive types, ability scaling notes & base stats inside Tauri desktop.",
      sampleEndpoint: "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Malphite.json",
    },
    {
      id: "lolalytics",
      name: "LoLalytics",
      tierListStatus: "Token Gated",
      buildDataStatus: "Token Gated",
      summary:
        "a1.lolalytics.com/mega/ requires signed session tokens/checksums (valid: false on unsigned requests).",
      sampleEndpoint: "https://a1.lolalytics.com/mega/",
    },
    {
      id: "dpmlol",
      name: "DPM.LOL",
      tierListStatus: "Blocked (CF 403)",
      buildDataStatus: "Blocked (CF 403)",
      summary:
        "dpm.lol endpoints sit behind Cloudflare managed challenge (HTTP 403); Baron does not bypass challenges.",
      sampleEndpoint: "https://dpm.lol/api/v1/tier-list",
    },
    {
      id: "metasrc",
      name: "MetaSRC",
      tierListStatus: "Blocked (CF 403)",
      buildDataStatus: "Blocked (CF 403)",
      summary:
        "metasrc.com is gated by Cloudflare managed challenge (HTTP 403); Baron does not bypass challenges.",
      sampleEndpoint: "https://www.metasrc.com/lol",
    },
  ];
}
