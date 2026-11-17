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
  champion_id: number;
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

export async function fetchOpggMatchupGuide(
  champion: string,
  opponent: string,
  role: TierRole,
): Promise<Record<string, unknown>> {
  return invokeTauri<Record<string, unknown>>("get_opgg_matchup_guide", {
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
