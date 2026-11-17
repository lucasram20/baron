"use client";

import { useState } from "react";
import { ArrowRight, Check, Database, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import type { BaronRoute } from "@/components/shell/Sidebar";
import { LaneIcon, RankCrest } from "@/components/icons/LolIcons";
import SpotlightCard from "@/components/SpotlightCard";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { champSplashUrl, champSquareUrl, itemIconUrl } from "@/lib/ddragon";
import { isProviderAvailable, type ProviderMeta } from "@/lib/tauri";
import { useTheme, type ThemePreference } from "@/lib/theme";

interface SampleMatchRow {
  id: string;
  queue: "solo" | "flex";
  result: "Victory" | "Defeat";
  win: boolean;
  ago: string;
  duration: string;
  champKey: string;
  champ: string;
  role: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  csPerMin: string;
  items: number[];
  score: number;
  lpDelta: string;
  gold14: string;
  cs14: string;
  xp14: string;
  dmgText: string;
  dmgPct: number;
}

const SAMPLE_MATCHES: SampleMatchRow[] = [
  {
    id: "m1",
    queue: "solo",
    result: "Victory",
    win: true,
    ago: "6m ago",
    duration: "33:07",
    champKey: "Ahri",
    champ: "Ahri",
    role: "Mid",
    kills: 9,
    deaths: 4,
    assists: 8,
    kda: "4.25:1",
    csPerMin: "8.1",
    items: [3118, 4645, 3157, 3020, 3089, 3364],
    score: 75,
    lpDelta: "+21 LP",
    gold14: "+840g",
    cs14: "+14 CS",
    xp14: "+620 XP",
    dmgText: "35.1k (27%)",
    dmgPct: 88,
  },
  {
    id: "m2",
    queue: "solo",
    result: "Victory",
    win: true,
    ago: "1h ago",
    duration: "27:42",
    champKey: "Syndra",
    champ: "Syndra",
    role: "Mid",
    kills: 11,
    deaths: 2,
    assists: 7,
    kda: "9.00:1",
    csPerMin: "8.9",
    items: [3118, 4645, 3089, 3020, 3135, 3364],
    score: 89,
    lpDelta: "+22 LP",
    gold14: "+1,290g",
    cs14: "+21 CS",
    xp14: "+840 XP",
    dmgText: "38.4k (31%)",
    dmgPct: 95,
  },
  {
    id: "m3",
    queue: "solo",
    result: "Defeat",
    win: false,
    ago: "3h ago",
    duration: "31:18",
    champKey: "Orianna",
    champ: "Orianna",
    role: "Mid",
    kills: 6,
    deaths: 5,
    assists: 9,
    kda: "3.00:1",
    csPerMin: "8.4",
    items: [3003, 4628, 3157, 3020, 3135, 3363],
    score: 68,
    lpDelta: "-16 LP",
    gold14: "-310g",
    cs14: "+3 CS",
    xp14: "-180 XP",
    dmgText: "27.6k (24%)",
    dmgPct: 64,
  },
  {
    id: "m4",
    queue: "solo",
    result: "Victory",
    win: true,
    ago: "Yesterday",
    duration: "29:05",
    champKey: "Jinx",
    champ: "Jinx",
    role: "Bot",
    kills: 10,
    deaths: 3,
    assists: 11,
    kda: "7.00:1",
    csPerMin: "9.1",
    items: [6672, 3085, 3031, 3006, 3036, 3363],
    score: 84,
    lpDelta: "+21 LP",
    gold14: "+640g",
    cs14: "+11 CS",
    xp14: "+410 XP",
    dmgText: "39.8k (33%)",
    dmgPct: 92,
  },
];

const LP_SERIES = [
  { val: 994, label: "Baseline · Start" },
  { val: 1015, label: "+21 LP · Jinx W" },
  { val: 999, label: "-16 LP · Orianna L" },
  { val: 1021, label: "+22 LP · Syndra W" },
  { val: 1042, label: "+21 LP · Ahri W" },
];

const META_PULSE = [
  { key: "Ahri", name: "Ahri", role: "Mid", tier: "S+", wr: "52.6%", delta: "+0.8%", pr: "11.2%" },
  { key: "LeeSin", name: "Lee Sin", role: "Jg", tier: "S+", wr: "50.9%", delta: "-0.4%", pr: "17.6%" },
  { key: "Jinx", name: "Jinx", role: "Bot", tier: "S+", wr: "52.1%", delta: "+1.2%", pr: "14.8%" },
  { key: "Thresh", name: "Thresh", role: "Sup", tier: "S+", wr: "51.2%", delta: "+0.3%", pr: "12.9%" },
  { key: "Syndra", name: "Syndra", role: "Mid", tier: "S", wr: "51.8%", delta: "+0.6%", pr: "6.9%" },
];

type LadderRegion = "EUW" | "KR" | "NA";

interface LadderPlayer {
  rank: number;
  name: string;
  tag: string;
  champ: string;
  lp: string;
  wr: string;
  games: number;
}

const SAMPLE_LADDER: Record<LadderRegion, LadderPlayer[]> = {
  EUW: [
    { rank: 1, name: "Annie IRL", tag: "#Annie", champ: "Annie", lp: "4,368 LP", wr: "55%", games: 612 },
    { rank: 2, name: "Kaori", tag: "#EUW33", champ: "Kai'Sa", lp: "4,351 LP", wr: "55%", games: 584 },
    { rank: 3, name: "Mrozku", tag: "#ZKU", champ: "Orianna", lp: "4,332 LP", wr: "57%", games: 498 },
    { rank: 4, name: "Mentos", tag: "#GSMC", champ: "Ezreal", lp: "4,130 LP", wr: "54%", games: 530 },
    { rank: 5, name: "Nan0", tag: "#RUD", champ: "Viego", lp: "4,050 LP", wr: "54%", games: 465 },
  ],
  KR: [
    { rank: 1, name: "Hide on bush", tag: "#KR1", champ: "Ahri", lp: "1,742 LP", wr: "58%", games: 412 },
    { rank: 2, name: "Zeus", tag: "#KR1", champ: "Gnar", lp: "1,698 LP", wr: "56%", games: 394 },
    { rank: 3, name: "Chovy", tag: "#KR1", champ: "Syndra", lp: "1,651 LP", wr: "61%", games: 368 },
    { rank: 4, name: "Viper", tag: "#KR3", champ: "Caitlyn", lp: "1,610 LP", wr: "57%", games: 422 },
    { rank: 5, name: "Keria", tag: "#KR1", champ: "Thresh", lp: "1,585 LP", wr: "56%", games: 449 },
  ],
  NA: [
    { rank: 1, name: "Yeon", tag: "#NA1", champ: "Kai'Sa", lp: "1,490 LP", wr: "57%", games: 389 },
    { rank: 2, name: "APA", tag: "#NA1", champ: "Taliyah", lp: "1,412 LP", wr: "55%", games: 410 },
    { rank: 3, name: "CoreJJ", tag: "#NA1", champ: "Rakan", lp: "1,380 LP", wr: "54%", games: 356 },
    { rank: 4, name: "Impact", tag: "#NA1", champ: "Aatrox", lp: "1,344 LP", wr: "55%", games: 372 },
    { rank: 5, name: "Blaber", tag: "#NA1", champ: "LeeSin", lp: "1,310 LP", wr: "54%", games: 401 },
  ],
};

function LpTrajectoryCurve({
  activeIdx,
  onSelectIdx,
}: {
  activeIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const w = 360;
  const h = 72;
  const minV = 980;
  const maxV = 1055;

  const pts = LP_SERIES.map((p, i) => ({
    ...p,
    i,
    x: 36 + (i * (w - 50)) / (LP_SERIES.length - 1),
    y: h - 10 - ((p.val - minV) / (maxV - minV)) * (h - 20),
  }));

  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    pathD += ` C ${mx} ${pts[i].y}, ${mx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${h - 6} L ${pts[0].x} ${h - 6} Z`;
  const activePt = pts[activeIdx] ?? pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-[72px] w-full overflow-visible select-none"
      role="img"
      aria-label={`Sample LP trajectory curve currently showing ${activePt.val} LP (${activePt.label})`}
    >
      <defs>
        <linearGradient id="baronLpFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--baron-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--baron-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[990, 1020, 1050].map((tick) => {
        const ty = h - 10 - ((tick - minV) / (maxV - minV)) * (h - 20);
        return (
          <g key={tick}>
            <line
              x1={32}
              x2={w - 6}
              y1={ty}
              y2={ty}
              stroke="var(--baron-border)"
              strokeDasharray="2 3"
            />
            <text
              x={27}
              y={ty + 3}
              textAnchor="end"
              fill="var(--baron-ink-muted)"
              fontSize="8.5"
              className="tnum"
            >
              {tick}
            </text>
          </g>
        );
      })}

      <path d={areaD} fill="url(#baronLpFill)" />
      <path d={pathD} fill="none" stroke="var(--baron-accent)" strokeWidth="2.1" />
      <line
        x1={activePt.x}
        x2={activePt.x}
        y1={4}
        y2={h - 6}
        stroke="var(--baron-border-strong)"
        strokeDasharray="2 2"
      />

      {pts.map((pt) => {
        const isCurrent = pt.i === activeIdx;
        return (
          <circle
            key={pt.label}
            cx={pt.x}
            cy={pt.y}
            r={isCurrent ? 4.5 : 3}
            fill={isCurrent ? "var(--baron-accent-soft)" : "var(--baron-surface)"}
            stroke="var(--baron-accent)"
            strokeWidth="2"
            tabIndex={0}
            role="button"
            aria-label={`${pt.val} LP · ${pt.label}`}
            className="cursor-pointer outline-none focus:stroke-baron-cyan"
            onMouseEnter={() => onSelectIdx(pt.i)}
            onFocus={() => onSelectIdx(pt.i)}
            onClick={() => onSelectIdx(pt.i)}
          />
        );
      })}
    </svg>
  );
}

