"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Crown,
  Flame,
  Info,
  ShieldAlert,
  Sparkles,
  Swords,
} from "lucide-react";
import { LaneIcon } from "@/components/icons/LolIcons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RuneMatrixPanel } from "@/components/views/RuneMatrixPanel";
import {
  champSplashUrl,
  champSquareUrl,
  fetchChampionSpellData,
  fetchItemCatalogMap,
  fetchRuneMetadataMap,
  itemIconUrl,
  RUNE_STYLE_ICON_FALLBACK,
  runeIconUrl,
  spellIdUrl,
  statShardLabel,
  type ChampionSpellData,
  type ItemCatalogEntry,
} from "@/lib/ddragon";
import {
  asList,
  fetchMerakiChampionKit,
  fetchOpggChampionBundle,
  fetchOpggMatchupGuide,
  fetchUggChampionBuild,
  OPGG_GAME_MODES,
  OPGG_TIER_FILTERS,
  type MerakiChampionDetail,
  type OpggChampionBundle,
  type OpggDesktopItemStat,
  type OpggDesktopRuneBuild,
  type OpggGameMode,
  type OpggMatchupGuide,
  type TierRole,
  type UggBuildResponse,
} from "@/lib/tauri";

interface ChampionBuildViewProps {
  champion: string;
  role: TierRole;
  mode: OpggGameMode;
  tierFilter: string;
  patch: string;
  ddVersion: string;
  region: string;
  onChangeRole: (role: TierRole) => void;
  onChangeMode: (mode: OpggGameMode) => void;
  onChangeTierFilter: (tier: string) => void;
  onSelectChampion: (champ: string, role: TierRole) => void;
  onBack: () => void;
}

const LANE_ROLES: { id: TierRole; label: string; opggName: string }[] = [
  { id: "Top", label: "Top", opggName: "TOP" },
  { id: "Jungle", label: "Jungle", opggName: "JUNGLE" },
  { id: "Middle", label: "Mid", opggName: "MID" },
  { id: "Bottom", label: "Bot", opggName: "ADC" },
  { id: "Utility", label: "Support", opggName: "SUPPORT" },
];

