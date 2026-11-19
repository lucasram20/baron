"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Globe,
  Monitor,
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";
import type { BaronRoute } from "@/components/shell/Sidebar";
import { LaneIcon, RankCrest } from "@/components/icons/LolIcons";
import SpotlightCard from "@/components/SpotlightCard";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Input } from "@/components/ui/input";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { champSplashUrl, champSquareUrl, itemIconUrl, profileIconUrl } from "@/lib/ddragon";
import {
  ALL_OPGG_REGIONS,
  fetchOpggLeaderboard,
  fetchOpggMultiRegionLeaderboard,
  isProviderAvailable,
  type LcuPlayerContext,
  type OpggLeaderboardResponse,
  type OpggLeaderboardRow,
  type OpggMultiRegionLeaderboardResponse,
  type OpggRegionOption,
  type OpggSummonerOverview,
  type ProviderMeta,
  type TierRole,
} from "@/lib/tauri";
import { ProviderDiagnosticsPanel } from "@/components/views/ProviderDiagnosticsPanel";
import { useTheme, type ThemePreference } from "@/lib/theme";

function formatDuration(secs = 0): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mapOpggPosToRole(pos?: string): TierRole {
  switch ((pos ?? "").toUpperCase()) {
    case "TOP":
      return "Top";
    case "JUNGLE":
      return "Jungle";
    case "ADC":
    case "BOTTOM":
      return "Bottom";
    case "SUPPORT":
    case "UTILITY":
      return "Utility";
    default:
      return "Middle";
  }
}

const TIER_WEIGHT: Record<string, number> = {
  CHALLENGER: 10,
  GRANDMASTER: 9,
  MASTER: 8,
  DIAMOND: 7,
  EMERALD: 6,
  PLATINUM: 5,
  GOLD: 4,
  SILVER: 3,
  BRONZE: 2,
  IRON: 1,
};

function mergeOpggRegions(dynamicRegions: OpggRegionOption[]): OpggRegionOption[] {
  const byCode = new Map<string, OpggRegionOption>();
  for (const r of ALL_OPGG_REGIONS) {
    byCode.set(r.code.toUpperCase(), r);
  }
  for (const r of dynamicRegions) {
    const code = r.code.trim().toUpperCase();
    if (code && !byCode.has(code)) {
      byCode.set(code, { code, label: r.label || code });
    }
  }
  return Array.from(byCode.values());
}

function regionFullLabel(code: string, options: OpggRegionOption[]): string {
  const upper = code.toUpperCase();
  return options.find((r) => r.code.toUpperCase() === upper)?.label ?? upper;
}

function extractBestStanding(leagueStats?: {
  game_type?: string;
  tier_info?: { tier?: string; division?: number; lp?: number };
  win?: number;
  lose?: number;
  is_hot_streak?: boolean;
}[]) {
  if (!Array.isArray(leagueStats) || leagueStats.length === 0) return undefined;
  return (
    leagueStats.find((s) => (s.game_type ?? "").toUpperCase() === "SOLORANKED") ??
    leagueStats.find((s) => (s.game_type ?? "").toUpperCase() === "FLEXRANKED") ??
    leagueStats.find((s) => Boolean(s.tier_info?.tier)) ??
    leagueStats[0]
  );
}

function computeMasteryStats(stat?: OpggLeaderboardRow["most_champion_stat"]) {
  const play = stat?.play ?? 0;
  const win = stat?.win ?? 0;
  const wr = play > 0 ? Math.round((win / play) * 100) : 0;
  const hasKda = play > 0 && stat?.kill !== undefined && stat?.death !== undefined;
  const avgK = hasKda ? ((stat?.kill ?? 0) / play).toFixed(1) : null;
  const avgD = hasKda ? ((stat?.death ?? 0) / play).toFixed(1) : null;
  const avgA = hasKda ? ((stat?.assist ?? 0) / play).toFixed(1) : null;
  const kdaRatio = hasKda
    ? (stat?.death ?? 0) > 0
      ? (((stat?.kill ?? 0) + (stat?.assist ?? 0)) / (stat?.death ?? 1)).toFixed(2)
      : "Perfect"
    : null;
  const avgOpScore =
    play > 0 && stat?.op_score !== undefined && stat.op_score > 0
      ? (stat.op_score / play).toFixed(1)
      : null;
  return { play, win, wr, avgK, avgD, avgA, kdaRatio, avgOpScore };
}

function standingSortScore(row: OpggLeaderboardRow): number {
  const st = extractBestStanding(row.summoner?.league_stats);
  const tierW = TIER_WEIGHT[(st?.tier_info?.tier ?? "").toUpperCase()] ?? 0;
  const lp = st?.tier_info?.lp ?? 0;
  return tierW * 100_000 + lp;
}

const LEADERBOARD_CHAMPS = [
  "Ahri",
  "Lee Sin",
  "Jinx",
  "Thresh",
  "Aatrox",
  "Syndra",
  "Kai'Sa",
  "Viego",
  "Yasuo",
  "Darius",
] as const;