export function DashboardView({
  ddVersion,
  patch,
  onNavigate,
}: {
  ddVersion: string;
  patch: string;
  onNavigate: (route: BaronRoute) => void;
}) {
  const { resolved } = useTheme();
  const [lpIdx, setLpIdx] = useState(LP_SERIES.length - 1);
  const [queueFilter, setQueueFilter] = useState<"all" | "solo" | "flex">("all");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [ladderRegion, setLadderRegion] = useState<LadderRegion>("EUW");

  const activeLp = LP_SERIES[lpIdx] ?? LP_SERIES[LP_SERIES.length - 1];
  const visibleMatches =
    queueFilter === "all"
      ? SAMPLE_MATCHES
      : SAMPLE_MATCHES.filter((m) => m.queue === queueFilter);
  const ladderRows = SAMPLE_LADDER[ladderRegion];

  return (
    <div className="min-h-full">
      {/* Unified DPM Hero Header */}
      <SpotlightCard
        theme={resolved}
        intensity={0.07}
        borderGlow={0.45}
        style={{ borderRadius: 0 }}
        className="relative overflow-hidden rounded-none border-x-0 border-t-0 border-b border-baron-border bg-baron-surface"
      >
        {/* Feathered Champion Splash Backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[44%] bg-cover bg-center opacity-[0.18] dark:opacity-[0.22]"
          style={{
            backgroundImage: `url('${champSplashUrl("Ahri", 0)}')`,
            maskImage:
              "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
            WebkitMaskImage:
              "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
          }}
        />

        <div className="relative z-10 grid grid-cols-1 items-center gap-5 px-5 pt-4 pb-3.5 lg:grid-cols-[auto_minmax(260px,1fr)_auto]">
          {/* Summoner Identity */}
          <div className="flex items-center gap-3.5">
            <div className="relative h-[54px] w-[54px] shrink-0">
              <img
                src={champSquareUrl("Ahri", ddVersion)}
                alt="Ahri champion portrait"
                className="h-[54px] w-[54px] rounded-[11px] border-2 border-baron-border-strong object-cover shadow-md"
              />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-baron-elevated px-1.5 py-[1px] text-[10px] font-bold text-baron-ink ring-1 ring-baron-border-strong tnum">
                684
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h1 className="text-[19px] font-extrabold tracking-[-0.025em] text-baron-ink">
                  Hide on bush
                </h1>
                <span className="text-[13px] font-semibold text-baron-ink-muted">#KR1</span>
                <span className="rounded bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary ring-1 ring-baron-border">
                  Sample dashboard data
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12px] font-bold text-baron-cyan">
                <RankCrest tier="CHALLENGER" className="h-3.5 w-3.5" />
                <span className="tnum">CHALLENGER · 1,042 LP</span>
                <span className="rounded bg-baron-emerald/15 px-1.5 py-0.5 text-[10.5px] font-bold text-baron-emerald tnum">
                  +48 LP (7d)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive LP Trajectory */}
          <div className="min-w-0">
            <div className="mb-0.5 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-baron-ink-secondary">
                LP Trajectory (Sample)
              </span>
              <span className="font-bold text-baron-accent-soft tnum">
                {activeLp.val} LP · {activeLp.label}
              </span>
            </div>
            <LpTrajectoryCurve activeIdx={lpIdx} onSelectIdx={setLpIdx} />
          </div>

          {/* Standing & Average Score Ring */}
          <div className="flex items-center justify-end gap-3.5">
            <ScoreRing score={79} size="lg" label="Average Baron Score (Sample)" />
            <div className="text-right">
              <div className="text-[18px] font-extrabold text-baron-victory tnum">75% WR</div>
              <span className="mt-0.5 inline-block rounded bg-baron-emerald/15 px-2 py-0.5 text-[10.5px] font-semibold text-baron-emerald">
                3W 1L · On Form
              </span>
            </div>
          </div>
        </div>

        {/* Flush 5-Column KPI Strip */}
        <div className="relative z-10 grid grid-cols-2 divide-x divide-baron-border border-t border-baron-border sm:grid-cols-5">
          <div className="px-4 py-2.5">
            <div className="text-[14.5px] font-bold text-baron-ink tnum">7.35 : 1</div>
            <div className="text-[11px] text-baron-ink-muted">Average KDA · 9.0 / 3.5 / 8.8</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[14.5px] font-bold text-baron-ink tnum">58%</div>
            <div className="text-[11px] text-baron-ink-muted">Kill participation</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[14.5px] font-bold text-baron-ink tnum">8.6 / m</div>
            <div className="text-[11px] text-baron-ink-muted">CS rate across pool</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[14.5px] font-bold text-baron-gold tnum">89 MVP</div>
            <div className="text-[11px] text-baron-ink-muted">Peak Baron Score · Syndra</div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("tierlist")}
            className="px-4 py-2.5 text-left transition-colors hover:bg-baron-hover/50"
          >
            <div className="text-[14.5px] font-bold text-baron-emerald">OP.GG MCP</div>
            <div className="text-[11px] text-baron-ink-muted">Open tier-list feed →</div>
          </button>
        </div>
      </SpotlightCard>

      {/* Seamless Split Below Hero */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_336px]">
        {/* Left: Recent Match History Ledger */}
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-baron-border px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[13px] font-bold tracking-[-0.01em] text-baron-ink">
                Recent Matches
              </h2>
              <AnimatedTabs
                layoutId="dash-match-queue"
                ariaLabel="Filter sample matches by queue"
                value={queueFilter}
                onChange={setQueueFilter}
                items={[
                  { id: "all", label: "All (4)" },
                  { id: "solo", label: "Solo/Duo" },
                  { id: "flex", label: "Flex" },
                ]}
              />
            </div>

            <button
              type="button"
              onClick={() => onNavigate("postgame")}
              aria-label="Open sample post-game"
              className="flex items-center gap-1 text-[12px] font-semibold text-baron-accent-soft transition-colors hover:text-baron-ink"
            >
              <span>Open Post-game Lens</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {visibleMatches.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-[13px] font-semibold text-baron-ink">
                No Ranked Flex games in sample data
              </div>
              <p className="mt-1 text-[12px] text-baron-ink-muted">
                All 4 sample matches belong to Ranked Solo/Duo. Connect Riot Client or Match-V5
                for your live history.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-baron-border">
              {visibleMatches.map((m) => {
                const isOpen = expandedMatch === m.id;
                return (
                  <div key={m.id}>
                    <div
                      onClick={() => setExpandedMatch(isOpen ? null : m.id)}
                      className={`grid cursor-pointer grid-cols-[96px_150px_132px_80px_1fr] items-center gap-3 border-l-[3px] px-4 py-2.5 transition-colors hover:bg-baron-surface/80 ${
                        m.win ? "border-l-baron-victory" : "border-l-baron-defeat"
                      }`}
                    >
                      <div>
                        <div
                          className={`text-[12.5px] font-bold ${
                            m.win ? "text-baron-victory" : "text-baron-defeat"
                          }`}
                        >
                          {m.result}
                        </div>
                        <div className="text-[11px] text-baron-ink-muted tnum">
                          {m.duration} · {m.ago}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <img
                          src={champSquareUrl(m.champKey, ddVersion)}
                          alt={m.champ}
                          className="h-9 w-9 shrink-0 rounded-md border border-baron-border-strong object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold text-baron-ink">
                            {m.champ}
                          </div>
                          <div className="flex items-center gap-1 text-[10.5px] text-baron-ink-muted">
                            <LaneIcon role={m.role} className="h-3 w-3" />
                            <span>{m.role} · Solo/Duo</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[12.5px] font-bold text-baron-ink tnum">
                          {m.kills} / <span className="text-baron-defeat">{m.deaths}</span> /{" "}
                          {m.assists}
                        </div>
                        <div className="text-[11px] text-baron-ink-secondary tnum">
                          {m.kda} · {m.csPerMin} CS/m
                        </div>
                      </div>

                      {/* Compact DPM-style 2x3 item grid */}
                      <div className="grid w-[68px] grid-cols-3 gap-[2px]">
                        {m.items.map((itemId, idx) => (
                          <img
                            key={`${m.id}-${itemId}-${idx}`}
                            src={itemIconUrl(itemId, ddVersion)}
                            alt={`Item ${itemId}`}
                            className="h-[21px] w-[21px] rounded-[3px] border border-baron-border object-cover"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <div
                            className={`text-[11.5px] font-bold tnum ${
                              m.win ? "text-baron-cyan" : "text-baron-defeat"
                            }`}
                          >
                            {m.lpDelta}
                          </div>
                          <div className="text-[10.5px] font-semibold text-baron-accent-soft">
                            {isOpen ? "Hide lens ▴" : "Lens @14m ▾"}
                          </div>
                        </div>
                        <ScoreRing score={m.score} size="sm" label={`Baron Score ${m.score}`} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="grid grid-cols-1 items-center gap-4 border-t border-baron-border bg-baron-elevated/55 px-5 py-3 md:grid-cols-[1fr_1fr_auto]">
                        <div>
                          <div className="text-[10px] font-bold tracking-[0.07em] text-baron-ink-muted uppercase">
                            @14:00 Lane Differential (Sample)
                          </div>
                          <div className="mt-1.5 flex gap-6 text-[12px]">
                            <div>
                              <div className="text-[10.5px] text-baron-ink-muted">Gold @14</div>
                              <strong
                                className={`tnum ${
                                  m.gold14.startsWith("-")
                                    ? "text-baron-defeat"
                                    : "text-baron-emerald"
                                }`}
                              >
                                {m.gold14}
                              </strong>
                            </div>
                            <div>
                              <div className="text-[10.5px] text-baron-ink-muted">CS @14</div>
                              <strong className="text-baron-emerald tnum">{m.cs14}</strong>
                            </div>
                            <div>
                              <div className="text-[10.5px] text-baron-ink-muted">XP @14</div>
                              <strong
                                className={`tnum ${
                                  m.xp14.startsWith("-")
                                    ? "text-baron-defeat"
                                    : "text-baron-emerald"
                                }`}
                              >
                                {m.xp14}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-baron-ink-muted uppercase">
                              Damage vs Lobby Avg
                            </span>
                            <strong className="text-baron-ink tnum">{m.dmgText}</strong>
                          </div>
                          <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-baron-border">
                            <div
                              className={`h-full rounded-full ${
                                m.win ? "bg-baron-victory" : "bg-baron-defeat"
                              }`}
                              style={{ width: `${m.dmgPct}%` }}
                            />
                            <div
                              aria-hidden="true"
                              title="Lobby average benchmark"
                              className="absolute inset-y-0 left-1/2 w-[1.5px] bg-baron-ink/80"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate("postgame");
                          }}
                          aria-label="Inspect match in post-game scoreboard"
                          className="rounded-md bg-baron-accent px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          Open Scoreboard →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Rail: Meta Pulse + Regional Ladder */}
        <aside className="flex flex-col border-t border-baron-border xl:border-t-0 xl:border-l">
          <div className="flex items-center justify-between border-b border-baron-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold tracking-[-0.01em] text-baron-ink">
                {patch} Meta Pulse
              </h2>
              <span className="rounded bg-baron-elevated px-1.5 py-0.5 text-[10px] font-semibold text-baron-ink-muted">
                Sample
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("tierlist")}
              className="text-[12px] font-semibold text-baron-accent-soft transition-colors hover:text-baron-ink"
            >
              Live OP.GG →
            </button>
          </div>

          <div className="divide-y divide-baron-border">
            {META_PULSE.map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-[30px_minmax(0,1fr)_22px_28px_56px_46px] items-center gap-2 px-4 py-2"
              >
                <img
                  src={champSquareUrl(row.key, ddVersion)}
                  alt={row.name}
                  className="h-7 w-7 rounded-md border border-baron-border object-cover"
                />
                <span className="truncate text-[12.5px] font-semibold text-baron-ink">
                  {row.name}
                </span>
                <span className="flex justify-center text-baron-ink-muted">
                  <LaneIcon role={row.role} className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`text-center text-[13px] font-black tracking-tight ${
                    row.tier === "S+" ? "text-baron-gold" : "text-baron-ace"
                  }`}
                >
                  {row.tier}
                </span>
                <div className="text-right leading-tight tnum">
                  <div className="text-[12px] font-bold text-baron-ink">{row.wr}</div>
                  <div
                    className={`text-[10px] font-semibold ${
                      row.delta.startsWith("-") ? "text-baron-defeat" : "text-baron-emerald"
                    }`}
                  >
                    {row.delta}
                  </div>
                </div>
                <div className="text-right text-[11.5px] font-medium text-baron-ink-secondary tnum">
                  {row.pr}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Challenger Top 5 */}
          <div className="mt-auto flex items-center justify-between border-y border-baron-border px-4 py-2">
            <AnimatedTabs
              layoutId="dash-ladder-region"
              ariaLabel="Regional sample ladder"
              value={ladderRegion}
              onChange={setLadderRegion}
              items={[
                { id: "EUW", label: "EUW" },
                { id: "KR", label: "KR" },
                { id: "NA", label: "NA" },
              ]}
            />
            <button
              type="button"
              onClick={() => onNavigate("leaderboards")}
              className="text-[12px] font-semibold text-baron-accent-soft transition-colors hover:text-baron-ink"
            >
              Top 100 →
            </button>
          </div>

          <div className="divide-y divide-baron-border">
            {ladderRows.map((p) => (
              <div
                key={`${ladderRegion}-${p.rank}`}
                className="grid grid-cols-[18px_26px_minmax(0,1fr)_auto_auto] items-center gap-2.5 px-4 py-2"
              >
                <span className="text-[11.5px] font-bold text-baron-ink-muted tnum">{p.rank}</span>
                <img
                  src={champSquareUrl(p.champ, ddVersion)}
                  alt={`${p.name} main`}
                  className="h-[26px] w-[26px] rounded-[5px] border border-baron-border object-cover"
                />
                <span className="truncate text-[12px] font-semibold text-baron-ink">{p.name}</span>
                <span className="text-[11.5px] font-bold text-baron-cyan tnum">{p.lp}</span>
                <span className="text-[11.5px] font-medium text-baron-ink-secondary tnum">
                  {p.wr}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function LeaderboardsView({ ddVersion }: { ddVersion: string }) {
  const [region, setRegion] = useState<LadderRegion>("EUW");
  const [query, setQuery] = useState("");

  const rows = SAMPLE_LADDER[region].filter((p) =>
    `${p.name} ${p.tag} ${p.champ}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
              Regional Leaderboards
            </h1>
            <span className="rounded bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary ring-1 ring-baron-border">
              Sample snapshot
            </span>
          </div>
          <p className="mt-1 text-[12px] text-baron-ink-muted">
            Static illustrative Challenger snapshots per region. Live ladder sync is not queried
            without a configured Riot League-V4 endpoint.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <AnimatedTabs
            layoutId="lb-region-tabs"
            ariaLabel="Leaderboard region"
            value={region}
            onChange={setRegion}
            items={[
              { id: "EUW", label: "EUW" },
              { id: "KR", label: "KR" },
              { id: "NA", label: "NA" },
            ]}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter player or champion..."
            aria-label="Filter leaderboard rows"
            className="h-8 w-52 rounded-md border border-baron-border bg-baron-inset px-3 text-[12px] text-baron-ink placeholder:text-baron-ink-muted focus:border-baron-accent focus:outline-none"
          />
        </div>
      </header>

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
              Main Champion
            </TableHead>
            <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
              Standing
            </TableHead>
            <TableHead className="text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
              LP
            </TableHead>
            <TableHead className="pr-5 text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
              Win Rate
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-[13px] text-baron-ink-muted">
                No sample summoners match &ldquo;{query}&rdquo;.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((p) => (
              <TableRow
                key={`${region}-${p.rank}`}
                className="border-baron-border hover:bg-baron-surface/75"
              >
                <TableCell className="pl-5 font-bold text-baron-ink-muted tnum">
                  #{p.rank}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={champSquareUrl(p.champ, ddVersion)}
                      alt={p.name}
                      className="h-8 w-8 rounded-md border border-baron-border object-cover"
                    />
                    <div>
                      <span className="font-semibold text-baron-ink">{p.name}</span>{" "}
                      <span className="text-[11.5px] text-baron-ink-muted">{p.tag}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-[12.5px] text-baron-ink-secondary">{p.champ}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-baron-cyan">
                    <RankCrest tier="CHALLENGER" className="h-3.5 w-3.5" />
                    Challenger
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold text-baron-cyan tnum">{p.lp}</TableCell>
                <TableCell className="pr-5 text-right text-[12px] text-baron-ink-secondary tnum">
                  {p.wr} ({p.games}G)
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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
          Configure appearance, inspect verified data sources, and review local-first storage &amp;
          Riot Fair Play boundaries.
        </p>
      </header>

      {/* Appearance Theme */}
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

      {/* Providers */}
      <section className="px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-bold tracking-[0.07em] text-baron-ink-muted uppercase">
            Meta &amp; Tier-List Providers
          </div>
          <span className="text-[11.5px] text-baron-ink-muted">
            Only verified live integrations can be selected
          </span>
        </div>

        <div className="divide-y divide-baron-border overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
          {providers.map((p) => {
            const available = isProviderAvailable(p.id);
            const active = activeProviderId === p.id;
            return (
              <div
                key={p.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  available ? "" : "opacity-55"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${
                        available ? "bg-baron-emerald" : "bg-baron-ink-muted"
                      }`}
                    />
                    <span className="text-[13px] font-bold text-baron-ink">{p.label}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        available
                          ? "bg-baron-emerald/15 text-baron-emerald"
                          : "bg-baron-elevated text-baron-ink-muted"
                      }`}
                    >
                      {available ? "Live Tier List (MCP)" : "Unavailable"}
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
                ) : (
                  <span className="rounded-md border border-baron-border bg-baron-inset px-2.5 py-1 text-[11px] font-medium text-baron-ink-muted">
                    Disabled (Unverified)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Local-First & Fair Play */}
      <section className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-2">
        <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-baron-ink">
            <Database className="h-4 w-4 text-baron-accent-soft" />
            <span>Local Cache &amp; Sample Window</span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-baron-ink-muted">
            Match timelines and local cache persist inside local SQLite (<code className="text-baron-ink">baron.db</code>).
            Sample selection window: <strong className="text-baron-ink tnum">{patch}</strong> ·{" "}
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
    </div>
  );
}
