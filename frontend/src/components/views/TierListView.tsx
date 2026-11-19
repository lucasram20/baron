"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Layers, Search } from "lucide-react";
import { LaneIcon } from "@/components/icons/LolIcons";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChampionBuildView } from "@/components/views/ChampionBuildView";
import { champSquareUrl, LATEST_DDRAGON, LATEST_PATCH } from "@/lib/ddragon";
import {
  fetchUnifiedProviderTierList,
  OPGG_GAME_MODES,
  OPGG_TIER_FILTERS,
  type OpggGameMode,
  type OpggModeTierEntry,
  type TierRole,
} from "@/lib/tauri";

const LANE_TABS: { id: TierRole; label: string }[] = [
  { id: "Top", label: "Top" },
  { id: "Jungle", label: "Jungle" },
  { id: "Middle", label: "Mid" },
  { id: "Bottom", label: "Bot" },
  { id: "Utility", label: "Support" },
];

const UGG_SUPPORTED_MODES: OpggGameMode[] = ["ranked", "flex", "aram"];

function tierBadgeStyle(tier: string): string {
  const t = tier.trim().toUpperCase();
  if (t === "OP" || t === "S+" || t === "0") {
    return "border-baron-gold/40 bg-baron-gold/15 text-baron-gold shadow-[inset_0_1px_0_rgba(245,158,11,0.2)]";
  }
  if (t === "1" || t === "S" || t === "S-") {
    return "border-baron-accent/40 bg-baron-accent/18 text-baron-accent-soft shadow-[inset_0_1px_0_rgba(242,149,96,0.24)]";
  }
  if (t === "2" || t === "A+" || t === "A" || t === "A-") {
    return "border-baron-victory/35 bg-baron-victory/15 text-baron-victory";
  }
  if (t === "3" || t === "B+" || t === "B" || t === "B-") {
    return "border-baron-emerald/35 bg-baron-emerald/15 text-baron-emerald";
  }
  return "border-baron-border bg-baron-inset text-baron-ink-muted";
}

function tierDisplayLabel(tier: string): string {
  const t = tier.trim().toUpperCase();
  if (t === "0" || t === "OP") return "OP";
  return t;
}

