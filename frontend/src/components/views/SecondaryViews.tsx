"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Database,
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
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
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
  fetchOpggLeaderboard,
  isProviderAvailable,
  type LcuPlayerContext,
  type OpggLeaderboardResponse,
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

export function DashboardView({
  ddVersion,
  onNavigate,
  lcuPlayer = null,
  isViewingLcuAccount = false,
  onSwitchToMyLcuAccount,
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
  onNavigate: (route: BaronRoute) => void;
  lcuPlayer?: LcuPlayerContext | null;
  isViewingLcuAccount?: boolean;
  onSwitchToMyLcuAccount?: () => void;
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
  const [regionInput, setRegionInput] = useState(activeRegion ?? "KR");
  const [queueFilter, setQueueFilter] = useState<"all" | "SOLORANKED" | "FLEXRANKED">("all");
  const [lpIdx, setLpIdx] = useState(0);
  const regionOptions =
    regions.length > 0 ? regions : [{ code: regionInput, label: regionInput }];

  const summoner = summonerData?.profile?.data?.summoner;
  const matches = summonerData?.matches?.data?.game_history ?? [];

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

  const soloStat = summoner?.league_stats?.find((s) => s.game_type === "SOLORANKED");
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

  const heroChamp =
    summoner?.most_champions?.champion_stats?.[0]?.champion_name ??
    matches[0]?.participants?.find((p) => p.summoner?.game_name === summoner?.game_name)
      ?.champion_name ??
    null;

  const filteredMatches =
    queueFilter === "all"
      ? matches
      : matches.filter((m) => (m.game_type ?? "").toUpperCase() === queueFilter);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLookupSummoner) return;
    const raw = riotIdInput.trim();
    if (!raw.includes("#")) return;
    const [namePart, tagPart] = raw.split("#", 2);
    if (namePart.trim() && tagPart.trim()) {
      onLookupSummoner(namePart.trim(), tagPart.trim(), regionInput);
    }
  };

  return (
    <div className="min-h-full">
      {/* Live Riot ID Lookup & Active LCU Account Bar */}
      <form
        onSubmit={handleSubmitSearch}
        className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-baron-ink-muted" />
            <input
              type="text"
              value={riotIdInput}
              onChange={(e) => setRiotIdInput(e.target.value)}
              placeholder="Search Riot ID (Name#TAG)"
              aria-label="Enter Riot ID to search OP.GG"
              className="h-8 w-64 rounded-md border border-baron-border bg-baron-inset pr-3 pl-8 text-[12px] text-baron-ink placeholder:text-baron-ink-muted focus:border-baron-accent focus:outline-none sm:w-72"
            />
          </div>

          <select
            value={regionInput}
            onChange={(e) => setRegionInput(e.target.value)}
            aria-label="Select summoner region"
            className="h-8 rounded-md border border-baron-border bg-baron-inset px-2.5 text-[12px] font-semibold text-baron-ink focus:border-baron-accent focus:outline-none"
          >
            {regionOptions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            size="sm"
            disabled={!riotIdInput.includes("#") || Boolean(summonerLoading)}
            className="h-8 bg-baron-accent px-3.5 text-[12px] font-semibold text-white hover:opacity-90"
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
              ? `LCU Synced (${lcuPlayer.gameName}#${lcuPlayer.tagLine}) · OP.GG MCP`
              : "Live data powered by OP.GG MCP"}
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
        <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5">
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

      {/* Honest LCU-First Empty State when League Client is Offline and No Search Active */}
      {!summonerLoading && !summonerError && !displayName && (
        <div className="p-5">
          <div className="rounded-xl border border-baron-border bg-baron-surface p-6">
            <h1 className="text-[17px] font-extrabold tracking-[-0.02em] text-baron-ink">
              Waiting for League of Legends Client
            </h1>
            <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-baron-ink-secondary">
              Baron requires no account login. Launch{" "}
              <strong className="text-baron-ink">League of Legends</strong> to automatically detect
              your active Riot ID, live Solo/Flex standing, Champ Select draft builds, and 1-click
              OP.GG rune imports — or search any Riot ID (<strong className="text-baron-ink">Name#TAG</strong>) above or via{" "}
              <strong className="text-baron-ink">Ctrl+K</strong>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onNavigate("tierlist")}
                className="h-8 bg-baron-accent px-3.5 text-[12px] font-semibold text-white"
              >
                Explore OP.GG Tierlist &amp; Builds
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigate("leaderboards")}
                className="h-8 border-baron-border bg-baron-elevated px-3.5 text-[12px] text-baron-ink"
              >
                View OP.GG Champion Leaderboards
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Riot Account Hero + OP.GG Match Ledger */}
      {displayName && (
        <>
          <SpotlightCard
            theme={resolved}
            intensity={0.07}
            borderGlow={0.45}
            style={{ borderRadius: 0 }}
            className="relative overflow-hidden rounded-none border-x-0 border-t-0 border-b border-baron-border bg-baron-surface"
          >
            {heroChamp && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-[44%] bg-cover bg-center opacity-[0.18] dark:opacity-[0.22]"
                style={{
                  backgroundImage: `url('${champSplashUrl(heroChamp, 0)}')`,
                  maskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
                  WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
                }}
              />
            )}

            <div className="relative z-10 grid grid-cols-1 items-center gap-5 px-5 pt-4 pb-3.5 lg:grid-cols-[auto_minmax(240px,1fr)_auto]">
              {/* Identity */}
              <div className="flex items-center gap-3.5">
                <div className="relative h-[54px] w-[54px] shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      className="h-[54px] w-[54px] rounded-[11px] border-2 border-baron-border-strong object-cover shadow-md"
                    />
                  ) : (
                    <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[11px] border-2 border-baron-border-strong bg-baron-elevated text-[18px] font-black text-baron-ink">
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
                    <span className="rounded bg-baron-emerald/15 px-1.5 py-0.5 text-[10px] font-bold text-baron-emerald uppercase">
                      {displayRegion} · {isViewingLcuAccount ? "My Riot Account (LCU)" : "Live OP.GG"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] font-bold text-baron-cyan tnum">
                    <RankCrest tier={effectiveTier} className="h-3.5 w-3.5" />
                    <span>
                      {effectiveTier}
                      {effectiveDiv ? ` · ${effectiveDiv}` : ""} · {effectiveLp} LP
                    </span>
                    {soloStat?.is_hot_streak && (
                      <span className="rounded bg-baron-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-baron-gold">
                        Hot Streak
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Real LP History Curve if available */}
              <div className="min-w-0">
                {lpPoints.length >= 2 ? (
                  <>
                    <div className="mb-0.5 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-baron-ink-secondary">LP History</span>
                      <span className="font-bold text-baron-accent-soft tnum">
                        {lpPoints[lpIdx]?.label ?? lpPoints[lpPoints.length - 1]?.label}
                      </span>
                    </div>
                    <svg viewBox="0 0 360 66" className="h-[66px] w-full overflow-visible">
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
                        return (
                          <>
                            <path d={d} fill="none" stroke="var(--baron-accent)" strokeWidth="2.1" />
                            {pts.map((c) => (
                              <circle
                                key={c.i}
                                cx={c.x}
                                cy={c.y}
                                r={c.i === lpIdx ? 4.5 : 3}
                                fill="var(--baron-surface)"
                                stroke="var(--baron-accent)"
                                strokeWidth="2"
                                className="cursor-pointer"
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

              {/* Standing Ring */}
              <div className="flex items-center justify-end gap-3.5">
                <ScoreRing score={wrPct} size="lg" label="Solo/Duo Win Rate" />
                <div className="text-right">
                  <div className="text-[18px] font-extrabold text-baron-victory tnum">
                    {wrPct}% WR
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

              <div className="divide-y divide-baron-border">
                {filteredMatches.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[12.5px] text-baron-ink-muted">
                    {summonerLoading
                      ? "Loading recent matches from OP.GG MCP..."
                      : summonerError
                        ? `OP.GG MCP history unavailable (${summonerError}). Your live League Client profile and rank remain synced above.`
                        : "No matches recorded for this queue filter."}
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
                        className={`grid w-full cursor-pointer grid-cols-[96px_150px_132px_80px_1fr] items-center gap-3 border-l-[3px] px-4 py-2.5 text-left transition-colors hover:bg-baron-surface/80 ${
                          win ? "border-l-baron-victory" : "border-l-baron-defeat"
                        }`}
                      >
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
                            className="h-9 w-9 shrink-0 rounded-md border border-baron-border-strong object-cover"
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
                          {(me.items ?? []).slice(0, 6).map((itemId, idx) => (
                            <img
                              key={`${m.id}-${itemId}-${idx}`}
                              src={itemIconUrl(itemId, ddVersion)}
                              alt={`Item ${itemId}`}
                              className="h-[21px] w-[21px] rounded-[3px] border border-baron-border object-cover"
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-baron-accent-soft">
                            <span>Scoreboard</span>
                            <ArrowRight className="h-3 w-3" />
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
            <aside className="border-t border-baron-border xl:border-t-0 xl:border-l">
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
              <div className="divide-y divide-baron-border">
                {(summoner?.most_champions?.champion_stats ?? []).slice(0, 7).map((c) => {
                  const g = c.play ?? 0;
                  const cw = c.win ?? 0;
                  const wr = g > 0 ? `${Math.round((cw / g) * 100)}%` : "-";
                  const kda =
                    (c.death ?? 0) > 0
                      ? (((c.kill ?? 0) + (c.assist ?? 0)) / (c.death ?? 1)).toFixed(2)
                      : "Perfect";
                  const cname = c.champion_name ?? "Ahri";
                  return (
                    <button
                      key={cname}
                      type="button"
                      onClick={() =>
                        onOpenBuild?.(cname, mapOpggPosToRole(matches[0]?.participants?.[0]?.position))
                      }
                      className="grid w-full grid-cols-[30px_minmax(0,1fr)_auto_auto] items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-baron-surface/80"
                    >
                      <img
                        src={champSquareUrl(cname, ddVersion)}
                        alt={cname}
                        className="h-7 w-7 rounded-md border border-baron-border object-cover"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-semibold text-baron-ink">
                          {cname}
                        </div>
                        <div className="text-[10.5px] text-baron-ink-muted tnum">
                          {kda} KDA
                        </div>
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

const LEADERBOARD_CHAMPS = ["Ahri", "Lee Sin", "Jinx", "Thresh", "Aatrox", "Syndra"] as const;

export function LeaderboardsView({
  ddVersion,
  regions = [],
  defaultRegion = "KR",
  onLookupSummoner,
}: {
  ddVersion: string;
  regions?: OpggRegionOption[];
  defaultRegion?: string;
  onLookupSummoner?: (gameName: string, tagLine: string, region: string) => void;
}) {
  const [region, setRegion] = useState<string>(defaultRegion || "KR");
  const [champion, setChampion] = useState<string>("Ahri");
  const [customChamp, setCustomChamp] = useState("");
  const regionOptions = regions.length > 0 ? regions : [{ code: region, label: region }];
  const [state, setState] = useState<{
    key: string;
    data: OpggLeaderboardResponse | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  const reqKey = `${region}:${champion}`;
  const isLoading = state.key !== reqKey;

  useEffect(() => {
    let cancelled = false;
    fetchOpggLeaderboard(region, champion)
      .then((data) => {
        if (!cancelled) setState({ key: reqKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            key: reqKey,
            data: null,
            error: err instanceof Error ? err.message : "Failed to load OP.GG leaderboard.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [region, champion, reqKey]);

  const rows = (state.key === reqKey ? state.data?.leaderboard : null) ?? [];
  const error = state.key === reqKey ? state.error : null;

  return (
    <div className="min-h-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
              Champion Master+ Leaderboards
            </h1>
            <span className="rounded bg-baron-emerald/15 px-2 py-0.5 text-[10.5px] font-semibold text-baron-emerald">
              Live · OP.GG MCP
            </span>
          </div>
          <p className="mt-1 text-[12px] text-baron-ink-muted">
            Top regional specialists ranked by OP.GG mastery and Solo/Duo LP. Click any player to
            inspect their match history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            aria-label="Leaderboard region"
            className="h-8 rounded-md border border-baron-border bg-baron-inset px-2.5 text-[12px] font-semibold text-baron-ink focus:border-baron-accent focus:outline-none"
          >
            {regionOptions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customChamp.trim()) setChampion(customChamp.trim());
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="search"
              value={customChamp}
              onChange={(e) => setCustomChamp(e.target.value)}
              placeholder={`Champion (${champion})...`}
              aria-label="Filter leaderboard by champion"
              className="h-8 w-44 rounded-md border border-baron-border bg-baron-inset px-3 text-[12px] text-baron-ink placeholder:text-baron-ink-muted focus:border-baron-accent focus:outline-none"
            />
          </form>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-baron-border bg-baron-surface/50 px-5 py-2">
        {LEADERBOARD_CHAMPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChampion(c)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-semibold transition-colors ${
              champion.toLowerCase() === c.toLowerCase()
                ? "border-baron-accent bg-baron-accent/15 text-baron-ink"
                : "border-baron-border bg-baron-surface text-baron-ink-secondary hover:text-baron-ink"
            }`}
          >
            <img
              src={champSquareUrl(c, ddVersion)}
              alt={c}
              className="h-4 w-4 rounded-[3px] object-cover"
            />
            <span>{c}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div role="status" className="space-y-2 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full bg-baron-surface" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5">
          <div className="text-[13px] font-bold text-baron-ink">
            OP.GG Leaderboard Unavailable
          </div>
          <p className="mt-1 text-[12px] text-baron-ink-muted">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <Table>
          <TableHeader>
            <TableRow className="border-baron-border hover:bg-transparent">
              <TableHead className="w-16 pl-5 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Rank
              </TableHead>
              <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Summoner
              </TableHead>
              <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Standing
              </TableHead>
              <TableHead className="text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                LP
              </TableHead>
              <TableHead className="pr-5 text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                {champion} Games / WR
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const s = row.summoner;
              const solo = s?.league_stats?.find((st) => st.game_type === "SOLORANKED");
              const tier = solo?.tier_info?.tier ?? "MASTER";
              const lp = solo?.tier_info?.lp ?? 0;
              const play = row.most_champion_stat?.play ?? 0;
              const win = row.most_champion_stat?.win ?? 0;
              const wr = play > 0 ? Math.round((win / play) * 100) : 0;

              return (
                <TableRow
                  key={`${region}-${row.rank}`}
                  onClick={() => {
                    if (s?.game_name && s?.tagline) {
                      onLookupSummoner?.(s.game_name, s.tagline, region);
                    }
                  }}
                  className="cursor-pointer border-baron-border hover:bg-baron-surface/75"
                >
                  <TableCell className="pl-5 font-bold text-baron-ink-muted tnum">
                    #{row.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={s?.profile_image_url || champSquareUrl(champion, ddVersion)}
                        alt={s?.game_name ?? "Summoner"}
                        className="h-8 w-8 rounded-md border border-baron-border object-cover"
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
                  <TableCell className="pr-5 text-right text-[12px] text-baron-ink-secondary tnum">
                    {wr}% ({play.toLocaleString()}G)
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
  { id: "dark", title: "Obsidian Dark", desc: "Low-glare pro-tool dark surfaces.", icon: Moon },
  { id: "light", title: "Daylight Slate", desc: "High-legibility crisp light surfaces.", icon: Sun },
  { id: "system", title: "Match OS Theme", desc: "Follows Windows / macOS appearance.", icon: Monitor },
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
  const { preference, setPreference } = useTheme();

  return (
    <div className="min-h-full divide-y divide-baron-border">
      <header className="bg-baron-surface px-5 py-4">
        <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
          Data Studio &amp; Provider Runtime
        </h1>
        <p className="mt-1 text-[12.5px] text-baron-ink-muted">
          Configure appearance, inspect verified OP.GG MCP sources, and review local-first storage
          &amp; Riot Fair Play boundaries.
        </p>
      </header>

      <section className="px-5 py-4">
        <div className="mb-3 text-[11px] font-bold tracking-[0.07em] text-baron-ink-muted uppercase">
          Appearance Theme
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_CARDS.map((card) => {
            const Icon = card.icon;
            const active = preference === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setPreference(card.id)}
                aria-pressed={active}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-baron-accent bg-baron-accent/10"
                    : "border-baron-border bg-baron-surface hover:border-baron-border-strong"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    active
                      ? "bg-baron-accent text-white"
                      : "bg-baron-elevated text-baron-ink-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-baron-ink">{card.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-baron-ink-muted">{card.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-bold tracking-[0.07em] text-baron-ink-muted uppercase">
            Meta &amp; Data Providers
          </div>
          <span className="text-[11.5px] text-baron-ink-muted">
            Only verified OP.GG MCP endpoints can be selected
          </span>
        </div>

        <div className="divide-y divide-baron-border overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
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
                        ? "bg-baron-accent text-white"
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
        <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-baron-ink">
            <Database className="h-4 w-4 text-baron-accent-soft" />
            <span>Local Cache &amp; Runtime Window</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-baron-ink-muted">
            Match summaries and cache persist locally inside <code className="text-baron-ink">baron.db</code>.
            Selected UI filter window: <strong className="text-baron-ink tnum">{patch}</strong> ·{" "}
            <strong className="text-baron-ink">{period}</strong>.
          </p>
        </div>

        <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-baron-ink">
            <ShieldCheck className="h-4 w-4 text-baron-emerald" />
            <span>Riot Games Fair Play Policy</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-baron-ink-muted">
            Zero automated enemy ult/summoner timers, zero Fog-of-War camp timers, zero Ranked
            lobby anonymity bypasses, and zero in-game input macros.
          </p>
        </div>
      </section>

      <div className="px-5 pb-6">
        <ProviderDiagnosticsPanel patch={patch} />
      </div>
    </div>
  );
}