type BuildSubTab = "build" | "counters" | "synergies" | "providers" | "skins";

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function pctLabel(rate?: number): string {
  if (rate === undefined || rate === null || !Number.isFinite(rate)) return "—";
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(2)}%`;
}

function wrLabel(wins: number, plays: number): string {
  if (!plays || plays <= 0) return "—";
  return `${((wins / plays) * 100).toFixed(2)}%`;
}

export function ChampionBuildView({
  champion,
  role,
  mode,
  tierFilter,
  patch,
  ddVersion,
  region,
  onChangeRole,
  onChangeMode,
  onChangeTierFilter,
  onSelectChampion,
  onBack,
}: ChampionBuildViewProps) {
  const [subTab, setSubTab] = useState<BuildSubTab>("build");
  const [showMoreModes, setShowMoreModes] = useState(false);
  const [bundleState, setBundleState] = useState<{
    key: string;
    data: OpggChampionBundle | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  const [spellData, setSpellData] = useState<ChampionSpellData | null>(null);
  const [itemCatalog, setItemCatalog] = useState<Record<number, ItemCatalogEntry>>({});
  const [runeMeta, setRuneMeta] = useState<Record<number, { name: string; icon: string }>>({});
  const [matchupState, setMatchupState] = useState<{
    reqKey: string;
    opponent: string | null;
    guide: OpggMatchupGuide | null;
    error: string | null;
    loading: boolean;
  }>({ reqKey: "", opponent: null, guide: null, error: null, loading: false });

  const [uggState, setUggState] = useState<{
    key: string;
    data: UggBuildResponse | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  const [merakiState, setMerakiState] = useState<{
    key: string;
    data: MerakiChampionDetail | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  const activeModeDef = OPGG_GAME_MODES.find((m) => m.id === mode) ?? OPGG_GAME_MODES[0];
  const reqKey = `${champion}:${mode}:${role}:${tierFilter}:${region}`;
  const isLoading = bundleState.key !== reqKey;
  const bundle = bundleState.key === reqKey ? bundleState.data : null;
  const error = bundleState.key === reqKey ? bundleState.error : null;

  useEffect(() => {
    let cancelled = false;
    fetchItemCatalogMap(ddVersion).then((m) => {
      if (!cancelled) setItemCatalog(m);
    });
    fetchRuneMetadataMap(ddVersion).then((m) => {
      if (!cancelled) setRuneMeta(m);
    });
    return () => {
      cancelled = true;
    };
  }, [ddVersion]);

  useEffect(() => {
    let cancelled = false;
    fetchChampionSpellData(champion, ddVersion).then((d) => {
      if (!cancelled) setSpellData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [champion, ddVersion]);

  useEffect(() => {
    let cancelled = false;
    fetchOpggChampionBundle(champion, mode, role, tierFilter, region, ddVersion)
      .then((data) => {
        if (!cancelled) {
          setBundleState({ key: reqKey, data, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBundleState({
            key: reqKey,
            data: null,
            error: err instanceof Error ? err.message : "Failed to load OP.GG champion build.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [champion, mode, role, tierFilter, region, ddVersion, reqKey]);

  const compareKey = `${champion}:${patch}:${role}`;
  useEffect(() => {
    if (subTab !== "providers") return;
    let cancelled = false;
    if (uggState.key !== compareKey) {
      fetchUggChampionBuild(champion, patch, role, bundle?.championId, ddVersion)
        .then((data) => {
          if (!cancelled) setUggState({ key: compareKey, data, error: null });
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setUggState({
              key: compareKey,
              data: null,
              error: err instanceof Error ? err.message : "U.GG build request failed",
            });
          }
        });
    }
    if (merakiState.key !== champion) {
      fetchMerakiChampionKit(champion)
        .then((data) => {
          if (!cancelled) setMerakiState({ key: champion, data, error: null });
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setMerakiState({
              key: champion,
              data: null,
              error:
                err instanceof Error
                  ? err.message
                  : "Meraki CDN kit unavailable in browser preview (works in Baron desktop IPC).",
            });
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [
    subTab,
    champion,
    patch,
    role,
    compareKey,
    bundle?.championId,
    ddVersion,
    uggState.key,
    merakiState.key,
  ]);

  const matchupOpponent = matchupState.reqKey === reqKey ? matchupState.opponent : null;
  const matchupGuide = matchupState.reqKey === reqKey ? matchupState.guide : null;
  const matchupError = matchupState.reqKey === reqKey ? matchupState.error : null;
  const matchupLoading = matchupState.reqKey === reqKey ? matchupState.loading : false;

  const loadMatchup = async (opponentName: string) => {
    setMatchupState({
      reqKey,
      opponent: opponentName,
      guide: null,
      error: null,
      loading: true,
    });
    try {
      const guide = await fetchOpggMatchupGuide(champion, opponentName, role);
      setMatchupState({
        reqKey,
        opponent: opponentName,
        guide,
        error: null,
        loading: false,
      });
    } catch (err: unknown) {
      setMatchupState({
        reqKey,
        opponent: opponentName,
        guide: null,
        error:
          err instanceof Error
            ? err.message
            : "Matchup guide requires OP.GG MCP (Baron desktop app).",
        loading: false,
      });
    }
  };

  const desktop = bundle?.desktopData;
  const details = bundle?.championDetails;
  const catalogById = bundle?.championCatalogById ?? {};

  // Flatten rune pages (prefer desktop.runes / rune_pages, else MCP runes)
  const desktopRunePages: OpggDesktopRuneBuild[] = [];
  if (desktop?.runes?.length) {
    desktopRunePages.push(...desktop.runes);
  } else if (desktop?.rune_pages?.length) {
    for (const pg of desktop.rune_pages) {
      if (pg.builds?.[0]) desktopRunePages.push(pg.builds[0]);
    }
  } else if (bundle?.mcpAnalysis) {
    for (const r of asList(bundle.mcpAnalysis.data.runes)) {
      desktopRunePages.push(r);
    }
  }

  const summonerSpells: OpggDesktopItemStat[] = desktop?.summoner_spells ?? [];
  const starterItems: OpggDesktopItemStat[] = desktop?.starter_items ?? [];
  const bootItems: OpggDesktopItemStat[] = desktop?.boots ?? [];
  const coreItems: OpggDesktopItemStat[] = desktop?.core_items ?? [];
  const lateItems: OpggDesktopItemStat[] = desktop?.last_items ?? [];
  const prismItems: OpggDesktopItemStat[] = desktop?.prism_items ?? [];
  const skillMasteries = desktop?.skill_masteries ?? [];
  const skillSeq = desktop?.skills?.[0]?.order ?? [];
  const desktopCounters = desktop?.counters ?? [];

  const mcpWeakCounters = asList(bundle?.mcpAnalysis?.data.weak_counters);
  const mcpStrongCounters = asList(bundle?.mcpAnalysis?.data.strong_counters);
  const mcpCombos = asList(bundle?.mcpAnalysis?.data.skill_combos);

  // Build normalized counter lists (prefer MCP detailed counters, fallback to Desktop counters)
  const weakCounters = mcpWeakCounters.length
    ? mcpWeakCounters.map((c) => {
        const rawWr = c.my_win_rate ?? (c.play > 0 ? c.win / c.play : 0.5);
        return {
          championId: c.champion_id,
          name: c.champion_name ?? catalogById[String(c.champion_id)]?.name ?? `#${c.champion_id}`,
          winRate: rawWr <= 1 ? rawWr * 100 : rawWr,
          play: c.play,
        };
      })
    : desktopCounters
        .filter((c) => c.play > 0)
        .toSorted((a, b) => a.win / a.play - b.win / b.play)
        .slice(0, 6)
        .map((c) => ({
          championId: c.champion_id,
          name: catalogById[String(c.champion_id)]?.name ?? `#${c.champion_id}`,
          winRate: (c.win / c.play) * 100,
          play: c.play,
        }));

  const strongCounters = mcpStrongCounters.length
    ? mcpStrongCounters.map((c) => {
        const rawWr = c.my_win_rate ?? (c.play > 0 ? c.win / c.play : 0.5);
        return {
          championId: c.champion_id,
          name: c.champion_name ?? catalogById[String(c.champion_id)]?.name ?? `#${c.champion_id}`,
          winRate: rawWr <= 1 ? rawWr * 100 : rawWr,
          play: c.play,
        };
      })
    : desktopCounters
        .filter((c) => c.play > 0)
        .toSorted((a, b) => b.win / b.play - a.win / a.play)
        .slice(0, 6)
        .map((c) => ({
          championId: c.champion_id,
          name: catalogById[String(c.champion_id)]?.name ?? `#${c.champion_id}`,
          winRate: (c.win / c.play) * 100,
          play: c.play,
        }));

  // Flatten MCP role synergies OR Arena duo synergies
  const mcpSynergyRows = bundle?.mcpAnalysis?.data.synergies
    ? [
        ...asList(bundle.mcpAnalysis.data.synergies.jungle).map((s) => ({ ...s, lane: "Jungle" })),
        ...asList(bundle.mcpAnalysis.data.synergies.mid).map((s) => ({ ...s, lane: "Mid" })),
        ...asList(bundle.mcpAnalysis.data.synergies.adc).map((s) => ({ ...s, lane: "Bot" })),
        ...asList(bundle.mcpAnalysis.data.synergies.support).map((s) => ({ ...s, lane: "Support" })),
      ].toSorted((a, b) => b.win_rate - a.win_rate)
    : [];

  const arenaSynergies = (desktop?.synergies ?? []).slice(0, 12).map((s) => ({
    championId: s.champion_id,
    name: catalogById[String(s.champion_id)]?.name ?? `#${s.champion_id}`,
    avgPlace: s.play > 0 && s.total_place ? s.total_place / s.play : null,
    winRate: s.play > 0 ? (s.win / s.play) * 100 : 0,
    pickRate: s.pick_rate <= 1 ? s.pick_rate * 100 : s.pick_rate,
    play: s.play,
  }));

  const posStats =
    desktop?.summary?.positions?.find((p) => p.name === LANE_ROLES.find((r) => r.id === role)?.opggName)
      ?.stats ?? null;
  const avgStats = desktop?.summary?.average_stats;

  const isArena = mode === "arena";
  const heroPlay = Number(posStats?.play ?? avgStats?.play ?? 0);
  const heroWinRate = isArena && heroPlay > 0
    ? ((avgStats?.win ?? 0) / heroPlay) * 100
    : (() => {
        const raw = posStats?.win_rate ?? avgStats?.win_rate ?? 0;
        return raw <= 1 ? raw * 100 : raw;
      })();
  const heroPickRate = (() => {
    const raw = posStats?.pick_rate ?? avgStats?.pick_rate ?? 0;
    return raw <= 1 ? raw * 100 : raw;
  })();
  const heroBanRate = (() => {
    const raw = posStats?.ban_rate ?? avgStats?.ban_rate ?? 0;
    return raw <= 1 ? raw * 100 : raw;
  })();
  const heroTier = posStats?.tier_data?.tier ?? avgStats?.tier ?? avgStats?.tier_data?.tier;

  const renderItemImg = (itemId: number, sizeClass = "h-9 w-9") => {
    const meta = itemCatalog[itemId];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src={itemIconUrl(itemId, ddVersion)}
            alt={meta?.name ?? `Item ${itemId}`}
            className={`${sizeClass} rounded-md border border-baron-border bg-baron-inset object-cover`}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="font-semibold text-baron-ink">
            {meta?.name ?? `Item ${itemId}`}{" "}
            {meta?.gold ? <span className="text-baron-gold">({meta.gold}g)</span> : null}
          </div>
          {meta?.plaintext && (
            <div className="mt-0.5 text-[11px] text-baron-ink-secondary">{meta.plaintext}</div>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="min-h-full">
      {/* Top Role & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-baron-border bg-baron-chrome/80 px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-7.5 border-baron-border bg-baron-surface px-2.5 text-[11.5px] font-semibold text-baron-ink"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Tier List
          </Button>

          {activeModeDef.hasRoles && (
            <div className="flex items-center rounded-lg border border-baron-border bg-baron-surface p-0.5">
              {LANE_ROLES.map((r) => {
                const posInfo = desktop?.summary?.positions?.find((p) => p.name === r.opggName);
                const rate = posInfo?.stats?.role_rate;
                const active = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onChangeRole(r.id)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                      active
                        ? "bg-baron-accent text-white"
                        : "text-baron-ink-secondary hover:text-baron-ink"
                    }`}
                  >
                    <LaneIcon role={r.id} className="h-3.5 w-3.5" />
                    <span>{r.label}</span>
                    {rate !== undefined && rate > 0.01 && (
                      <span
                        className={`text-[10px] tabular-nums ${
                          active ? "text-white/85" : "text-baron-ink-muted"
                        }`}
                      >
                        {Math.round((rate <= 1 ? rate : rate / 100) * 100)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeModeDef.hasTierFilter && (
            <select
              value={tierFilter}
              onChange={(e) => onChangeTierFilter(e.target.value)}
              aria-label="Filter OP.GG rank tier"
              className="h-7.5 rounded-md border border-baron-border bg-baron-surface px-2.5 text-[11.5px] font-semibold text-baron-ink"
            >
              {OPGG_TIER_FILTERS.map((tf) => (
                <option key={tf.id} value={tf.id}>
                  {tf.label}
                </option>
              ))}
            </select>
          )}
          <span className="rounded-md border border-baron-border bg-baron-surface px-2.5 py-1 text-[11px] font-semibold text-baron-ink-secondary">
            {region} · Patch {patch}
          </span>
        </div>
      </div>

      {/* Champion Hero Strip */}
      <header className="relative overflow-hidden border-b border-baron-border bg-baron-surface px-5 py-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[44%] bg-cover bg-center opacity-[0.2]"
          style={{
            backgroundImage: `url('${champSplashUrl(champion, 0)}')`,
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={champSquareUrl(champion, ddVersion)}
                alt={champion}
                className="h-16 w-16 rounded-xl border-2 border-baron-accent object-cover"
              />
              {heroTier !== undefined && (
                <span className="absolute -right-1.5 -bottom-1.5 rounded-md border border-baron-border bg-baron-accent px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                  {heroTier === 0 ? "OP" : `${heroTier} Tier`}
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-baron-ink">
                  {bundle?.name ?? champion}
                </h1>
                <span className="text-[13px] font-medium text-baron-ink-secondary">
                  Build for {activeModeDef.hasRoles ? role : activeModeDef.shortLabel}, Patch {patch}
                </span>
                {details?.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-baron-border bg-baron-inset px-1.5 py-0.5 text-[10px] font-semibold text-baron-ink-secondary"
                  >
                    {tag}
                  </span>
                ))}
                {bundle?.mcpAnalysis?.data.damage_type && (
                  <span className="rounded bg-baron-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-baron-accent-soft">
                    {bundle.mcpAnalysis.data.damage_type} Damage
                  </span>
                )}
              </div>

              {/* P / Q / W / E / R Ability Icons */}
              {spellData && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative cursor-help rounded border border-baron-border bg-baron-inset p-0.5">
                        <img
                          src={spellData.passive.imageUrl}
                          alt={spellData.passive.name}
                          className="h-7 w-7 rounded object-cover"
                        />
                        <span className="absolute -right-0.5 -bottom-0.5 rounded bg-black/85 px-1 text-[8.5px] font-bold text-baron-ink">
                          P
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="font-bold text-baron-ink">P · {spellData.passive.name}</div>
                      <p className="mt-1 text-[11px] text-baron-ink-secondary">
                        {stripHtmlTags(spellData.passive.description)}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {spellData.spells.map((sp) => (
                    <Tooltip key={sp.id}>
                      <TooltipTrigger asChild>
                        <div className="relative cursor-help rounded border border-baron-border bg-baron-inset p-0.5">
                          <img
                            src={sp.imageUrl}
                            alt={sp.name}
                            className="h-7 w-7 rounded object-cover"
                          />
                          <span className="absolute -right-0.5 -bottom-0.5 rounded bg-black/85 px-1 text-[8.5px] font-bold text-baron-ink">
                            {sp.slot}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="font-bold text-baron-ink">
                          {sp.slot} · {sp.name}
                        </div>
                        {(sp.cooldownBurn || sp.costBurn) && (
                          <div className="mt-0.5 text-[10.5px] font-medium text-baron-accent-soft tabular-nums">
                            {sp.cooldownBurn ? `CD: ${sp.cooldownBurn}s` : ""}{" "}
                            {sp.costBurn && sp.costBurn !== "0" ? `· Cost: ${sp.costBurn}` : ""}
                          </div>
                        )}
                        <p className="mt-1 text-[11px] text-baron-ink-secondary">
                          {stripHtmlTags(sp.description)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right KPI Strip */}
          {desktop && (
            <div className="flex items-center gap-5 rounded-xl border border-baron-border bg-baron-inset/85 px-4 py-2.5 tabular-nums backdrop-blur-sm">
              {isArena && heroPlay > 0 ? (
                <>
                  <div>
                    <div className="text-[10px] text-baron-ink-muted">Avg. Place</div>
                    <div className="text-[15px] font-extrabold text-baron-ink">
                      {((avgStats?.total_place ?? 0) / heroPlay).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-baron-ink-muted">1st Rate</div>
                    <div className="text-[15px] font-extrabold text-baron-emerald">
                      {(((avgStats?.first_place ?? 0) / heroPlay) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-baron-ink-muted">Top 2 Rate</div>
                    <div className="text-[15px] font-extrabold text-baron-victory">
                      {heroWinRate.toFixed(2)}%
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-[10px] text-baron-ink-muted">Win rate</div>
                    <div className="text-[15px] font-extrabold text-baron-victory">
                      {heroWinRate > 0 ? `${heroWinRate.toFixed(2)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-baron-ink-muted">Pick rate</div>
                    <div className="text-[15px] font-extrabold text-baron-ink">
                      {heroPickRate > 0 ? `${heroPickRate.toFixed(2)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-baron-ink-muted">Ban rate</div>
                    <div className="text-[15px] font-extrabold text-baron-ink-secondary">
                      {heroBanRate > 0 ? `${heroBanRate.toFixed(2)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-baron-ink-muted">Games</div>
                    <div className="text-[15px] font-extrabold text-baron-ink">
                      {heroPlay > 0 ? heroPlay.toLocaleString() : "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* OP.GG Champion Tips when available via MCP */}
        {((details?.ally_tips?.length ?? 0) > 0 || (details?.enemy_tips?.length ?? 0) > 0) && (
          <div className="relative z-10 mt-3 grid grid-cols-1 gap-2 rounded-lg border border-baron-border bg-baron-inset/75 px-3.5 py-2.5 text-[11.5px] md:grid-cols-2">
            {details?.ally_tips?.[0] && (
              <div className="text-baron-ink-secondary">
                <span className="mr-1.5 font-bold text-baron-emerald">Playing {champion}:</span>
                {details.ally_tips[0]}
              </div>
            )}
            {details?.enemy_tips?.[0] && (
              <div className="text-baron-ink-secondary">
                <span className="mr-1.5 font-bold text-baron-defeat">Versus {champion}:</span>
                {details.enemy_tips[0]}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Sub-Navigation Tabs (Build / Counters / Synergies / Compare / Skins & Trends) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-baron-border bg-baron-surface px-5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: "build", label: "Build" },
              { id: "counters", label: "Counters & Matchups" },
              { id: "synergies", label: "Synergies & Late Items" },
              { id: "providers", label: "Compare: U.GG & Meraki" },
              { id: "skins", label: "Skins & Patch Trends" },
            ] as { id: BuildSubTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`border-b-2 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
                subTab === t.id
                  ? "border-baron-accent text-baron-ink"
                  : "border-transparent text-baron-ink-muted hover:text-baron-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Modes Bar (Ranked / ARAM Mayhem / Classic / Arena / Show More) */}
      <div className="relative flex flex-wrap items-center gap-1 border-b border-baron-border bg-baron-chrome px-5 py-2">
        {OPGG_GAME_MODES.filter((m) => m.primaryBar).map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChangeMode(m.id);
                setShowMoreModes(false);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? "bg-baron-elevated text-baron-ink ring-1 ring-baron-accent/50"
                  : "text-baron-ink-secondary hover:bg-baron-surface hover:text-baron-ink"
              }`}
            >
              <span>{m.label}</span>
              {m.badge && (
                <span className="rounded bg-baron-gold px-1 py-0.2 text-[9px] font-extrabold text-black">
                  {m.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoreModes((prev) => !prev)}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              !activeModeDef.primaryBar
                ? "bg-baron-elevated text-baron-ink ring-1 ring-baron-accent/50"
                : "text-baron-ink-secondary hover:bg-baron-surface hover:text-baron-ink"
            }`}
          >
            <span>{!activeModeDef.primaryBar ? activeModeDef.label : "Show more"}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {showMoreModes && (
            <div className="absolute top-10 left-0 z-40 w-52 rounded-xl border border-baron-border-strong bg-baron-surface p-1.5 shadow-2xl">
              {OPGG_GAME_MODES.filter((m) => !m.primaryBar).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChangeMode(m.id);
                    setShowMoreModes(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                    mode === m.id
                      ? "bg-baron-accent/20 text-baron-ink font-semibold"
                      : "text-baron-ink-secondary hover:bg-baron-elevated hover:text-baron-ink"
                  }`}
                >
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5">
        {isLoading && (
          <div role="status" className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_0.95fr]">
            <div className="space-y-4">
              <Skeleton className="h-72 w-full rounded-xl bg-baron-surface" />
              <Skeleton className="h-44 w-full rounded-xl bg-baron-surface" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-52 w-full rounded-xl bg-baron-surface" />
              <Skeleton className="h-44 w-full rounded-xl bg-baron-surface" />
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div role="alert" className="rounded-xl border border-baron-border bg-baron-surface p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-baron-gold" />
              <div>
                <h2 className="text-[14px] font-bold text-baron-ink">
                  Unable to Load Live OP.GG Champion Bundle
                </h2>
                <p className="mt-1 text-[12.5px] text-baron-ink-secondary">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && mode === "brawl" && (
          <div className="rounded-xl border border-baron-border bg-baron-surface p-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-baron-accent-soft" />
              <div>
                <h2 className="text-[14px] font-bold text-baron-ink">
                  OP.GG Brawl Publishes Tier Rankings Only
                </h2>
                <p className="mt-1 text-[12.5px] text-baron-ink-secondary">
                  OP.GG&apos;s Brawl API provides overall tier ranks without per-champion rune or
                  item statistics. Switch to ARAM or Ranked Solo/Duo for full item &amp; rune
                  paths.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => onChangeMode("aram")}>
                    View ARAM Build
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onChangeMode("ranked")}>
                    View Ranked Solo/Duo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && mode !== "brawl" && subTab === "build" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_0.95fr]">
            {/* Left Main Build Column */}
            <div className="space-y-4">
              {/* Arena Mode Augments + Prismatics OR Visual Rune Matrix */}
              {isArena ? (
                <>
                  {prismItems.length > 0 && (
                    <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-baron-ink">
                        <Crown className="h-4 w-4 text-baron-gold" />
                        Arena Prismatic Items
                      </h2>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {prismItems.slice(0, 6).map((row) => (
                          <div
                            key={`prism-${row.ids.join("-")}`}
                            className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                          >
                            <div className="flex items-center gap-2.5">
                              {row.ids[0] ? renderItemImg(row.ids[0], "h-8 w-8") : null}
                              <span className="text-[12px] font-semibold text-baron-ink">
                                {itemCatalog[row.ids[0]]?.name ?? `Item #${row.ids[0]}`}
                              </span>
                            </div>
                            <div className="text-right text-[11px] tabular-nums">
                              <div className="font-bold text-baron-victory">
                                Top 2: {wrLabel(row.win, row.play)}
                              </div>
                              <div className="text-baron-ink-muted">
                                {pctLabel(row.pick_rate)} · {row.play.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {(desktop?.augment_group ?? []).length > 0 && (
                    <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-baron-ink">
                        <Sparkles className="h-4 w-4 text-baron-accent-soft" />
                        Recommended Arena Augments
                      </h2>
                      <div className="space-y-3">
                        {(desktop?.augment_group ?? []).map((grp) => (
                          <div key={`aug-grp-${grp.rarity}`}>
                            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-baron-ink-muted">
                              {grp.rarity === 1
                                ? "Prismatic Augments"
                                : grp.rarity === 2
                                  ? "Gold Augments"
                                  : "Silver Augments"}
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {grp.augments.slice(0, 6).map((aug) => {
                                const meta = bundle?.arenaAugmentsMeta?.[String(aug.id)];
                                return (
                                  <div
                                    key={`aug-${aug.id}`}
                                    className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {meta?.smallIcon && (
                                        <img
                                          src={meta.smallIcon}
                                          alt={meta.name}
                                          className="h-7 w-7 shrink-0 rounded-md border border-baron-border bg-black/50 object-cover"
                                        />
                                      )}
                                      <span className="truncate text-[12px] font-semibold text-baron-ink">
                                        {meta?.name ?? `Augment #${aug.id}`}
                                      </span>
                                    </div>
                                    <div className="shrink-0 text-right text-[11px] tabular-nums">
                                      <div className="font-bold text-baron-emerald">
                                        {pctLabel(aug.win_rate ?? (aug.play > 0 ? aug.win / aug.play : 0))}
                                      </div>
                                      <div className="text-baron-ink-muted">
                                        {pctLabel(aug.pick_rate)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <RuneMatrixPanel
                  championName={bundle?.name ?? champion}
                  ddVersion={ddVersion}
                  runePages={desktopRunePages}
                  singleRunes={desktop?.single_runes}
                />
              )}

              {/* ARAM / Mayhem Augments (OP.GG MCP lol_list_aram_augments) */}
              {(bundle?.aramAugments?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                  <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-baron-ink">
                    <Flame className="h-4 w-4 text-baron-gold" />
                    ARAM Augments (OP.GG Live)
                  </h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {bundle?.aramAugments.slice(0, 8).map((aug) => (
                      <div
                        key={`aram-aug-${aug.id}`}
                        className="rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-bold text-baron-ink">{aug.name}</span>
                          <span className="rounded bg-baron-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-baron-accent-soft tabular-nums">
                            Tier {aug.tier}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-baron-ink-secondary">
                          {stripHtmlTags(aug.desc)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Summoner Spells & Skill Order Row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[0.85fr_1.15fr]">
                {/* Summoner Spells */}
                <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                  <h2 className="mb-3 text-[13px] font-bold text-baron-ink">Summoner Spells</h2>
                  {summonerSpells.length === 0 ? (
                    <div className="text-[12px] text-baron-ink-muted">
                      Summoner spells are not tracked for {activeModeDef.shortLabel}.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {summonerSpells.slice(0, 2).map((row, idx) => (
                        <div
                          key={`spell-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            {row.ids.map((id) => (
                              <img
                                key={id}
                                src={spellIdUrl(id, ddVersion)}
                                alt={`Spell ${id}`}
                                className="h-8 w-8 rounded border border-baron-border object-cover"
                              />
                            ))}
                          </div>
                          <div className="text-right text-[11.5px] tabular-nums">
                            <div className="font-bold text-baron-victory">
                              {wrLabel(row.win, row.play)}
                            </div>
                            <div className="text-baron-ink-muted">
                              {pctLabel(row.pick_rate)} · {row.play.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Skill Build + Level Sequence + Combos */}
                <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[13px] font-bold text-baron-ink">Skill Build</h2>
                    {skillMasteries[0] && (
                      <div className="flex items-center gap-1.5">
                        {(skillMasteries[0].ids ?? []).map((k, i) => {
                          const sp = spellData?.spells.find((s) => s.slot === k);
                          return (
                            <div key={`${k}-${i}`} className="flex items-center gap-1">
                              {i > 0 && <ChevronRight className="h-3 w-3 text-baron-ink-muted" />}
                              <div className="relative">
                                {sp?.imageUrl ? (
                                  <img
                                    src={sp.imageUrl}
                                    alt={k}
                                    className="h-6 w-6 rounded border border-baron-border"
                                  />
                                ) : (
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-baron-border bg-baron-inset text-[11px] font-bold">
                                    {k}
                                  </span>
                                )}
                                <span className="absolute -right-0.5 -bottom-0.5 rounded bg-black/85 px-0.5 text-[8px] font-extrabold text-white">
                                  {k}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {skillSeq.length > 0 ? (
                    <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 tabular-nums">
                      {skillSeq.slice(0, 15).map((key, idx) => (
                        <div
                          key={`lvl-${idx + 1}`}
                          className={`flex flex-col items-center rounded border py-1 text-[10px] ${
                            key === "R"
                              ? "border-baron-accent/50 bg-baron-accent/20 text-baron-accent-soft font-extrabold"
                              : "border-baron-border bg-baron-inset text-baron-ink font-bold"
                          }`}
                        >
                          <span className="text-[8.5px] text-baron-ink-muted">{idx + 1}</span>
                          <span>{key}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-baron-ink-muted">
                      No skill sequence data available for this mode.
                    </div>
                  )}

                  {mcpCombos.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10.5px] font-bold uppercase text-baron-ink-muted">
                        Combos:
                      </span>
                      {mcpCombos.slice(0, 4).map((c) => (
                        <span
                          key={c.name}
                          className="rounded border border-baron-border bg-baron-inset px-2 py-0.5 font-mono text-[11px] font-semibold text-baron-ink"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Items Build Section */}
              <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                <h2 className="mb-3 text-[13px] font-bold text-baron-ink">
                  Recommended Item Builds
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Starters */}
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-baron-ink-muted">
                      Starter Items
                    </div>
                    <div className="space-y-2">
                      {starterItems.slice(0, 2).map((row, idx) => (
                        <div
                          key={`start-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                        >
                          <div className="flex items-center gap-1.5">
                            {row.ids.map((id, i) => (
                              <span key={`${id}-${i}`}>{renderItemImg(id, "h-8 w-8")}</span>
                            ))}
                          </div>
                          <div className="text-right text-[11px] tabular-nums">
                            <div className="font-bold text-baron-victory">
                              {wrLabel(row.win, row.play)}
                            </div>
                            <div className="text-baron-ink-muted">
                              {pctLabel(row.pick_rate)} · {row.play.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Boots */}
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-baron-ink-muted">
                      Boots
                    </div>
                    <div className="space-y-2">
                      {bootItems.slice(0, 2).map((row, idx) => (
                        <div
                          key={`boot-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            {row.ids[0] ? renderItemImg(row.ids[0], "h-8 w-8") : null}
                            <span className="text-[12px] font-medium text-baron-ink">
                              {itemCatalog[row.ids[0]]?.name ?? `Boots #${row.ids[0]}`}
                            </span>
                          </div>
                          <div className="text-right text-[11px] tabular-nums">
                            <div className="font-bold text-baron-victory">
                              {wrLabel(row.win, row.play)}
                            </div>
                            <div className="text-baron-ink-muted">
                              {pctLabel(row.pick_rate)} · {row.play.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top 5 Core Builds */}
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-baron-ink-muted">
                    Core Item Paths
                  </div>
                  <div className="space-y-2">
                    {coreItems.slice(0, 5).map((row, idx) => (
                      <div
                        key={`core-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                      >
                        <div className="flex items-center gap-1.5">
                          {row.ids.map((id, i) => (
                            <div key={`${id}-${i}`} className="flex items-center gap-1.5">
                              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-baron-ink-muted" />}
                              {renderItemImg(id, "h-8 w-8")}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-[11.5px] tabular-nums">
                          <span className="text-baron-ink-muted">{row.play.toLocaleString()} Games</span>
                          <span className="font-semibold text-baron-ink">
                            {pctLabel(row.pick_rate)} Pick
                          </span>
                          <span className="font-extrabold text-baron-victory">
                            {wrLabel(row.win, row.play)} WR
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Situational / 4th-6th Item Options */}
                {lateItems.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-baron-ink-muted">
                      Situational / 4th–6th Item Options
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {lateItems.slice(0, 9).map((row, idx) => (
                        <div
                          key={`late-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-2.5 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {row.ids[0] ? renderItemImg(row.ids[0], "h-7 w-7 shrink-0") : null}
                            <span className="truncate text-[11px] font-medium text-baron-ink">
                              {itemCatalog[row.ids[0]]?.name ?? `#${row.ids[0]}`}
                            </span>
                          </div>
                          <span className="shrink-0 pl-1 text-[11px] font-bold text-baron-victory tabular-nums">
                            {wrLabel(row.win, row.play)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Rail: Counters + Synergies + Mastery + Skins */}
            <aside className="space-y-4">
              {/* Weak Against / Strong Against Matchups */}
              {(weakCounters.length > 0 || strongCounters.length > 0) && (
                <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-baron-ink">
                      <Swords className="h-4 w-4 text-baron-defeat" />
                      {bundle?.name ?? champion} Counters
                    </h2>
                    <span className="text-[10.5px] text-baron-ink-muted">Click for guide</span>
                  </div>

                  {weakCounters.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-2 text-[11px] font-semibold text-baron-ink-muted">
                        Weak against
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {weakCounters.slice(0, 5).map((c) => (
                          <button
                            key={`weak-${c.championId}`}
                            type="button"
                            onClick={() => {
                              setSubTab("counters");
                              loadMatchup(c.name);
                            }}
                            className="group flex flex-col items-center text-center"
                          >
                            <img
                              src={champSquareUrl(c.name, ddVersion)}
                              alt={c.name}
                              className="h-10 w-10 rounded-full border border-baron-border object-cover transition group-hover:border-baron-defeat"
                            />
                            <span className="mt-1 text-[11px] font-bold text-baron-defeat tabular-nums">
                              {c.winRate.toFixed(1)}%
                            </span>
                            <span className="text-[9.5px] text-baron-ink-muted tabular-nums">
                              {c.play.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {strongCounters.length > 0 && (
                    <div>
                      <div className="mb-2 text-[11px] font-semibold text-baron-ink-muted">
                        Strong against
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {strongCounters.slice(0, 5).map((c) => (
                          <button
                            key={`strong-${c.championId}`}
                            type="button"
                            onClick={() => {
                              setSubTab("counters");
                              loadMatchup(c.name);
                            }}
                            className="group flex flex-col items-center text-center"
                          >
                            <img
                              src={champSquareUrl(c.name, ddVersion)}
                              alt={c.name}
                              className="h-10 w-10 rounded-full border border-baron-border object-cover transition group-hover:border-baron-blue"
                            />
                            <span className="mt-1 text-[11px] font-bold text-baron-victory tabular-nums">
                              {c.winRate.toFixed(1)}%
                            </span>
                            <span className="text-[9.5px] text-baron-ink-muted tabular-nums">
                              {c.play.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Synergies Card */}
              {(isArena ? arenaSynergies.length > 0 : mcpSynergyRows.length > 0) && (
                <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                  <h2 className="mb-3 text-[13px] font-bold text-baron-ink">
                    Top {bundle?.name ?? champion} Synergies
                  </h2>
                  <div className="space-y-2">
                    {isArena
                      ? arenaSynergies.slice(0, 5).map((s) => (
                          <button
                            key={`asyn-${s.championId}`}
                            type="button"
                            onClick={() => onSelectChampion(s.name, role)}
                            className="flex w-full items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-left hover:border-baron-accent"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={champSquareUrl(s.name, ddVersion)}
                                alt={s.name}
                                className="h-7 w-7 rounded-full border border-baron-border"
                              />
                              <div>
                                <div className="text-[12px] font-semibold text-baron-ink">
                                  {s.name}
                                </div>
                                <div className="text-[10px] text-baron-ink-muted tabular-nums">
                                  {s.pickRate.toFixed(2)}% · {s.play.toLocaleString()} Games
                                </div>
                              </div>
                            </div>
                            <span className="text-[12px] font-bold text-baron-victory tabular-nums">
                              {s.winRate.toFixed(2)}%
                            </span>
                          </button>
                        ))
                      : mcpSynergyRows.slice(0, 5).map((s, idx) => (
                          <button
                            key={`msyn-${s.synergy_champion_name}-${s.lane}-${idx}`}
                            type="button"
                            onClick={() => onSelectChampion(s.synergy_champion_name, role)}
                            className="flex w-full items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-left hover:border-baron-accent"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={champSquareUrl(s.synergy_champion_name, ddVersion)}
                                alt={s.synergy_champion_name}
                                className="h-7 w-7 rounded-full border border-baron-border"
                              />
                              <div>
                                <div className="text-[12px] font-semibold text-baron-ink">
                                  {s.synergy_champion_name}{" "}
                                  <span className="text-[10px] text-baron-ink-muted">
                                    ({s.lane})
                                  </span>
                                </div>
                                <div className="text-[10px] text-baron-ink-muted tabular-nums">
                                  {s.play.toLocaleString()} Games
                                </div>
                              </div>
                            </div>
                            <span className="text-[12px] font-bold text-baron-victory tabular-nums">
                              {pctLabel(s.win_rate)}
                            </span>
                          </button>
                        ))}
                  </div>
                </section>
              )}

              {/* Champion Mastery Leaderboard (OP.GG MCP) */}
              {(bundle?.masteryLeaderboard?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                  <h2 className="mb-3 text-[13px] font-bold text-baron-ink">
                    {bundle?.name ?? champion} Mastery Ranking · {region}
                  </h2>
                  <div className="space-y-1.5">
                    {bundle?.masteryLeaderboard.slice(0, 5).map((entry) => {
                      const tierInfo = entry.summoner?.league_stats?.[0]?.tier_info;
                      const stat = entry.most_champion_stat;
                      const games = stat?.play ?? 0;
                      const wr = games > 0 && stat?.win ? (stat.win / games) * 100 : 0;
                      return (
                        <div
                          key={`mlead-${entry.rank}`}
                          className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-[11.5px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 text-[11px] font-bold text-baron-ink-muted tabular-nums">
                              {entry.rank}
                            </span>
                            <span className="truncate font-semibold text-baron-ink">
                              {entry.summoner?.game_name ?? "Summoner"}
                              {entry.summoner?.tagline ? `#${entry.summoner.tagline}` : ""}
                            </span>
                          </div>
                          <div className="shrink-0 text-right tabular-nums">
                            <div className="font-bold text-baron-victory">{wr.toFixed(0)}% WR</div>
                            <div className="text-[10px] text-baron-ink-muted">
                              {tierInfo?.tier ?? ""} {tierInfo?.lp !== undefined ? `${tierInfo.lp} LP` : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Skins Ranking (OP.GG MCP) */}
              {(bundle?.skins?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
                  <h2 className="mb-3 text-[13px] font-bold text-baron-ink">Popular Skins</h2>
                  <div className="space-y-1.5">
                    {bundle?.skins.slice(0, 5).map((sk) => (
                      <div
                        key={`skin-${sk.skin_id}`}
                        className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-[12px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 font-bold text-baron-gold tabular-nums">
                            #{sk.rank}
                          </span>
                          <span className="font-medium text-baron-ink">{sk.skin_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}

        {/* SUBTAB: COUNTERS & MATCHUP GUIDE */}
        {!isLoading && !error && subTab === "counters" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <h2 className="mb-3 text-[13.5px] font-bold text-baron-ink">
                Toughest Matchups &amp; Best Matchups
              </h2>
              <div className="space-y-2">
                {weakCounters.map((c) => (
                  <button
                    key={`cw-${c.championId}`}
                    type="button"
                    onClick={() => loadMatchup(c.name)}
                    className="flex w-full items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-left hover:border-baron-defeat"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={champSquareUrl(c.name, ddVersion)}
                        alt={c.name}
                        className="h-8 w-8 rounded-lg border border-baron-border"
                      />
                      <div>
                        <div className="text-[12.5px] font-bold text-baron-ink">{c.name}</div>
                        <div className="text-[10.5px] text-baron-ink-muted tabular-nums">
                          {c.play.toLocaleString()} Games · Hard Counter
                        </div>
                      </div>
                    </div>
                    <span className="text-[12.5px] font-extrabold text-baron-defeat tabular-nums">
                      {c.winRate.toFixed(2)}% WR
                    </span>
                  </button>
                ))}
                {strongCounters.map((c) => (
                  <button
                    key={`cs-${c.championId}`}
                    type="button"
                    onClick={() => loadMatchup(c.name)}
                    className="flex w-full items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-left hover:border-baron-blue"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={champSquareUrl(c.name, ddVersion)}
                        alt={c.name}
                        className="h-8 w-8 rounded-lg border border-baron-border"
                      />
                      <div>
                        <div className="text-[12.5px] font-bold text-baron-ink">{c.name}</div>
                        <div className="text-[10.5px] text-baron-ink-muted tabular-nums">
                          {c.play.toLocaleString()} Games · Favorable Matchup
                        </div>
                      </div>
                    </div>
                    <span className="text-[12.5px] font-extrabold text-baron-victory tabular-nums">
                      {c.winRate.toFixed(2)}% WR
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-baron-ink">
                <ShieldAlert className="h-4 w-4 text-baron-accent-soft" />
                Live OP.GG Matchup Guide {matchupOpponent ? `vs ${matchupOpponent}` : ""}
              </h2>
              {matchupLoading && <Skeleton className="h-44 w-full rounded-lg bg-baron-inset" />}
              {!matchupLoading && matchupError && (
                <div className="rounded-lg border border-baron-border bg-baron-inset p-4 text-[12px] text-baron-ink-secondary">
                  {matchupError}
                </div>
              )}
              {!matchupLoading && !matchupError && !matchupGuide && (
                <div className="rounded-lg border border-baron-border bg-baron-inset p-4 text-[12.5px] text-baron-ink-muted">
                  Select any opponent champion on the left to load live lane strategy &amp; spike
                  advice from OP.GG MCP.
                </div>
              )}
              {!matchupLoading && matchupGuide && (
                <div className="space-y-3 text-[12px] text-baron-ink-secondary">
                  {matchupGuide.summary?.summary && (
                    <p className="rounded-lg border border-baron-border bg-baron-inset p-3 text-baron-ink">
                      {matchupGuide.summary.summary}
                    </p>
                  )}
                  {(matchupGuide.lane_strategy?.lane_tips?.length ?? 0) > 0 && (
                    <ul className="list-disc space-y-1.5 pl-4">
                      {(matchupGuide.lane_strategy?.lane_tips ?? []).map((tip: string, i: number) => (
                        <li key={`tip-${i}`}>{tip}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB: SYNERGIES & ALL LATE ITEMS */}
        {!isLoading && !error && subTab === "synergies" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <h2 className="mb-3 text-[13.5px] font-bold text-baron-ink">
                All Situational Items ({lateItems.length})
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lateItems.slice(0, 18).map((row, idx) => (
                  <div
                    key={`all-late-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {row.ids[0] ? renderItemImg(row.ids[0], "h-7 w-7 shrink-0") : null}
                      <span className="truncate text-[12px] font-medium text-baron-ink">
                        {itemCatalog[row.ids[0]]?.name ?? `#${row.ids[0]}`}
                      </span>
                    </div>
                    <div className="shrink-0 text-right text-[11px] tabular-nums">
                      <div className="font-bold text-baron-victory">{wrLabel(row.win, row.play)}</div>
                      <div className="text-baron-ink-muted">{pctLabel(row.pick_rate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <h2 className="mb-3 text-[13.5px] font-bold text-baron-ink">
                Team &amp; Duo Synergies
              </h2>
              {isArena ? (
                <div className="space-y-2">
                  {arenaSynergies.map((s) => (
                    <div
                      key={`full-asyn-${s.championId}`}
                      className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={champSquareUrl(s.name, ddVersion)}
                          alt={s.name}
                          className="h-8 w-8 rounded-full border border-baron-border"
                        />
                        <div>
                          <div className="text-[12.5px] font-bold text-baron-ink">{s.name}</div>
                          <div className="text-[10.5px] text-baron-ink-muted tabular-nums">
                            Avg. Place: {s.avgPlace ? s.avgPlace.toFixed(2) : "—"} ·{" "}
                            {s.play.toLocaleString()} Games
                          </div>
                        </div>
                      </div>
                      <span className="text-[12.5px] font-bold text-baron-victory tabular-nums">
                        {s.winRate.toFixed(2)}% Top 2
                      </span>
                    </div>
                  ))}
                </div>
              ) : mcpSynergyRows.length > 0 ? (
                <div className="space-y-2">
                  {mcpSynergyRows.slice(0, 12).map((s, idx) => (
                    <div
                      key={`full-msyn-${s.synergy_champion_name}-${s.lane}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={champSquareUrl(s.synergy_champion_name, ddVersion)}
                          alt={s.synergy_champion_name}
                          className="h-8 w-8 rounded-full border border-baron-border"
                        />
                        <div>
                          <div className="text-[12.5px] font-bold text-baron-ink">
                            {s.synergy_champion_name}{" "}
                            <span className="text-[11px] font-normal text-baron-ink-muted">
                              ({s.lane})
                            </span>
                          </div>
                          <div className="text-[10.5px] text-baron-ink-muted tabular-nums">
                            {s.play.toLocaleString()} Games
                          </div>
                        </div>
                      </div>
                      <span className="text-[12.5px] font-bold text-baron-victory tabular-nums">
                        {pctLabel(s.win_rate)} WR
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-baron-ink-muted">
                  Synergy pairings are published in OP.GG Ranked Solo/Duo, Flex, and Arena modes
                  within the desktop runtime.
                </div>
              )}
            </section>
          </div>
        )}

        {/* SUBTAB: COMPARE PROVIDERS (LIVE U.GG + MERAKI CDN) */}
        {!isLoading && !error && subTab === "providers" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Live U.GG Overview */}
            <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13.5px] font-bold text-baron-ink">
                  U.GG Live Overview Build ({role})
                </h2>
                <span className="rounded bg-baron-emerald/15 px-2 py-0.5 text-[10px] font-bold text-baron-emerald">
                  stats2.u.gg JSON
                </span>
              </div>

              {uggState.key !== compareKey ? (
                <Skeleton className="h-48 w-full rounded-lg bg-baron-inset" />
              ) : uggState.error || !uggState.data ? (
                <div className="rounded-lg border border-baron-border bg-baron-inset p-4 text-[12px] text-baron-ink-secondary">
                  {uggState.error ?? "No U.GG build returned for this role."}
                </div>
              ) : (
                <div className="space-y-3 text-[12px]">
                  <div className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 tabular-nums">
                    <span>
                      Tier: <strong>{uggState.data.tierLabel}</strong> · Priority:{" "}
                      <strong>{uggState.data.skillPriority}</strong>
                    </span>
                    <span className="font-extrabold text-baron-victory">
                      {uggState.data.roleWinRate.toFixed(2)}% WR (
                      {uggState.data.roleGames.toLocaleString()} Games)
                    </span>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[10.5px] font-bold uppercase text-baron-ink-muted">
                      U.GG Runes &amp; Shards
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-baron-border bg-baron-inset p-2.5">
                      <img
                        src={runeIconUrl(
                          runeMeta[uggState.data.primaryStyle]?.icon ??
                            RUNE_STYLE_ICON_FALLBACK[uggState.data.primaryStyle] ??
                            RUNE_STYLE_ICON_FALLBACK[8000],
                        )}
                        alt="Primary"
                        className="h-6 w-6 rounded-full"
                      />
                      <img
                        src={runeIconUrl(
                          runeMeta[uggState.data.subStyle]?.icon ??
                            RUNE_STYLE_ICON_FALLBACK[uggState.data.subStyle] ??
                            RUNE_STYLE_ICON_FALLBACK[8400],
                        )}
                        alt="Secondary"
                        className="h-5 w-5 rounded-full"
                      />
                      {uggState.data.runes.map((id, i) => {
                        const icon = runeMeta[id]?.icon;
                        return icon ? (
                          <img
                            key={`ugg-r-${i}`}
                            src={runeIconUrl(icon)}
                            alt={runeMeta[id]?.name ?? `Rune ${id}`}
                            className="h-6 w-6 rounded-full border border-baron-border bg-baron-surface"
                          />
                        ) : null;
                      })}
                      <span className="text-[11px] text-baron-ink-muted">
                        · {uggState.data.statShards.map((s) => statShardLabel(s)).join(" / ")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[10.5px] font-bold uppercase text-baron-ink-muted">
                      U.GG Starters &amp; Core Items
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-baron-border bg-baron-inset p-2.5">
                      {uggState.data.starterItems.map((id, i) => (
                        <span key={`us-${i}`}>{renderItemImg(id, "h-7 w-7")}</span>
                      ))}
                      <ChevronRight className="h-3.5 w-3.5 text-baron-ink-muted" />
                      {uggState.data.coreItems.map((id, i) => (
                        <span key={`uc-${i}`}>{renderItemImg(id, "h-8 w-8")}</span>
                      ))}
                    </div>
                  </div>

                  {uggState.data.fourthItems.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10.5px] font-bold uppercase text-baron-ink-muted">
                        U.GG 4th Item Options
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {uggState.data.fourthItems.slice(0, 4).map((it) => (
                          <div
                            key={`u4-${it.itemId}`}
                            className="flex items-center justify-between rounded border border-baron-border bg-baron-inset px-2.5 py-1.5 tabular-nums"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {renderItemImg(it.itemId, "h-6 w-6 shrink-0")}
                              <span className="truncate text-[11px]">
                                {itemCatalog[it.itemId]?.name ?? `#${it.itemId}`}
                              </span>
                            </div>
                            <span className="font-bold text-baron-victory">
                              {it.winRate.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Live Meraki CDN Champion Kit Reference */}
            <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13.5px] font-bold text-baron-ink">
                  Meraki Analytics CDN Kit Reference
                </h2>
                <span className="rounded bg-baron-cyan/15 px-2 py-0.5 text-[10px] font-bold text-baron-cyan">
                  cdn.merakianalytics.com
                </span>
              </div>

              {merakiState.key !== champion ? (
                <Skeleton className="h-48 w-full rounded-lg bg-baron-inset" />
              ) : merakiState.error || !merakiState.data ? (
                <div className="rounded-lg border border-baron-border bg-baron-inset p-4 text-[12px] text-baron-ink-secondary">
                  {merakiState.error ?? "Meraki CDN champion kit not loaded."}
                </div>
              ) : (
                <div className="space-y-3 text-[12px]">
                  <div className="flex flex-wrap gap-2 rounded-lg border border-baron-border bg-baron-inset px-3 py-2">
                    <span>
                      Attack: <strong>{merakiState.data.attackType}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Adaptive: <strong>{merakiState.data.adaptiveType}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Last Changed: <strong>{merakiState.data.patchLastChanged}</strong>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(["P", "Q", "W", "E", "R"] as const).map((slot) => {
                      const forms = merakiState.data?.abilities?.[slot] ?? [];
                      const primary = forms[0];
                      if (!primary) return null;
                      return (
                        <div
                          key={`mk-${slot}`}
                          className="rounded-lg border border-baron-border bg-baron-inset p-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-baron-ink">
                              {slot} · {primary.name}
                            </span>
                            <span className="text-[10.5px] text-baron-accent-soft tabular-nums">
                              {primary.cooldown ? `CD ${primary.cooldown}s` : ""}{" "}
                              {primary.cost ? `· Cost ${primary.cost}` : ""}
                            </span>
                          </div>
                          {primary.effects[0] && (
                            <p className="mt-1 line-clamp-2 text-[11px] text-baron-ink-secondary">
                              {primary.effects[0]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* SUBTAB: SKINS & PATCH TRENDS */}
        {!isLoading && !error && subTab === "skins" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <h2 className="mb-3 text-[13.5px] font-bold text-baron-ink">
                Win Rate &amp; Pick Rate Trends
              </h2>
              {(desktop?.trends?.win?.length ?? 0) === 0 ? (
                <div className="text-[12px] text-baron-ink-muted">
                  Patch trend history is published for Summoner&apos;s Rift ranked/flex modes.
                </div>
              ) : (
                <div className="space-y-2 tabular-nums">
                  {desktop?.trends?.win?.map((pt) => {
                    const pickPt = desktop.trends?.pick?.find((p) => p.version === pt.version);
                    const banPt = desktop.trends?.ban?.find((p) => p.version === pt.version);
                    return (
                      <div
                        key={`trend-${pt.version}`}
                        className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-[12px]"
                      >
                        <span className="font-bold text-baron-ink">Patch {pt.version}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-baron-victory">
                            {pctLabel(pt.rate)} WR
                          </span>
                          <span className="text-baron-ink-secondary">
                            {pctLabel(pickPt?.rate)} Pick
                          </span>
                          <span className="text-baron-ink-muted">
                            {pctLabel(banPt?.rate)} Ban
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <h2 className="mb-3 text-[13.5px] font-bold text-baron-ink">
                OP.GG Popular Skins Ranking
              </h2>
              {(bundle?.skins?.length ?? 0) === 0 ? (
                <div className="text-[12px] text-baron-ink-muted">
                  Skin ranking stats populate via OP.GG MCP inside the Baron desktop app.
                </div>
              ) : (
                <div className="space-y-2">
                  {bundle?.skins.map((sk) => (
                    <div
                      key={`all-sk-${sk.skin_id}`}
                      className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2 text-[12px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-baron-gold tabular-nums">#{sk.rank}</span>
                        <span className="font-semibold text-baron-ink">{sk.skin_name}</span>
                      </div>
                      <span className="text-[10.5px] text-baron-ink-muted tabular-nums">
                        ID {sk.skin_id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
