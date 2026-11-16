import { AVAILABLE_PATCHES, AVAILABLE_PERIODS, LATEST_DDRAGON, LATEST_PATCH } from "./ddragon";

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

export interface BaronBootstrapPayload {
  appTitle: string;
  latestPatch: string;
  ddragonVersion: string;
  patches: string[];
  periods: string[];
  providers: ProviderMeta[];
  primaryBaronScore: number;
  goldCurve: [number, number][];
  lcuStatus: LcuStatusDto;
}

export const DEFAULT_PROVIDERS: ProviderMeta[] = [
  {
    id: "opgg",
    label: "OP.GG",
    roleTag: "Primary #1",
    tierListUrl: "https://mcp-api.op.gg/mcp",
    sampleBuildUrl: `https://lol-api-champion.op.gg/api/global/champions/ranked/103/MID?tier=emerald_plus&version=${LATEST_PATCH}`,
  },
  {
    id: "ugg",
    label: "U.GG",
    roleTag: "Fallback #2",
    tierListUrl: `https://stats2.u.gg/lol/1.5/tier_list/${LATEST_PATCH}/ranked_solo_5x5.json`,
    sampleBuildUrl: `https://stats2.u.gg/lol/1.5/overview/${LATEST_PATCH}/ranked_solo_5x5/Ahri/1.5.0.json`,
  },
  {
    id: "dpmlol",
    label: "DPM.LOL",
    roleTag: "Fallback",
    tierListUrl: `https://dpm.lol/api/v1/tier-list?patch=${LATEST_PATCH}`,
    sampleBuildUrl: `https://dpm.lol/api/v1/champions/Ahri/build?patch=${LATEST_PATCH}`,
  },
  {
    id: "lolalytics",
    label: "LoLalytics",
    roleTag: "Fallback",
    tierListUrl: `https://a1.lolalytics.com/mega/?ep=tier&v=1&patch=${LATEST_PATCH}&tier=emerald_plus&queue=420&region=all`,
    sampleBuildUrl: `https://a1.lolalytics.com/mega/?ep=champion&v=1&patch=${LATEST_PATCH}&c=ahri&lane=middle&tier=emerald_plus&queue=420&region=all`,
  },
  {
    id: "metasrc",
    label: "MetaSRC",
    roleTag: "Fallback",
    tierListUrl: `https://www.metasrc.com/lol/${LATEST_PATCH}/tier-list`,
    sampleBuildUrl: `https://www.metasrc.com/lol/${LATEST_PATCH}/build/ahri/middle`,
  },
  {
    id: "merakicdn",
    label: "Meraki CDN",
    roleTag: "Fallback",
    tierListUrl: "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json",
    sampleBuildUrl:
      "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/Ahri.json",
  },
];

const FALLBACK_BOOTSTRAP: BaronBootstrapPayload = {
  appTitle: "Baron",
  latestPatch: LATEST_PATCH,
  ddragonVersion: LATEST_DDRAGON,
  patches: [...AVAILABLE_PATCHES],
  periods: [...AVAILABLE_PERIODS],
  providers: DEFAULT_PROVIDERS,
  primaryBaronScore: 75,
  goldCurve: [
    [0, 0],
    [5, 420],
    [10, 1180],
    [14, 1850],
    [20, 3120],
    [26, 4640],
    [33, 5300],
  ],
  lcuStatus: {
    connected: true,
    baseUrl: "https://127.0.0.1:52184",
    port: 52184,
    message: "LCU Ready",
  },
};

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function fetchBootstrapData(patch?: string): Promise<BaronBootstrapPayload> {
  if (!isTauriRuntime()) {
    return FALLBACK_BOOTSTRAP;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<BaronBootstrapPayload>("get_bootstrap_data", { patch: patch ?? null });
  } catch (err) {
    console.warn("Tauri invoke(get_bootstrap_data) failed, using fallback:", err);
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

export async function fetchProviderTierList(provider: string, role: TierRole): Promise<ProviderTierEntry[]> {
  if (!isTauriRuntime()) throw new Error("Live provider data requires the desktop app.");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ProviderTierEntry[]>("get_provider_tier_list", { provider, role });
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