export function TierListView({
  activeProviderId,
  activeProviderLabel,
  refreshNonce = 0,
  searchFilter = "",
  initialSelectedChampion = null,
  patch = LATEST_PATCH,
  period,
  ddVersion = LATEST_DDRAGON,
  defaultRegion = "NA",
}: {
  activeProviderId: string;
  activeProviderLabel: string;
  refreshNonce?: number;
  searchFilter?: string;
  initialSelectedChampion?: { champion: string; role: TierRole } | null;
  patch?: string;
  period?: string;
  ddVersion?: string;
  defaultRegion?: string;
}) {
  const [mode, setMode] = useState<OpggGameMode>("ranked");
  const [tierFilter, setTierFilter] = useState<string>("emerald_plus");
  const [role, setRole] = useState<TierRole>(initialSelectedChampion?.role ?? "Top");
  const [showMoreModes, setShowMoreModes] = useState(false);
  const [localFilter, setLocalFilter] = useState("");
  const [selectedChamp, setSelectedChamp] = useState<string | null>(
    initialSelectedChampion?.champion ?? null,
  );
  const [state, setState] = useState<{
    key: string;
    rows: OpggModeTierEntry[];
    error: string | null;
  }>({ key: "", rows: [], error: null });

  const effectiveMode: OpggGameMode =
    activeProviderId === "lolalytics"
      ? "ranked"
      : activeProviderId === "ugg" && !UGG_SUPPORTED_MODES.includes(mode)
        ? "ranked"
        : mode;

  const activeModeDef = OPGG_GAME_MODES.find((m) => m.id === effectiveMode) ?? OPGG_GAME_MODES[0];
  const lolaPeriodParam = activeProviderId === "lolalytics" ? period : undefined;
  const reqKey = `${activeProviderId}:${effectiveMode}:${role}:${tierFilter}:${patch}:${lolaPeriodParam ?? ""}:${refreshNonce}`;
  const isLoading = !selectedChamp && state.key !== reqKey;
  const rows = state.key === reqKey ? state.rows : [];
  const error = state.key === reqKey ? state.error : null;

  useEffect(() => {
    if (selectedChamp) return;
    let cancelled = false;
    fetchUnifiedProviderTierList(
      activeProviderId,
      effectiveMode,
      activeModeDef.hasRoles ? role : null,
      tierFilter,
      ddVersion,
      patch,
      lolaPeriodParam,
    )
      .then((data) => {
        if (!cancelled) setState({ key: reqKey, rows: data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            key: reqKey,
            rows: [],
            error:
              err instanceof Error
                ? err.message
                : `Failed to fetch live ${activeProviderLabel} tier data.`,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedChamp,
    activeProviderId,
    effectiveMode,
    role,
    tierFilter,
    patch,
    lolaPeriodParam,
    ddVersion,
    reqKey,
    activeModeDef.hasRoles,
    activeProviderLabel,
  ]);

  if (selectedChamp) {
    return (
      <ChampionBuildView
        champion={selectedChamp}
        role={role}
        mode={effectiveMode}
        tierFilter={tierFilter}
        patch={patch}
        ddVersion={ddVersion}
        region={defaultRegion}
        activeProviderId={activeProviderId}
        refreshNonce={refreshNonce}
        onChangeRole={(nextRole) => setRole(nextRole)}
        onChangeMode={(nextMode) => setMode(nextMode)}
        onChangeTierFilter={(nextTier) => setTierFilter(nextTier)}
        onSelectChampion={(nextChamp, nextRole) => {
          setSelectedChamp(nextChamp);
          setRole(nextRole);
        }}
        onBack={() => setSelectedChamp(null)}
      />
    );
  }

  const effectiveSearch = (localFilter || searchFilter).trim().toLowerCase();
  const filteredRows = effectiveSearch
    ? rows.filter((r) => r.championName.toLowerCase().includes(effectiveSearch))
    : rows;

  const isArena = effectiveMode === "arena";
  const isTierOnly = effectiveMode === "aram_mayhem" || effectiveMode === "brawl";
  const primaryModes =
    activeProviderId === "lolalytics"
      ? OPGG_GAME_MODES.filter((m) => m.id === "ranked")
      : activeProviderId === "ugg"
        ? OPGG_GAME_MODES.filter((m) => UGG_SUPPORTED_MODES.includes(m.id))
        : OPGG_GAME_MODES.filter((m) => m.primaryBar);
  const secondaryModes =
    activeProviderId === "opgg" ? OPGG_GAME_MODES.filter((m) => !m.primaryBar) : [];

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="border-b border-baron-border bg-baron-surface px-5 py-4 shadow-[inset_0_1px_0_var(--baron-top-sheen)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
                Tierlist &amp; Champion Builds · {activeModeDef.label}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md border border-baron-accent/30 bg-baron-accent/12 px-2 py-0.5 text-[10.5px] font-bold text-baron-accent-soft">
                <Layers className="h-3 w-3" />
                Live {activeProviderLabel} · Patch {patch}
                {activeProviderId === "lolalytics" && period ? ` · ${period}` : ""}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-baron-ink-muted">
              Click any champion for live builds, 3-column rune matrix, abilities, matchups &amp;
              side-by-side OP.GG, U.GG, LoLalytics &amp; Meraki comparison.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeModeDef.hasTierFilter && (
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger
                  size="sm"
                  aria-label={`Filter ${activeProviderLabel} rank tier`}
                  className="h-8 min-w-[146px] border-baron-border bg-baron-inset text-[12px] font-semibold text-baron-ink"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="baron-popover-surface border-baron-border-strong bg-baron-surface"
                >
                  {OPGG_TIER_FILTERS.map((tf) => (
                    <SelectItem key={tf.id} value={tf.id} className="text-[12px]">
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-baron-ink-muted" />
              <Input
                type="text"
                value={localFilter}
                onChange={(e) => setLocalFilter(e.target.value)}
                placeholder="Filter champion..."
                aria-label="Filter champions in tier list"
                className="h-8 w-48 border-baron-border bg-baron-inset pr-2.5 pl-8 text-[12px] text-baron-ink placeholder:text-baron-ink-muted"
              />
            </div>
          </div>
        </div>

        {/* Game Modes Bar (@aceternity AnimatedTabs + @shadcn Popover) */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-baron-border/80 pt-3">
          <AnimatedTabs
            layoutId="tierlist-game-modes"
            ariaLabel="Select League game mode"
            value={
              primaryModes.some((m) => m.id === effectiveMode)
                ? effectiveMode
                : ("__secondary__" as OpggGameMode)
            }
            onChange={(next) => {
              setMode(next);
              setShowMoreModes(false);
            }}
            items={primaryModes.map((m) => ({
              id: m.id,
              label: m.label,
              badge: m.badge ?? undefined,
            }))}
          />

          {secondaryModes.length > 0 && (
            <Popover open={showMoreModes} onOpenChange={setShowMoreModes}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-expanded={showMoreModes}
                  className={`flex h-[30px] items-center gap-1 rounded-lg border px-2.5 text-[12px] font-semibold transition-colors ${
                    !activeModeDef.primaryBar
                      ? "border-baron-accent/60 bg-baron-accent/15 text-baron-ink"
                      : "border-baron-border bg-baron-elevated/70 text-baron-ink-secondary hover:border-baron-border-strong hover:text-baron-ink"
                  }`}
                >
                  <span>{!activeModeDef.primaryBar ? activeModeDef.label : "More modes"}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-150 ${
                      showMoreModes ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="baron-popover-surface w-52 rounded-xl border-baron-border-strong bg-baron-surface/95 p-1.5 backdrop-blur-md"
              >
                {secondaryModes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMode(m.id);
                      setShowMoreModes(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                      effectiveMode === m.id
                        ? "bg-baron-accent/18 font-semibold text-baron-ink"
                        : "text-baron-ink-secondary hover:bg-baron-elevated hover:text-baron-ink"
                    }`}
                  >
                    <span>{m.label}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

          {activeModeDef.hasRoles && (
            <div className="ml-auto">
              <AnimatedTabs
                layoutId="tierlist-lane-tabs"
                ariaLabel="Filter by lane role"
                value={role}
                onChange={setRole}
                items={LANE_TABS.map((t) => ({
                  id: t.id,
                  label: t.label,
                  icon: <LaneIcon role={t.id} className="h-3.5 w-3.5" />,
                }))}
              />
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="p-5">
        {isLoading && (
          <div role="status" className="space-y-2">
            {Array.from({ length: 10 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-lg bg-baron-surface" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div
            role="alert"
            className="baron-surface-card rounded-xl border border-baron-border bg-baron-surface p-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-baron-gold" />
              <div>
                <h2 className="text-[14px] font-bold text-baron-ink">
                  Unable to Load Live {activeProviderLabel} Tier List
                </h2>
                <p className="mt-1 text-[12.5px] text-baron-ink-secondary">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && filteredRows.length === 0 && (
          <div className="baron-surface-card rounded-xl border border-baron-border bg-baron-surface p-6 text-[13px] text-baron-ink-muted">
            No champions match this filter for {activeModeDef.label}.
          </div>
        )}

        {!isLoading && !error && filteredRows.length > 0 && (
          <div className="baron-surface-card overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-baron-border bg-baron-inset/80 text-[10.5px] font-bold tracking-wider text-baron-ink-muted uppercase">
                    <th className="w-14 px-4 py-2.5">Rank</th>
                    <th className="px-4 py-2.5">Champion</th>
                    <th className="w-20 px-4 py-2.5 text-center">Tier</th>
                    {isArena ? (
                      <>
                        <th className="px-4 py-2.5 text-right">Avg. Place</th>
                        <th className="px-4 py-2.5 text-right">1st Rate</th>
                        <th className="px-4 py-2.5 text-right">Top 2 Rate</th>
                        <th className="px-4 py-2.5 text-right">Pick Rate</th>
                        <th className="px-4 py-2.5 text-right">Ban Rate</th>
                      </>
                    ) : isTierOnly ? (
                      <th className="px-4 py-2.5 text-right">Data Source</th>
                    ) : (
                      <>
                        <th className="px-4 py-2.5 text-right">Win Rate</th>
                        <th className="px-4 py-2.5 text-right">Pick Rate</th>
                        <th className="px-4 py-2.5 text-right">Ban Rate</th>
                        <th className="px-4 py-2.5 text-right">Games</th>
                      </>
                    )}
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-baron-border/70 tabular-nums">
                  {filteredRows.map((entry, idx) => {
                    const displayRank =
                      entry.rank > 0 && entry.rank < 999 ? entry.rank : idx + 1;
                    return (
                      <tr
                        key={`${entry.mode}-${entry.championId}-${entry.role}-${idx}`}
                        onClick={() => setSelectedChamp(entry.championName)}
                        className="group cursor-pointer transition-colors duration-150 hover:bg-baron-hover/55"
                      >
                        <td className="px-4 py-2.5 font-bold">
                          <span
                            className={
                              displayRank === 1
                                ? "text-baron-gold"
                                : displayRank <= 3
                                  ? "text-baron-cyan"
                                  : "text-baron-ink-muted"
                            }
                          >
                            #{displayRank}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={champSquareUrl(entry.championKey || entry.championName, ddVersion)}
                              alt={entry.championName}
                              className="h-8 w-8 rounded-lg border border-baron-border-strong/70 object-cover transition-transform duration-150 group-hover:scale-105"
                            />
                            <div>
                              <div className="font-bold text-baron-ink">{entry.championName}</div>
                              {activeModeDef.hasRoles && entry.role !== "Unknown" && (
                                <div className="text-[10.5px] text-baron-ink-muted">
                                  {entry.role}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-flex min-w-7 items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-extrabold ${tierBadgeStyle(entry.tier)}`}
                          >
                            {tierDisplayLabel(entry.tier)}
                          </span>
                        </td>

                        {isArena ? (
                          <>
                            <td className="px-4 py-2.5 text-right font-bold text-baron-ink">
                              {entry.avgPlace !== null ? entry.avgPlace.toFixed(2) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-baron-emerald">
                              {entry.firstRate !== null ? `${entry.firstRate.toFixed(2)}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-baron-victory">
                              {entry.top2Rate !== null ? `${entry.top2Rate.toFixed(2)}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-baron-ink-secondary">
                              {entry.pickRate > 0 ? `${entry.pickRate.toFixed(2)}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-baron-ink-muted">
                              {entry.banRate > 0 ? `${entry.banRate.toFixed(2)}%` : "—"}
                            </td>
                          </>
                        ) : isTierOnly ? (
                          <td className="px-4 py-2.5 text-right text-[11px] text-baron-ink-muted">
                            OP.GG Live Rank ·{" "}
                            {mode === "aram_mayhem" ? "Click for Mayhem Build" : "Tier Rank Only"}
                          </td>
                        ) : (
                          <>
                            <td
                              className={`px-4 py-2.5 text-right font-bold ${
                                entry.winRate >= 51.5
                                  ? "text-baron-victory"
                                  : entry.winRate > 0 && entry.winRate < 48.5
                                    ? "text-baron-defeat"
                                    : "text-baron-ink"
                              }`}
                            >
                              {entry.winRate > 0 ? `${entry.winRate.toFixed(2)}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-baron-ink-secondary">
                              {entry.pickRate > 0 ? `${entry.pickRate.toFixed(2)}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-baron-ink-muted">
                              {entry.banRate > 0 ? `${entry.banRate.toFixed(2)}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-baron-ink-secondary">
                              {entry.play > 0 ? entry.play.toLocaleString() : "—"}
                            </td>
                          </>
                        )}

                        <td className="px-3 py-2.5 text-right">
                          <ChevronRight className="h-4 w-4 text-baron-ink-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-baron-accent-soft" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