export function DashboardView({
  ddVersion,
  patch,
  refreshNonce = 0,
  onNavigate,
  lcuPlayer = null,
  isViewingLcuAccount = false,
  onSwitchToMyLcuAccount,
  onClearSummoner,
  summonerData,
  summonerLoading,
  summonerError,
  activeRegion,
  regions = [],
  onLookupSummoner,
  onOpenMatch,
  onOpenBuild,
}: {
  ddVersion: string;
  patch: string;
  refreshNonce?: number;
  onNavigate: (route: BaronRoute) => void;
  lcuPlayer?: LcuPlayerContext | null;
  isViewingLcuAccount?: boolean;
  onSwitchToMyLcuAccount?: () => void;
  onClearSummoner?: () => void;
  summonerData?: OpggSummonerOverview | null;
  summonerLoading?: boolean;
  summonerError?: string | null;
  activeRegion?: string;
  regions?: OpggRegionOption[];
  onLookupSummoner?: (gameName: string, tagLine: string, region: string) => void;
  onOpenMatch?: (gameId: string, createdAt: string) => void;
  onOpenBuild?: (champion: string, role: TierRole) => void;
}) {
  const { resolved } = useTheme();
  const [riotIdInput, setRiotIdInput] = useState("");
  const [manualRegionInput, setManualRegionInput] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"all" | "SOLORANKED" | "FLEXRANKED">("all");
  const [lpIdx, setLpIdx] = useState(0);
  const [boardRegion, setBoardRegion] = useState<string>("ALL");
  const [boardChamp, setBoardChamp] = useState<string>("Ahri");
  const [dashBoardState, setDashBoardState] = useState<{
    key: string;
    multi: OpggMultiRegionLeaderboardResponse | null;
    single: OpggLeaderboardResponse | null;
    error: string | null;
  }>({ key: "", multi: null, single: null, error: null });

  const regionOptions = mergeOpggRegions(regions);
  const regionInput = manualRegionInput ?? activeRegion ?? "KR";

  const summoner = summonerData?.profile?.data?.summoner;
  const matches = summonerData?.matches?.data?.game_history ?? [];
  const matchesError = summonerData?.matchesError ?? null;

  const displayName =
    summoner?.game_name ??
    (isViewingLcuAccount && lcuPlayer?.connected ? lcuPlayer.gameName : null);
  const displayTag =
    summoner?.tagline ??
    (isViewingLcuAccount && lcuPlayer?.connected ? lcuPlayer.tagLine : "");
  const displayRegion =
    summoner?.region ??
    (isViewingLcuAccount && lcuPlayer?.connected
      ? lcuPlayer.opggRegion
      : activeRegion ?? regionInput);
  const displayLevel =
    summoner?.level ??
    (isViewingLcuAccount && lcuPlayer?.connected ? lcuPlayer.summonerLevel : undefined);
  const displayAvatar =
    summoner?.profile_image_url ??
    (isViewingLcuAccount && lcuPlayer?.connected
      ? profileIconUrl(lcuPlayer.profileIconId || 1, ddVersion)
      : undefined);

  const soloStat = extractBestStanding(summoner?.league_stats);
  const lcuSolo = isViewingLcuAccount ? lcuPlayer?.soloRanked : null;
  const effectiveTier = soloStat?.tier_info?.tier ?? lcuSolo?.tier ?? "UNRANKED";
  const effectiveDiv = soloStat?.tier_info?.division
    ? String(soloStat.tier_info.division)
    : lcuSolo?.division ?? "";
  const effectiveLp = soloStat?.tier_info?.lp ?? lcuSolo?.leaguePoints ?? 0;
  const wins = soloStat?.win ?? lcuSolo?.wins ?? 0;
  const losses = soloStat?.lose ?? lcuSolo?.losses ?? 0;
  const totalGames = wins + losses;
  const wrPct = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const lpPoints = (summoner?.lp_histories ?? [])
    .slice(0, 8)
    .toReversed()
    .map((pt) => ({
      val: pt.elo_point ?? pt.tier_info?.lp ?? 0,
      label: `${pt.tier_info?.tier ?? ""} ${pt.tier_info?.lp ?? 0} LP`.trim(),
    }));
  const activeLpIdx = Math.min(lpIdx, Math.max(0, lpPoints.length - 1));

  const championPool =
    summoner?.most_champions?.champion_stats?.length
      ? summoner.most_champions.champion_stats
      : (summoner?.ranked_most_champions?.my_champion_stats ?? []).map((c) => ({
          id: c.id,
          champion_name: c.champion_name,
          play: c.play,
          win: c.win,
          lose: c.lose,
          kill: undefined,
          death: undefined,
          assist: undefined,
        }));

  const heroChamp =
    championPool[0]?.champion_name ??
    matches[0]?.participants?.find((p) => p.summoner?.game_name === summoner?.game_name)
      ?.champion_name ??
    matches[0]?.participants?.[0]?.champion_name ??
    null;

  const filteredMatches =
    queueFilter === "all"
      ? matches
      : matches.filter((m) => (m.game_type ?? "").toUpperCase() === queueFilter);

  const regionCodesKey = regionOptions.map((r) => r.code).join(",");
  const dashBoardKey = `${boardRegion}:${boardChamp}:${refreshNonce}`;
  const dashBoardLoading = !displayName && dashBoardState.key !== dashBoardKey;

  useEffect(() => {
    if (displayName) return;
    let cancelled = false;
    if (boardRegion === "ALL") {
      const codes = regionCodesKey.split(",").filter(Boolean);
      fetchOpggMultiRegionLeaderboard(boardChamp, codes)
        .then((multi) => {
          if (!cancelled) setDashBoardState({ key: dashBoardKey, multi, single: null, error: null });
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setDashBoardState({
              key: dashBoardKey,
              multi: null,
              single: null,
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to load global OP.GG regional leaderboard.",
            });
          }
        });
    } else {
      fetchOpggLeaderboard(boardRegion, boardChamp)
        .then((single) => {
          if (!cancelled) {
            setDashBoardState({ key: dashBoardKey, multi: null, single, error: null });
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setDashBoardState({
              key: dashBoardKey,
              multi: null,
              single: null,
              error:
                err instanceof Error ? err.message : `Failed to load ${boardRegion} leaderboard.`,
            });
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [displayName, boardRegion, boardChamp, dashBoardKey, regionCodesKey]);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLookupSummoner) return;
    const raw = riotIdInput.trim();
    if (!raw.includes("#")) return;
    const [namePart, tagPart] = raw.split("#", 2);
    if (namePart.trim() && tagPart.trim()) {
      setQueueFilter("all");
      onLookupSummoner(namePart.trim(), tagPart.trim(), regionInput);
    }
  };

  const dashGlobalRows: { region: string; row: OpggLeaderboardRow }[] =
    dashBoardState.key === dashBoardKey
      ? boardRegion === "ALL"
        ? (dashBoardState.multi?.regions ?? [])
            .flatMap((entry) =>
              (entry.leaderboard ?? []).slice(0, 5).map((row) => ({ region: entry.region, row })),
            )
            .toSorted((a, b) => standingSortScore(b.row) - standingSortScore(a.row))
        : (dashBoardState.single?.leaderboard ?? []).map((row) => ({ region: boardRegion, row }))
      : [];
  const dashBoardError = dashBoardState.key === dashBoardKey ? dashBoardState.error : null;

  return (
    <div className="min-h-full">
      {/* Live Riot ID Lookup & Active LCU Account Bar */}
      <form
        onSubmit={handleSubmitSearch}
        className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-3 shadow-[inset_0_1px_0_var(--baron-top-sheen)]"
      >
        <div className="flex flex-wrap items-center gap-2">
          {displayName && onClearSummoner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQueueFilter("all");
                onClearSummoner();
              }}
              className="h-8 gap-1.5 border-baron-border bg-baron-elevated px-2.5 text-[11.5px] font-semibold text-baron-ink hover:border-baron-border-strong"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Regions</span>
            </Button>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-baron-ink-muted" />
            <Input
              type="text"
              value={riotIdInput}
              onChange={(e) => setRiotIdInput(e.target.value)}
              placeholder="Search Riot ID (Name#TAG)"
              aria-label="Enter Riot ID to search OP.GG"
              className="h-8 w-64 border-baron-border bg-baron-inset pr-3 pl-8 text-[12px] text-baron-ink placeholder:text-baron-ink-muted sm:w-72"
            />
          </div>

          <Select value={regionInput} onValueChange={setManualRegionInput}>
            <SelectTrigger
              size="sm"
              aria-label="Select summoner region"
              className="h-8 min-w-[132px] border-baron-border bg-baron-inset text-[12px] font-semibold text-baron-ink"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="baron-popover-surface border-baron-border-strong bg-baron-surface"
            >
              {regionOptions.map((r) => (
                <SelectItem key={r.code} value={r.code} className="text-[12px]">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="submit"
            size="sm"
            disabled={!riotIdInput.includes("#") || Boolean(summonerLoading)}
            className="h-8 bg-baron-accent px-3.5 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110"
          >
            {summonerLoading ? "Fetching OP.GG..." : "Search OP.GG"}
          </Button>

          {lcuPlayer?.connected && !isViewingLcuAccount && onSwitchToMyLcuAccount && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSwitchToMyLcuAccount}
              className="h-8 border-baron-emerald/40 bg-baron-emerald/10 px-3 text-[11.5px] font-semibold text-baron-emerald hover:bg-baron-emerald/20"
            >
              My Account ({lcuPlayer.gameName}#{lcuPlayer.tagLine})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11.5px] text-baron-ink-muted">
          <span>
            {lcuPlayer?.connected
              ? `LCU Synced (${lcuPlayer.gameName}#${lcuPlayer.tagLine}) · Patch ${patch}`
              : `Live OP.GG MCP · Patch ${patch}`}
          </span>
          <button
            type="button"
            onClick={() => onNavigate("tierlist")}
            className="font-semibold text-baron-accent-soft hover:underline"
          >
            Open Live Tierlist →
          </button>
        </div>
      </form>

      {summonerLoading && !displayName && (
        <div role="status" className="space-y-4 p-5">
          <div className="text-[12px] text-baron-ink-muted">
            Loading live summoner profile and recent matches from OP.GG MCP...
          </div>
          <Skeleton className="h-36 w-full rounded-xl bg-baron-surface" />
          <Skeleton className="h-64 w-full rounded-xl bg-baron-surface" />
        </div>
      )}

      {!summonerLoading && summonerError && !displayName && (
        <div
          role="alert"
          className="baron-surface-card m-5 rounded-xl border border-baron-border bg-baron-surface p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
            <div>
              <div className="text-[13.5px] font-bold text-baron-ink">
                Live Summoner Lookup Unavailable
              </div>
              <p className="mt-1 text-[12px] text-baron-ink-secondary">{summonerError}</p>
            </div>
          </div>
        </div>
      )}

      {/* LCU Status Strip + Live All-Regions Player Leaderboard on Dashboard */}
      {!summonerLoading && !displayName && (
        <div className="space-y-4 p-5">
          <div className="baron-surface-card relative rounded-xl border border-baron-border bg-baron-surface px-5 py-3.5">
            <GlowingEffect
              variant="baron"
              spread={40}
              proximity={64}
              inactiveZone={0.18}
              borderWidth={1}
              disabled={false}
            />
            <BorderBeam
              size={110}
              duration={12}
              colorFrom="#d46233"
              colorTo="#eab349"
              borderWidth={1}
              className="opacity-45"
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[15px] font-extrabold tracking-[-0.02em] text-baron-ink">
                    {lcuPlayer?.connected
                      ? `League Client Connected · ${lcuPlayer.gameName}#${lcuPlayer.tagLine}`
                      : "Waiting for League of Legends Client"}
                  </h1>
                  <span className="rounded-md border border-baron-border-strong bg-baron-elevated px-2 py-0.5 text-[10px] font-semibold text-baron-ink-secondary">
                    Zero-login LCU auto-sync
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-baron-ink-secondary">
                  Launch League to auto-sync your Riot ID &amp; 1-click OP.GG runes, search any{" "}
                  <strong className="text-baron-ink">Name#TAG</strong> above, or click any regional
                  Master+ player below to inspect their profile and match history.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onNavigate("tierlist")}
                  className="h-8 bg-baron-accent px-3 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110"
                >
                  Tierlist &amp; Builds
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("leaderboards")}
                  className="h-8 border-baron-border bg-baron-elevated px-3 text-[12px] text-baron-ink hover:border-baron-border-strong"
                >
                  Champion Master+ Cards
                </Button>
              </div>
            </div>
          </div>

          {/* Live All-Regions Master+ Players Leaderboard */}
          <section className="baron-surface-card overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
            <div className="border-b border-baron-border px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Globe className="h-4 w-4 text-baron-accent-soft" />
                    <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-baron-ink">
                      Global &amp; Regional Master+ Players
                    </h2>
                    <span className="rounded-md border border-baron-emerald/30 bg-baron-emerald/12 px-2 py-0.5 text-[10px] font-semibold text-baron-emerald">
                      Live · All {regionOptions.length} Regions
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-baron-ink-muted">
                    Top Master+ &amp; Challenger {boardChamp} specialists across every League server
                    from OP.GG MCP. Click any row to load their live match history.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {LEADERBOARD_CHAMPS.slice(0, 8).map((c) => {
                    const active = boardChamp === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBoardChamp(c)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                          active
                            ? "border-baron-accent/60 bg-baron-accent/15 text-baron-ink"
                            : "border-baron-border bg-baron-inset text-baron-ink-secondary hover:border-baron-border-strong hover:text-baron-ink"
                        }`}
                      >
                        <img
                          src={champSquareUrl(c, ddVersion)}
                          alt={c}
                          className="h-3.5 w-3.5 rounded-[2px] object-cover"
                        />
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* All 15 Regions Filter Strip */}
              <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-baron-border/70 pt-2.5">
                <button
                  type="button"
                  onClick={() => setBoardRegion("ALL")}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    boardRegion === "ALL"
                      ? "bg-baron-accent text-white shadow-xs"
                      : "bg-baron-inset text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink"
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  <span>All Regions ({regionOptions.length})</span>
                </button>
                <span className="mx-1 h-4 w-px bg-baron-border" aria-hidden="true" />
                {regionOptions.map((r) => {
                  const active = boardRegion === r.code;
                  return (
                    <button
                      key={r.code}
                      type="button"
                      title={r.label}
                      onClick={() => setBoardRegion(r.code)}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                        active
                          ? "bg-baron-accent text-white shadow-xs"
                          : "bg-baron-inset text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink"
                      }`}
                    >
                      {r.code}
                    </button>
                  );
                })}
              </div>
            </div>

            {dashBoardLoading && (
              <div role="status" className="space-y-2 p-4">
                <div className="text-[11.5px] text-baron-ink-muted">
                  Fetching live OP.GG Master+ players across{" "}
                  {boardRegion === "ALL" ? `all ${regionOptions.length} regions` : boardRegion}...
                </div>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-10 w-full rounded-lg bg-baron-inset" />
                ))}
              </div>
            )}

            {!dashBoardLoading && dashBoardError && (
              <div role="alert" className="p-5 text-[12px] text-baron-ink-secondary">
                <span className="font-bold text-baron-ink">Regional leaderboard unavailable: </span>
                {dashBoardError}
              </div>
            )}

            {!dashBoardLoading && !dashBoardError && dashGlobalRows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="border-baron-border hover:bg-transparent">
                    <TableHead className="w-14 pl-4 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                      #
                    </TableHead>
                    <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                      Summoner
                    </TableHead>
                    <TableHead className="w-20 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                      Region
                    </TableHead>
                    <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                      Standing
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                      LP
                    </TableHead>
                    <TableHead className="text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                      KDA
                    </TableHead>
                    <TableHead className="pr-4 text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                      {boardChamp} WR / Games
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashGlobalRows.map(({ region: rowRegion, row }, idx) => {
                    const s = row.summoner;
                    const standing = extractBestStanding(s?.league_stats);
                    const tier = standing?.tier_info?.tier ?? "MASTER";
                    const lp = standing?.tier_info?.lp ?? 0;
                    const m = computeMasteryStats(row.most_champion_stat);
                    const displayIdx = boardRegion === "ALL" ? idx + 1 : row.rank;

                    return (
                      <TableRow
                        key={`${rowRegion}-${row.rank}-${s?.game_name ?? idx}`}
                        onClick={() => {
                          if (s?.game_name && s?.tagline) {
                            setManualRegionInput(rowRegion);
                            setQueueFilter("all");
                            onLookupSummoner?.(s.game_name, s.tagline, rowRegion);
                          }
                        }}
                        className="group cursor-pointer border-baron-border/75 transition-colors hover:bg-baron-hover/45"
                      >
                        <TableCell className="pl-4 font-bold tnum">
                          <span
                            className={
                              displayIdx === 1
                                ? "text-baron-gold"
                                : displayIdx <= 3
                                  ? "text-baron-cyan"
                                  : "text-baron-ink-muted"
                            }
                          >
                            #{displayIdx}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <img
                              src={s?.profile_image_url || champSquareUrl(boardChamp, ddVersion)}
                              alt={s?.game_name ?? "Summoner"}
                              className="h-7 w-7 rounded-md border border-baron-border-strong/75 object-cover transition-transform duration-150 group-hover:scale-105"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-baron-ink">{s?.game_name}</span>{" "}
                              <span className="text-[11px] text-baron-ink-muted">
                                #{s?.tagline}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded border border-baron-border-strong bg-baron-elevated px-1.5 py-0.5 text-[10px] font-bold text-baron-ink-secondary">
                            {rowRegion}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-baron-cyan">
                            <RankCrest tier={tier} className="h-3.5 w-3.5" />
                            {tier}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-baron-cyan tnum">
                          {lp.toLocaleString()} LP
                        </TableCell>
                        <TableCell className="text-right text-[11.5px] text-baron-ink-secondary tnum">
                          {m.kdaRatio ? `${m.kdaRatio}:1` : "—"}
                        </TableCell>
                        <TableCell className="pr-4 text-right text-[12px] tnum">
                          <span
                            className={`font-bold ${
                              m.wr >= 55
                                ? "text-baron-emerald"
                                : m.wr >= 50
                                  ? "text-baron-victory"
                                  : "text-baron-ink-secondary"
                            }`}
                          >
                            {m.wr}%
                          </span>{" "}
                          <span className="text-baron-ink-muted">
                            ({m.play.toLocaleString()}G)
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      )}

      {/* Live Riot Account Hero + OP.GG Match Ledger */}
      {displayName && (
        <>
          <SpotlightCard
            theme={resolved}
            intensity={0.075}
            borderGlow={0.5}
            style={{ borderRadius: 0 }}
            className="relative overflow-hidden rounded-none border-x-0 border-t-0 border-b border-baron-border bg-baron-surface p-0"
          >
            {heroChamp && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-[48%] bg-cover bg-center opacity-[0.26] dark:opacity-[0.28]"
                style={{
                  backgroundImage: `url('${champSplashUrl(heroChamp, 0)}')`,
                  maskImage: "linear-gradient(to left, rgba(0,0,0,0.92) 20%, transparent 94%)",
                  WebkitMaskImage:
                    "linear-gradient(to left, rgba(0,0,0,0.92) 20%, transparent 94%)",
                }}
              />
            )}

            <div className="relative z-10 grid grid-cols-1 items-center gap-5 px-5 pt-4 pb-3.5 lg:grid-cols-[auto_minmax(240px,1fr)_auto]">
              {/* Identity */}
              <div className="flex items-center gap-3.5">
                <div className="relative h-[56px] w-[56px] shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      className="h-[56px] w-[56px] rounded-[11px] border-2 border-baron-border-strong object-cover shadow-md"
                    />
                  ) : (
                    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-[11px] border-2 border-baron-border-strong bg-baron-elevated text-[18px] font-black text-baron-ink">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {displayLevel !== undefined && displayLevel > 0 && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-baron-elevated px-1.5 py-[1px] text-[10px] font-bold text-baron-ink ring-1 ring-baron-border-strong tnum">
                      {displayLevel}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h1 className="text-[19px] font-extrabold tracking-[-0.025em] text-baron-ink">
                      {displayName}
                    </h1>
                    {displayTag && (
                      <span className="text-[13px] font-semibold text-baron-ink-muted">
                        #{displayTag}
                      </span>
                    )}
                    <span className="rounded-md border border-baron-emerald/30 bg-baron-emerald/12 px-1.5 py-0.5 text-[10px] font-bold text-baron-emerald uppercase">
                      {displayRegion} · {isViewingLcuAccount ? "My Riot Account (LCU)" : "Live OP.GG"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] font-bold text-baron-cyan tnum">
                    <RankCrest tier={effectiveTier} className="h-3.5 w-3.5" />
                    <span>
                      {effectiveTier}
                      {effectiveDiv ? ` · ${effectiveDiv}` : ""} ·{" "}
                      <NumberTicker value={effectiveLp} className="text-baron-cyan" /> LP
                    </span>
                    {soloStat?.is_hot_streak && (
                      <span className="rounded bg-baron-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-baron-gold">
                        Hot Streak
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Smooth Interactive LP History Area Curve */}
              <div className="min-w-0">
                {lpPoints.length >= 2 ? (
                  <>
                    <div className="mb-0.5 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-baron-ink-secondary">LP History</span>
                      <span className="font-bold text-baron-accent-soft tnum">
                        {lpPoints[activeLpIdx]?.label ?? lpPoints[lpPoints.length - 1]?.label}
                      </span>
                    </div>
                    <svg viewBox="0 0 360 68" className="h-[68px] w-full overflow-visible">
                      <defs>
                        <linearGradient id="baronLpAreaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--baron-accent)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--baron-accent)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const vals = lpPoints.map((p) => p.val);
                        const minV = Math.min(...vals) - 10;
                        const maxV = Math.max(...vals) + 10;
                        const span = Math.max(1, maxV - minV);
                        const pts = lpPoints.map((p, i) => ({
                          x: 16 + (i * 328) / (lpPoints.length - 1),
                          y: 56 - ((p.val - minV) / span) * 44,
                          i,
                        }));
                        let d = `M ${pts[0].x} ${pts[0].y}`;
                        for (let i = 0; i < pts.length - 1; i++) {
                          const mx = (pts[i].x + pts[i + 1].x) / 2;
                          d += ` C ${mx} ${pts[i].y}, ${mx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
                        }
                        const area = `${d} L ${pts[pts.length - 1].x} 62 L ${pts[0].x} 62 Z`;
                        const cur = pts[activeLpIdx] ?? pts[pts.length - 1];
                        return (
                          <>
                            <path d={area} fill="url(#baronLpAreaFill)" />
                            <path
                              d={d}
                              fill="none"
                              stroke="var(--baron-accent)"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <line
                              x1={cur.x}
                              x2={cur.x}
                              y1={6}
                              y2={62}
                              stroke="var(--baron-border-strong)"
                              strokeDasharray="2 2"
                            />
                            {pts.map((c) => (
                              <circle
                                key={c.i}
                                cx={c.x}
                                cy={c.y}
                                r={c.i === activeLpIdx ? 4.5 : 3}
                                fill={
                                  c.i === activeLpIdx
                                    ? "var(--baron-accent-soft)"
                                    : "var(--baron-surface)"
                                }
                                stroke="var(--baron-accent)"
                                strokeWidth="2"
                                className="cursor-pointer transition-all"
                                onMouseEnter={() => setLpIdx(c.i)}
                              />
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </>
                ) : (
                  <div className="text-[11.5px] text-baron-ink-muted">
                    Ladder Rank:{" "}
                    <strong className="text-baron-ink tnum">
                      {summoner?.ladder_rank?.rank
                        ? `#${summoner.ladder_rank.rank.toLocaleString()}`
                        : "Unranked"}
                    </strong>
                  </div>
                )}
              </div>

              {/* Standing Ring (@magicui/animated-circular-progress-bar via ScoreRing) */}
              <div className="flex items-center justify-end gap-3.5">
                <ScoreRing score={wrPct} size="lg" label="Solo/Duo Win Rate" />
                <div className="text-right">
                  <div className="text-[18px] font-extrabold text-baron-victory tnum">
                    <NumberTicker value={wrPct} className="text-baron-victory" />% WR
                  </div>
                  <div className="text-[11px] font-semibold text-baron-ink-muted tnum">
                    {wins}W {losses}L ({totalGames}G)
                  </div>
                </div>
              </div>
            </div>
          </SpotlightCard>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px]">
            {/* Left Live Match History */}
            <section className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-baron-border px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[13px] font-bold text-baron-ink">Recent Matches</h2>
                  <AnimatedTabs
                    layoutId="live-dash-queue"
                    ariaLabel="Filter matches by queue"
                    value={queueFilter}
                    onChange={setQueueFilter}
                    items={[
                      { id: "all", label: `All (${matches.length})` },
                      { id: "SOLORANKED", label: "Solo/Duo" },
                      { id: "FLEXRANKED", label: "Flex" },
                    ]}
                  />
                </div>
                <span className="text-[11px] text-baron-ink-muted">
                  Click a match to open 10-player scoreboard
                </span>
              </div>

              <div className="divide-y divide-baron-border/80">
                {filteredMatches.length === 0 ? (
                  <div className="space-y-2 px-5 py-10 text-center text-[12.5px] text-baron-ink-muted">
                    <div>
                      {summonerLoading
                        ? "Loading recent matches from OP.GG MCP..."
                        : summonerError
                          ? `OP.GG MCP history unavailable (${summonerError}). Your live League Client profile and rank remain synced above.`
                          : matchesError
                            ? `OP.GG MCP match history request returned an error (${matchesError}). Profile standing remains synced above.`
                            : matches.length === 0
                              ? "No recent matches returned by OP.GG MCP for this summoner (player may be inactive in the current patch window)."
                              : `No ${queueFilter === "SOLORANKED" ? "Solo/Duo" : "Flex"} matches in the last ${matches.length} games.`}
                    </div>
                    {matches.length > 0 && queueFilter !== "all" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQueueFilter("all")}
                        className="h-7 border-baron-border bg-baron-elevated px-3 text-[11.5px] text-baron-ink"
                      >
                        Show all {matches.length} recent matches
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredMatches.map((m) => {
                    const me =
                      m.participants?.find(
                        (p) =>
                          p.summoner?.game_name?.toLowerCase() === displayName.toLowerCase(),
                      ) ?? m.participants?.[0];
                    if (!me) return null;
                    const win = (me.stats?.result ?? "").toUpperCase() === "WIN";
                    const kills = me.stats?.kill ?? 0;
                    const deaths = me.stats?.death ?? 0;
                    const assists = me.stats?.assist ?? 0;
                    const cs =
                      (me.stats?.minion_kill ?? 0) + (me.stats?.neutral_minion_kill ?? 0);
                    const mins = Math.max(1, (m.game_length_second ?? 600) / 60);
                    const opScore = Math.round((me.stats?.op_score ?? 5) * 10);

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onOpenMatch?.(m.id, m.created_at)}
                        className={`group relative grid w-full cursor-pointer grid-cols-[96px_150px_132px_80px_1fr] items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-baron-hover/45 ${
                          win
                            ? "bg-gradient-to-r from-baron-victory/[0.08] via-transparent to-transparent"
                            : "bg-gradient-to-r from-baron-defeat/[0.08] via-transparent to-transparent"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute top-2 bottom-2 left-1 w-[2px] rounded-full ${
                            win ? "bg-baron-victory" : "bg-baron-defeat"
                          }`}
                        />

                        <div>
                          <div
                            className={`text-[12.5px] font-bold ${
                              win ? "text-baron-victory" : "text-baron-defeat"
                            }`}
                          >
                            {win ? "Victory" : "Defeat"}
                          </div>
                          <div className="text-[11px] text-baron-ink-muted tnum">
                            {formatDuration(m.game_length_second)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <img
                            src={champSquareUrl(me.champion_name, ddVersion)}
                            alt={me.champion_name}
                            className="h-9 w-9 shrink-0 rounded-md border border-baron-border-strong object-cover transition-transform duration-150 group-hover:scale-105"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-bold text-baron-ink">
                              {me.champion_name}
                            </div>
                            <div className="flex items-center gap-1 text-[10.5px] text-baron-ink-muted">
                              <LaneIcon role={me.position} className="h-3 w-3" />
                              <span>{me.position}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[12.5px] font-bold text-baron-ink tnum">
                            {kills} / <span className="text-baron-defeat">{deaths}</span> / {assists}
                          </div>
                          <div className="text-[11px] text-baron-ink-secondary tnum">
                            {(cs / mins).toFixed(1)} CS/m ({cs})
                          </div>
                        </div>

                        <div className="grid w-[68px] grid-cols-3 gap-[2px]">
                          {(me.items ?? []).slice(0, 6).map((itemId, idx) =>
                            itemId > 0 ? (
                              <img
                                key={`${m.id}-${itemId}-${idx}`}
                                src={itemIconUrl(itemId, ddVersion)}
                                alt={`Item ${itemId}`}
                                className="h-[21px] w-[21px] rounded-[3px] border border-baron-border object-cover"
                              />
                            ) : (
                              <span
                                key={`${m.id}-empty-${idx}`}
                                aria-hidden="true"
                                className="h-[21px] w-[21px] rounded-[3px] border border-baron-border/50 bg-baron-inset/70"
                              />
                            ),
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-baron-accent-soft">
                            <span>Scoreboard</span>
                            <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </span>
                          <ScoreRing score={opScore} size="sm" label={`OP Score ${opScore}`} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* Right Rail: Champion Pool from OP.GG */}
            <aside className="border-t border-baron-border bg-baron-surface/25 xl:border-t-0 xl:border-l">
              <div className="flex items-center justify-between border-b border-baron-border px-4 py-2.5">
                <h2 className="text-[13px] font-bold text-baron-ink">Champion Pool</h2>
                <button
                  type="button"
                  onClick={() => onNavigate("tierlist")}
                  className="text-[12px] font-semibold text-baron-accent-soft hover:underline"
                >
                  Live OP.GG →
                </button>
              </div>
              <div className="divide-y divide-baron-border/75">
                {championPool.slice(0, 7).map((c) => {
                  const g = c.play ?? 0;
                  const cw = c.win ?? 0;
                  const wr = g > 0 ? `${Math.round((cw / g) * 100)}%` : "-";
                  const kda =
                    c.kill === undefined && c.death === undefined
                      ? `${cw}W ${c.lose ?? Math.max(0, g - cw)}L`
                      : (c.death ?? 0) > 0
                        ? `${(((c.kill ?? 0) + (c.assist ?? 0)) / (c.death ?? 1)).toFixed(2)} KDA`
                        : "Perfect KDA";
                  const cname = c.champion_name ?? "Ahri";
                  return (
                    <button
                      key={cname}
                      type="button"
                      onClick={() =>
                        onOpenBuild?.(cname, mapOpggPosToRole(matches[0]?.participants?.[0]?.position))
                      }
                      className="group grid w-full grid-cols-[30px_minmax(0,1fr)_auto_auto] items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-baron-hover/55"
                    >
                      <img
                        src={champSquareUrl(cname, ddVersion)}
                        alt={cname}
                        className="h-7 w-7 rounded-md border border-baron-border object-cover transition-transform duration-150 group-hover:scale-105"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-semibold text-baron-ink">
                          {cname}
                        </div>
                        <div className="text-[10.5px] text-baron-ink-muted tnum">{kda}</div>
                      </div>
                      <span className="text-[12px] font-bold text-baron-emerald tnum">{wr}</span>
                      <span className="text-[11px] text-baron-ink-muted tnum">{g}G</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

export function LeaderboardsView({
  ddVersion,
  regions = [],
  defaultRegion = "ALL",
  refreshNonce = 0,
  onLookupSummoner,
}: {
  ddVersion: string;
  regions?: OpggRegionOption[];
  defaultRegion?: string;
  refreshNonce?: number;
  onLookupSummoner?: (gameName: string, tagLine: string, region: string) => void;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const regionOptions = mergeOpggRegions(regions);
  const [region, setRegion] = useState<string>("ALL");
  const [champion, setChampion] = useState<string>("Ahri");
  const [customChamp, setCustomChamp] = useState("");
  const [state, setState] = useState<{
    key: string;
    single: OpggLeaderboardResponse | null;
    multi: OpggMultiRegionLeaderboardResponse | null;
    error: string | null;
  }>({ key: "", single: null, multi: null, error: null });

  const regionCodesKey = regionOptions.map((r) => r.code).join(",");
  const reqKey = `${region}:${champion}:${refreshNonce}`;
  const isLoading = state.key !== reqKey;
  const preferredSingleRegion = defaultRegion && defaultRegion !== "ALL" ? defaultRegion : "KR";

  useEffect(() => {
    let cancelled = false;
    if (region === "ALL") {
      const codes = regionCodesKey.split(",").filter(Boolean);
      fetchOpggMultiRegionLeaderboard(champion, codes)
        .then((multi) => {
          if (!cancelled) setState({ key: reqKey, single: null, multi, error: null });
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setState({
              key: reqKey,
              single: null,
              multi: null,
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to load multi-region Champion Master+ leaderboards.",
            });
          }
        });
    } else {
      fetchOpggLeaderboard(region, champion)
        .then((single) => {
          if (!cancelled) setState({ key: reqKey, single, multi: null, error: null });
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setState({
              key: reqKey,
              single: null,
              multi: null,
              error: err instanceof Error ? err.message : "Failed to load OP.GG leaderboard.",
            });
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [region, champion, reqKey, regionCodesKey]);

  const rows = (state.key === reqKey ? state.single?.leaderboard : null) ?? [];
  const multiRegions = (state.key === reqKey ? state.multi?.regions : null) ?? [];
  const error = state.key === reqKey ? state.error : null;
  const isCustomChamp = !LEADERBOARD_CHAMPS.some(
    (c) => c.toLowerCase() === champion.toLowerCase(),
  );

  return (
    <div className="min-h-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-4 shadow-[inset_0_1px_0_var(--baron-top-sheen)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
              Champion Master+ Leaderboards
            </h1>
            <span className="rounded-md border border-baron-emerald/30 bg-baron-emerald/12 px-2 py-0.5 text-[10.5px] font-semibold text-baron-emerald">
              Live · OP.GG MCP
            </span>
            <span className="rounded-md border border-baron-accent/30 bg-baron-accent/12 px-2 py-0.5 text-[10.5px] font-semibold text-baron-accent-soft">
              All {regionOptions.length} Regions · Champion Specialists Only
            </span>
          </div>
          <p className="mt-1 text-[12px] text-baron-ink-muted">
            OP.GG MCP provides regional Champion Master+ specialist ladders per server (no general
            SoloQ player rank ladder). Compare all {regionOptions.length} regions side by side or
            drill into any server below.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customChamp.trim()) setChampion(customChamp.trim());
          }}
          className="relative flex items-center gap-2"
        >
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-baron-ink-muted" />
            <Input
              type="search"
              value={customChamp}
              onChange={(e) => setCustomChamp(e.target.value)}
              placeholder={`Search champion (${champion})...`}
              aria-label="Search leaderboard by champion"
              className="h-8 w-52 border-baron-border bg-baron-inset pr-2.5 pl-8 text-[12px] text-baron-ink placeholder:text-baron-ink-muted"
            />
          </div>
          {region === "ALL" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRegion(preferredSingleRegion)}
              className="h-8 border-baron-border bg-baron-elevated px-2.5 text-[11.5px] font-semibold text-baron-ink hover:border-baron-border-strong"
            >
              My Server ({preferredSingleRegion})
            </Button>
          )}
        </form>
      </header>

      {/* Dedicated Separated All-15-Regions Strip */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-baron-border bg-baron-surface/65 px-5 py-2.5">
        <button
          type="button"
          onClick={() => setRegion("ALL")}
          className={`relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
            region === "ALL"
              ? "text-white"
              : "bg-baron-inset text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink"
          }`}
        >
          {region === "ALL" && (
            <motion.span
              layoutId="leaderboard-region-pill"
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 520, damping: 38, mass: 0.55 }
              }
              className="absolute inset-0 rounded-md bg-baron-accent shadow-xs"
            />
          )}
          <Globe className="relative z-10 h-3.5 w-3.5" />
          <span className="relative z-10">All Regions ({regionOptions.length})</span>
        </button>

        <span className="mx-1 h-4 w-px bg-baron-border" aria-hidden="true" />

        {regionOptions.map((r) => {
          const active = region === r.code;
          return (
            <button
              key={r.code}
              type="button"
              title={r.label}
              onClick={() => setRegion(r.code)}
              className={`relative rounded-md px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                active
                  ? "text-white"
                  : "bg-baron-inset text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="leaderboard-region-pill"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 38, mass: 0.55 }
                  }
                  className="absolute inset-0 rounded-md bg-baron-accent shadow-xs"
                />
              )}
              <span className="relative z-10">{r.code}</span>
            </button>
          );
        })}
      </div>

      {/* Dedicated Champion Quick-Pick Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-baron-border bg-baron-surface/35 px-5 py-2">
        {LEADERBOARD_CHAMPS.map((c) => {
          const active = champion.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChampion(c)}
              className={`relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                active ? "text-baron-ink" : "text-baron-ink-secondary hover:text-baron-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="leaderboard-champ-pill"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 38, mass: 0.55 }
                  }
                  className="absolute inset-0 rounded-md border border-baron-accent/60 bg-baron-accent/15 shadow-[inset_0_1px_0_var(--baron-top-sheen)]"
                />
              )}
              <img
                src={champSquareUrl(c, ddVersion)}
                alt={c}
                className="relative z-10 h-4 w-4 rounded-[3px] object-cover"
              />
              <span className="relative z-10">{c}</span>
            </button>
          );
        })}
        {isCustomChamp && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-baron-accent/60 bg-baron-accent/15 px-2.5 py-1 text-[11.5px] font-semibold text-baron-ink">
            <img
              src={champSquareUrl(champion, ddVersion)}
              alt={champion}
              className="h-4 w-4 rounded-[3px] object-cover"
            />
            <span>{champion}</span>
          </span>
        )}
      </div>

      {isLoading && (
        <div role="status" className="p-5">
          {region === "ALL" ? (
            <div className="space-y-3">
              <div className="text-[12px] text-baron-ink-muted">
                Loading {champion} Master+ specialists across all {regionOptions.length} regions
                from OP.GG MCP...
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-xl bg-baron-surface" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full bg-baron-surface" />
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="baron-surface-card m-5 rounded-xl border border-baron-border bg-baron-surface p-5"
        >
          <div className="text-[13px] font-bold text-baron-ink">OP.GG Leaderboard Unavailable</div>
          <p className="mt-1 text-[12px] text-baron-ink-muted">{error}</p>
        </div>
      )}

      {/* Separated Multi-Region Cards View (All 15 Regions) */}
      {!isLoading && !error && region === "ALL" && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {multiRegions.map((entry) => {
            const topRows = (entry.leaderboard ?? []).slice(0, 5);
            const fullLabel = regionFullLabel(entry.region, regionOptions);
            return (
              <section
                key={entry.region}
                className="baron-surface-card flex flex-col overflow-hidden rounded-xl border border-baron-border bg-baron-surface"
              >
                <div className="flex items-center justify-between gap-2 border-b border-baron-border bg-baron-elevated/45 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded bg-baron-accent/18 px-1.5 py-0.5 text-[10.5px] font-extrabold text-baron-accent-soft">
                      {entry.region}
                    </span>
                    <h2 className="truncate text-[13px] font-bold text-baron-ink">{fullLabel}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegion(entry.region)}
                    className="shrink-0 text-[11px] font-semibold text-baron-accent-soft hover:underline"
                  >
                    Full {entry.region} →
                  </button>
                </div>

                {entry.error ? (
                  <div className="p-4 text-[11.5px] text-baron-ink-muted">{entry.error}</div>
                ) : topRows.length === 0 ? (
                  <div className="p-4 text-[11.5px] text-baron-ink-muted">
                    No {champion} Master+ entries returned for {entry.region}.
                  </div>
                ) : (
                  <div className="divide-y divide-baron-border/70">
                    {topRows.map((row) => {
                      const s = row.summoner;
                      const standing = extractBestStanding(s?.league_stats);
                      const tier = standing?.tier_info?.tier ?? "MASTER";
                      const lp = standing?.tier_info?.lp ?? 0;
                      const m = computeMasteryStats(row.most_champion_stat);
                      return (
                        <button
                          key={`${entry.region}-${row.rank}`}
                          type="button"
                          onClick={() => {
                            if (s?.game_name && s?.tagline) {
                              onLookupSummoner?.(s.game_name, s.tagline, entry.region);
                            }
                          }}
                          className="group grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 px-3.5 py-2 text-left transition-colors hover:bg-baron-hover/45"
                        >
                          <span
                            className={`text-[11.5px] font-extrabold tnum ${
                              row.rank === 1
                                ? "text-baron-gold"
                                : row.rank <= 3
                                  ? "text-baron-cyan"
                                  : "text-baron-ink-muted"
                            }`}
                          >
                            #{row.rank}
                          </span>
                          <div className="flex min-w-0 items-center gap-2">
                            <img
                              src={s?.profile_image_url || champSquareUrl(champion, ddVersion)}
                              alt={s?.game_name ?? "Summoner"}
                              className="h-6 w-6 shrink-0 rounded border border-baron-border-strong/75 object-cover"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-semibold text-baron-ink">
                                {s?.game_name}{" "}
                                <span className="text-[10.5px] font-normal text-baron-ink-muted">
                                  #{s?.tagline}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10.5px] text-baron-ink-muted tnum">
                                <RankCrest tier={tier} className="h-3 w-3" />
                                <span className="font-semibold text-baron-cyan">
                                  {tier} · {lp.toLocaleString()} LP
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-[11px] tnum">
                            <div className="font-bold text-baron-emerald">{m.wr}% WR</div>
                            <div className="text-[10px] text-baron-ink-muted">
                              {m.play.toLocaleString()}G
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Full Single-Region Specialist Table */}
      {!isLoading && !error && region !== "ALL" && (
        <Table>
          <TableHeader>
            <TableRow className="border-baron-border hover:bg-transparent">
              <TableHead className="w-16 pl-5 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Rank
              </TableHead>
              <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Summoner ({regionFullLabel(region, regionOptions)})
              </TableHead>
              <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Standing
              </TableHead>
              <TableHead className="text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                LP
              </TableHead>
              <TableHead className="text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Avg KDA
              </TableHead>
              <TableHead className="text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                OP Score
              </TableHead>
              <TableHead className="pr-5 text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                {champion} Games / WR
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const s = row.summoner;
              const standing = extractBestStanding(s?.league_stats);
              const tier = standing?.tier_info?.tier ?? "MASTER";
              const lp = standing?.tier_info?.lp ?? 0;
              const m = computeMasteryStats(row.most_champion_stat);

              return (
                <TableRow
                  key={`${region}-${row.rank}`}
                  onClick={() => {
                    if (s?.game_name && s?.tagline) {
                      onLookupSummoner?.(s.game_name, s.tagline, region);
                    }
                  }}
                  className="group cursor-pointer border-baron-border/75 transition-colors hover:bg-baron-hover/45"
                >
                  <TableCell className="pl-5 font-bold tnum">
                    <span
                      className={
                        row.rank === 1
                          ? "text-baron-gold"
                          : row.rank <= 3
                            ? "text-baron-cyan"
                            : "text-baron-ink-muted"
                      }
                    >
                      #{row.rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={s?.profile_image_url || champSquareUrl(champion, ddVersion)}
                        alt={s?.game_name ?? "Summoner"}
                        className="h-8 w-8 rounded-md border border-baron-border-strong/75 object-cover transition-transform duration-150 group-hover:scale-105"
                      />
                      <div>
                        <span className="font-semibold text-baron-ink">{s?.game_name}</span>{" "}
                        <span className="text-[11.5px] text-baron-ink-muted">#{s?.tagline}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-baron-cyan">
                      <RankCrest tier={tier} className="h-3.5 w-3.5" />
                      {tier}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-baron-cyan tnum">
                    {lp.toLocaleString()} LP
                  </TableCell>
                  <TableCell className="text-right text-[11.5px] tnum">
                    {m.kdaRatio ? (
                      <div>
                        <div className="font-semibold text-baron-ink">{m.kdaRatio}:1</div>
                        <div className="text-[10px] text-baron-ink-muted">
                          {m.avgK} / {m.avgD} / {m.avgA}
                        </div>
                      </div>
                    ) : (
                      <span className="text-baron-ink-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-baron-gold tnum">
                    {m.avgOpScore ?? "—"}
                  </TableCell>
                  <TableCell className="pr-5 text-right text-[12px] tnum">
                    <span
                      className={`font-bold ${
                        m.wr >= 55
                          ? "text-baron-emerald"
                          : m.wr >= 50
                            ? "text-baron-victory"
                            : "text-baron-ink-secondary"
                      }`}
                    >
                      {m.wr}%
                    </span>{" "}
                    <span className="text-baron-ink-muted">({m.play.toLocaleString()}G)</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

const THEME_CARDS: {
  id: ThemePreference;
  title: string;
  desc: string;
  icon: typeof Sun;
}[] = [
  {
    id: "dark",
    title: "Dark Warm",
    desc: "Smoked espresso-charcoal & terracotta-copper.",
    icon: Moon,
  },
  {
    id: "light",
    title: "Warm Light",
    desc: "Travertine linen & warm parchment surfaces.",
    icon: Sun,
  },
  {
    id: "system",
    title: "Match OS Theme",
    desc: "Follows Windows / macOS appearance.",
    icon: Monitor,
  },
];

export function DataStudioView({
  patch,
  period,
  providers,
  activeProviderId,
  onSelectProvider,
}: {
  patch: string;
  period: string;
  providers: ProviderMeta[];
  activeProviderId: string;
  onSelectProvider: (id: string) => void;
}) {
  const { preference, osTheme, setPreference } = useTheme();

  return (
    <div className="min-h-full divide-y divide-baron-border">
      <header className="bg-baron-surface px-5 py-4 shadow-[inset_0_1px_0_var(--baron-top-sheen)]">
        <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
          Data Studio &amp; Provider Runtime
        </h1>
        <p className="mt-1 text-[12.5px] text-baron-ink-muted">
          Configure appearance, inspect verified OP.GG MCP sources, and review local-first storage
          &amp; Riot Fair Play boundaries.
        </p>
      </header>

      <section className="px-5 py-4">
        <h2 className="mb-3 text-[12px] font-bold text-baron-ink">Appearance Theme</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_CARDS.map((card) => {
            const Icon = card.icon;
            const active = preference === card.id;
            const desc =
              card.id === "system"
                ? `Follows Windows / macOS · Currently ${osTheme === "light" ? "Warm Light" : "Dark Warm"}.`
                : card.desc;
            return (
              <div
                key={card.id}
                className="relative rounded-xl border border-baron-border bg-baron-surface"
              >
                <GlowingEffect
                  variant="baron"
                  spread={36}
                  proximity={52}
                  inactiveZone={0.15}
                  borderWidth={1}
                  disabled={false}
                />
                <button
                  type="button"
                  onClick={(e) => setPreference(card.id, e.currentTarget)}
                  aria-pressed={active}
                  className={`relative z-10 flex w-full items-start gap-3 rounded-xl p-3.5 text-left transition-colors ${
                    active
                      ? "bg-baron-accent/10 shadow-[inset_0_0_0_1px_rgba(242,149,96,0.48)]"
                      : "hover:bg-baron-hover/35"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? "bg-baron-accent text-white shadow-xs"
                        : "bg-baron-elevated text-baron-ink-secondary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-baron-ink">
                      <span>{card.title}</span>
                      {active && (
                        <span className="rounded bg-baron-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-baron-accent-soft">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-baron-ink-muted">{desc}</div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[12px] font-bold text-baron-ink">Meta &amp; Data Providers</h2>
          <span className="text-[11.5px] text-baron-ink-muted">
            Only verified OP.GG MCP endpoints can be selected
          </span>
        </div>

        <div className="baron-surface-card divide-y divide-baron-border overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
          {providers.map((p) => {
            const available = isProviderAvailable(p.id);
            const partialLive = p.id === "ugg" || p.id === "merakicdn";
            const active = activeProviderId === p.id;
            return (
              <div
                key={p.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  available || partialLive ? "" : "opacity-55"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${
                        available
                          ? "bg-baron-emerald"
                          : p.id === "ugg"
                            ? "bg-baron-victory"
                            : p.id === "merakicdn"
                              ? "bg-baron-cyan"
                              : "bg-baron-ink-muted"
                      }`}
                    />
                    <span className="text-[13px] font-bold text-baron-ink">{p.label}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        available
                          ? "bg-baron-emerald/15 text-baron-emerald"
                          : p.id === "ugg"
                            ? "bg-baron-victory/15 text-baron-victory"
                            : p.id === "merakicdn"
                              ? "bg-baron-cyan/15 text-baron-cyan"
                              : "bg-baron-elevated text-baron-ink-muted"
                      }`}
                    >
                      {available
                        ? "Live OP.GG MCP"
                        : p.id === "ugg"
                          ? "Builds Live"
                          : p.id === "merakicdn"
                            ? "Kit Live"
                            : "Unavailable"}
                    </span>
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-baron-ink-muted">
                    {p.roleTag} · {p.tierListUrl}
                  </div>
                </div>

                {available ? (
                  <button
                    type="button"
                    onClick={() => onSelectProvider(p.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
                      active
                        ? "bg-baron-accent text-white shadow-xs"
                        : "border border-baron-border bg-baron-elevated text-baron-ink hover:border-baron-border-strong"
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    <span>{active ? "Active Provider" : "Use Provider"}</span>
                  </button>
                ) : p.id === "ugg" ? (
                  <span className="rounded-md border border-baron-victory/30 bg-baron-victory/10 px-2.5 py-1 text-[11px] font-medium text-baron-victory">
                    Builds Live (Tierlist 403)
                  </span>
                ) : p.id === "merakicdn" ? (
                  <span className="rounded-md border border-baron-cyan/30 bg-baron-cyan/10 px-2.5 py-1 text-[11px] font-medium text-baron-cyan">
                    Kit Reference Only
                  </span>
                ) : (
                  <span className="rounded-md border border-baron-border bg-baron-inset px-2.5 py-1 text-[11px] font-medium text-baron-ink-muted">
                    Blocked / Token-Gated
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-2">
        <MagicCard
          className="rounded-xl p-4"
          gradientFrom="#d46233"
          gradientTo="#eab349"
          gradientColor="rgba(212, 98, 51, 0.09)"
          gradientSize={240}
        >
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-baron-ink">
            <Database className="h-4 w-4 text-baron-accent-soft" />
            <span>Local Cache &amp; Runtime Window</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-baron-ink-muted">
            Match summaries and cache persist locally inside{" "}
            <code className="text-baron-ink">baron.db</code>. Selected UI filter window:{" "}
            <strong className="text-baron-ink tnum">{patch}</strong> ·{" "}
            <strong className="text-baron-ink">{period}</strong>.
          </p>
        </MagicCard>

        <MagicCard
          className="rounded-xl p-4"
          gradientFrom="#4ec48b"
          gradientTo="#eab349"
          gradientColor="rgba(78, 196, 139, 0.08)"
          gradientSize={240}
        >
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-baron-ink">
            <ShieldCheck className="h-4 w-4 text-baron-emerald" />
            <span>Riot Games Fair Play Policy</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-baron-ink-muted">
            Zero automated enemy ult/summoner timers, zero Fog-of-War camp timers, zero Ranked
            lobby anonymity bypasses, and zero in-game input macros.
          </p>
        </MagicCard>
      </section>

      <div className="px-5 pb-6">
        <ProviderDiagnosticsPanel patch={patch} />
      </div>
    </div>
  );
}
