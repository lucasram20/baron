"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";
import { RankCrest } from "@/components/icons/LolIcons";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { champSquareUrl, itemIconUrl } from "@/lib/ddragon";
import { isProviderAvailable, type ProviderMeta } from "@/lib/tauri";
import { type ThemePreference, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { BaronRoute } from "@/types/baron";

const TIER_BENTO = [
  { champ: "Malphite", wr: "51.9%", delta: "+0.3%", pr: "7.0%", pos: true },
  { champ: "Wukong", wr: "52.2%", delta: "+0.2%", pr: "6.7%", pos: true },
  { champ: "Ahri", wr: "51.5%", delta: "+0.0%", pr: "11.9%", pos: true },
  { champ: "Jinx", wr: "51.4%", delta: "+0.1%", pr: "10.6%", pos: true },
  { champ: "Thresh", wr: "51.0%", delta: "-0.6%", pr: "13.7%", pos: false },
];

const LB_BY_REGION: Record<
  string,
  { rank: number; name: string; tag: string; champ: string; lp: string; wr: string }[]
> = {
  EUW: [
    { rank: 1, name: "Annie IRL", tag: "#Annie", champ: "Annie", lp: "4368 LP", wr: "55%" },
    { rank: 2, name: "Kaori", tag: "Kaori#EUW33", champ: "Kai'Sa", lp: "4351 LP", wr: "55%" },
    { rank: 3, name: "Mrozku", tag: "MRO#ZKU", champ: "Orianna", lp: "4332 LP", wr: "57%" },
    { rank: 4, name: "Mentos", tag: "GSMC", champ: "Ezreal", lp: "4130 LP", wr: "54%" },
    { rank: 5, name: "Nan0", tag: "RUD", champ: "Viego", lp: "4050 LP", wr: "54%" },
  ],
  KR: [
    { rank: 1, name: "Hide on bush", tag: "#KR1", champ: "Ahri", lp: "1,742 LP", wr: "58%" },
    { rank: 2, name: "Zeus", tag: "T1#KR", champ: "Gnar", lp: "1,698 LP", wr: "56%" },
    { rank: 3, name: "Chovy", tag: "GEN#1", champ: "Syndra", lp: "1,651 LP", wr: "61%" },
    { rank: 4, name: "Viper", tag: "HLE#1", champ: "Caitlyn", lp: "1,610 LP", wr: "57%" },
    { rank: 5, name: "Keria", tag: "T1#SUP", champ: "Thresh", lp: "1,585 LP", wr: "56%" },
  ],
  NA: [
    { rank: 1, name: "Yeon", tag: "TL#NA1", champ: "Kai'Sa", lp: "1,490 LP", wr: "57%" },
    { rank: 2, name: "APA", tag: "TL#MID", champ: "Taliyah", lp: "1,412 LP", wr: "55%" },
    { rank: 3, name: "CoreJJ", tag: "TL#SUP", champ: "Rakan", lp: "1,380 LP", wr: "54%" },
    { rank: 4, name: "Impact", tag: "TL#TOP", champ: "Aatrox", lp: "1,344 LP", wr: "55%" },
    { rank: 5, name: "Blaber", tag: "C9#JGL", champ: "Lee Sin", lp: "1,310 LP", wr: "54%" },
  ],
};

const RECENT_MATCHES = [
  {
    id: "m1",
    champ: "Ahri",
    result: "Victory" as const,
    queue: "Ranked Solo/Duo",
    duration: "33:07",
    ago: "6 minutes ago",
    kills: 9,
    deaths: 4,
    assists: 8,
    kdaRatio: "4.25:1",
    csRate: "8.1 CS/m",
    items: [3118, 4645, 3157, 3020, 3089, 3364],
    score: 75,
    lp: "+21 LP",
  },
  {
    id: "m2",
    champ: "Syndra",
    result: "Victory" as const,
    queue: "Ranked Solo/Duo",
    duration: "27:42",
    ago: "1 hour ago",
    kills: 11,
    deaths: 2,
    assists: 7,
    kdaRatio: "9.00:1",
    csRate: "8.9 CS/m",
    items: [3118, 4645, 3089, 3020, 3135, 3364],
    score: 89,
    lp: "+22 LP",
  },
  {
    id: "m3",
    champ: "Orianna",
    result: "Defeat" as const,
    queue: "Ranked Solo/Duo",
    duration: "31:18",
    ago: "3 hours ago",
    kills: 6,
    deaths: 5,
    assists: 9,
    kdaRatio: "3.00:1",
    csRate: "8.4 CS/m",
    items: [3003, 4628, 3157, 3020, 3135, 3363],
    score: 68,
    lp: "-16 LP",
  },
  {
    id: "m4",
    champ: "Jinx",
    result: "Victory" as const,
    queue: "Ranked Solo/Duo",
    duration: "29:05",
    ago: "yesterday",
    kills: 10,
    deaths: 3,
    assists: 11,
    kdaRatio: "7.00:1",
    csRate: "9.1 CS/m",
    items: [6672, 3085, 3031, 3006, 3036, 3363],
    score: 84,
    lp: "+21 LP",
  },
];

export function DashboardView({
  ddVersion,
  patch,
  onNavigate,
}: {
  ddVersion: string;
  patch: string;
  onNavigate: (r: BaronRoute) => void;
}) {
  const [regionTab, setRegionTab] = useState("EUW");
  const { resolved } = useTheme();
  const spotlightTheme = resolved === "light" ? "light" : "dark";
  const leaderboardRows = LB_BY_REGION[regionTab] ?? LB_BY_REGION.EUW;

  return (
    <div className="flex flex-col gap-4">
      {/* 3-Column Discovery Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Profile & LP Trajectory */}
        <SpotlightCard
          theme={spotlightTheme}
          intensity={0.08}
          borderGlow={0.35}
          className="flex flex-col justify-between rounded-xl border border-baron-border bg-baron-surface p-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={champSquareUrl("Ahri", ddVersion)}
                alt="Ahri"
                className="h-10 w-10 rounded-lg object-cover ring-1 ring-baron-cyan/50"
              />
              <div>
                <div className="text-sm font-bold text-baron-ink">Hide on bush #KR1</div>
                <div className="flex items-center gap-1 text-xs font-bold text-baron-cyan">
                  <RankCrest tier="CHALLENGER" className="h-3.5 w-3.5" />
                  <span>CHALLENGER · 1042 LP</span>
                </div>
              </div>
            </div>
            <span className="rounded bg-baron-emerald/15 px-2 py-0.5 text-[11px] font-bold text-baron-emerald">
              Today: +58 LP
            </span>
          </div>

          <svg viewBox="0 0 320 96" className="mt-3 h-24 w-full">
            <defs>
              <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.5"
              points="10,74 60,64 110,69 160,48 210,38 260,24 310,14"
            />
            <polygon
              fill="url(#lpGrad)"
              points="10,92 10,74 60,64 110,69 160,48 210,38 260,24 310,14 310,92"
            />
          </svg>
        </SpotlightCard>

        {/* Patch Tierlist & Builds Preview */}
        <SpotlightCard
          theme={spotlightTheme}
          intensity={0.08}
          borderGlow={0.35}
          className="rounded-xl border border-baron-border bg-baron-surface p-3.5"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-baron-ink">{patch} Tierlist &amp; Builds</span>
            <button
              type="button"
              onClick={() => onNavigate("tierlist")}
              className="text-[11px] font-semibold text-baron-accent-soft hover:underline"
            >
              View All ›
            </button>
          </div>
          <div className="divide-y divide-baron-border-muted text-xs">
            {TIER_BENTO.map((row) => (
              <div key={row.champ} className="flex items-center justify-between py-1.5">
                <div className="flex w-28 items-center gap-2">
                  <img
                    src={champSquareUrl(row.champ, ddVersion)}
                    alt={row.champ}
                    className="h-6 w-6 rounded object-cover"
                  />
                  <span className="font-semibold text-baron-ink">{row.champ}</span>
                </div>
                <span className="rounded bg-baron-gold/18 px-1.5 py-0.5 text-[10px] font-black text-baron-gold">
                  S+
                </span>
                <div className="text-right">
                  <div className="font-bold text-baron-ink">{row.wr}</div>
                  <div
                    className={cn(
                      "text-[10px] font-semibold",
                      row.pos ? "text-baron-emerald" : "text-baron-defeat",
                    )}
                  >
                    {row.delta}
                  </div>
                </div>
                <span className="font-semibold text-baron-ink-secondary">{row.pr}</span>
              </div>
            ))}
          </div>
        </SpotlightCard>

        {/* Regional Challenger Leaderboard Preview */}
        <SpotlightCard
          theme={spotlightTheme}
          intensity={0.08}
          borderGlow={0.35}
          className="rounded-xl border border-baron-border bg-baron-surface p-3.5"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-md border border-baron-border bg-baron-elevated p-0.5">
              {["EUW", "KR", "NA"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegionTab(r)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold transition",
                    regionTab === r ? "bg-baron-accent text-white" : "text-baron-ink-muted",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate("leaderboards")}
              className="text-[11px] font-semibold text-baron-accent-soft hover:underline"
            >
              Top 100 ›
            </button>
          </div>
          <div className="divide-y divide-baron-border-muted text-xs">
            {leaderboardRows.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 text-[11px] text-baron-ink-muted">{p.rank}</span>
                  <img
                    src={champSquareUrl(p.champ, ddVersion)}
                    alt={p.name}
                    className="h-6 w-6 rounded object-cover"
                  />
                  <div>
                    <div className="font-semibold text-baron-ink">{p.name}</div>
                    <div className="text-[10px] text-baron-ink-muted">{p.tag}</div>
                  </div>
                </div>
                <span className="font-bold text-baron-cyan">{p.lp}</span>
                <span className="rounded bg-baron-cyan/15 px-1.5 py-0.5 text-[10px] font-bold text-baron-cyan">
                  {p.wr}
                </span>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>

      {/* Match History Feed */}
      <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-baron-ink">Recent Solo/Duo Matches</h2>
          <HoverBorderGradient onClick={() => onNavigate("postgame")}>
            <span>Open Post-game Lens ›</span>
          </HoverBorderGradient>
        </div>

        <div className="flex flex-col gap-2">
          {RECENT_MATCHES.map((m) => {
            const win = m.result === "Victory";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onNavigate("postgame")}
                className="relative flex w-full items-center justify-between overflow-hidden rounded-lg border border-baron-border bg-baron-elevated px-4 py-3 text-left transition hover:border-baron-border-strong"
              >
                <span
                  className={cn(
                    "absolute top-0 bottom-0 left-0 w-px",
                    win ? "bg-baron-victory" : "bg-baron-defeat",
                  )}
                />
                <div className="flex items-center gap-3 pl-1">
                  <img
                    src={champSquareUrl(m.champ, ddVersion)}
                    alt={m.champ}
                    className="h-11 w-11 rounded-lg object-cover"
                  />
                  <div>
                    <div
                      className={cn(
                        "text-xs font-bold",
                        win ? "text-baron-victory" : "text-baron-defeat",
                      )}
                    >
                      {m.result} · {m.queue}
                    </div>
                    <div className="text-sm font-bold text-baron-ink">
                      {m.champ} · {m.duration}
                    </div>
                    <div className="text-[11px] text-baron-ink-muted">{m.ago}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-baron-ink">
                    {m.kills} / <span className="text-baron-defeat">{m.deaths}</span> / {m.assists}
                  </div>
                  <div className="text-xs text-baron-ink-muted">
                    {m.kdaRatio} KDA · {m.csRate}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {m.items.map((id) => (
                    <img
                      key={`${m.id}-${id}`}
                      src={itemIconUrl(id, ddVersion)}
                      alt={String(id)}
                      className="h-7 w-7 rounded border border-baron-border"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full border-2 px-2.5 py-1 text-xs font-extrabold text-baron-ink",
                      m.score >= 85 ? "border-baron-gold" : "border-baron-cyan",
                    )}
                  >
                    {m.score}
                  </span>
                  <span
                    className={cn(
                      "w-14 text-right text-xs font-bold",
                      win ? "text-baron-cyan" : "text-baron-defeat",
                    )}
                  >
                    {m.lp}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LeaderboardsView({ ddVersion }: { ddVersion: string }) {
  const [region, setRegion] = useState("KR");
  const rows = LB_BY_REGION[region] ?? LB_BY_REGION.KR;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-baron-ink">Leaderboards</h1>
        <div className="flex items-center gap-1 rounded-lg border border-baron-border bg-baron-surface p-1">
          {["EUW", "KR", "NA"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-bold transition",
                region === r
                  ? "bg-baron-accent text-white"
                  : "text-baron-ink-secondary hover:text-baron-ink",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
        <div className="grid grid-cols-[64px_1fr_190px_110px_110px_110px] border-b border-baron-border px-4 py-2.5 text-[11px] font-bold tracking-wider text-baron-ink-muted">
          <div>RANK</div>
          <div>SUMMONER</div>
          <div>TIER &amp; LP</div>
          <div>WINRATE</div>
          <div>7D NET LP</div>
          <div className="text-right">AVG SCORE</div>
        </div>
        {rows.map((row, idx) => (
          <div
            key={row.name}
            className="grid grid-cols-[64px_1fr_190px_110px_110px_110px] items-center border-b border-baron-border-muted px-4 py-2.5 text-xs hover:bg-baron-hover/60"
          >
            <div className="font-bold text-baron-ink-secondary">#{row.rank}</div>
            <div className="flex items-center gap-2.5">
              <img
                src={champSquareUrl(row.champ, ddVersion)}
                alt={row.name}
                className="h-7 w-7 rounded object-cover"
              />
              <div>
                <div className="font-bold text-baron-ink">{row.name}</div>
                <div className="text-[10px] text-baron-ink-muted">{row.tag}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-baron-cyan">
              <RankCrest tier="CHALLENGER" className="h-4 w-4" />
              <span>CHALLENGER · {row.lp}</span>
            </div>
            <div className="font-bold text-baron-ink">{row.wr}</div>
            <div className="font-bold text-baron-emerald">+{130 - idx * 20} LP</div>
            <div className="text-right font-extrabold text-baron-accent-soft">
              {(86.2 - idx * 1.4).toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const THEME_MODES: { id: ThemePreference; title: string; subtitle: string; icon: typeof Moon }[] = [
  { id: "dark", title: "Cool-Black Dark", subtitle: "Obsidian low-glare gaming surface", icon: Moon },
  {
    id: "light",
    title: "Cool-Slate Light",
    subtitle: "Crisp high-contrast daylight workspace",
    icon: Sun,
  },
  {
    id: "system",
    title: "System Default",
    subtitle: "Follow Windows / macOS theme setting",
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
  const { preference, resolved, setPreference } = useTheme();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-baron-ink">
          Data Studio &amp; Preferences
        </h1>
        <p className="text-xs text-baron-ink-secondary">
          Patch {patch} · Rolling Window {period} · 100% Native Rust Backend (baron-riot)
        </p>
      </div>

      {/* Theme Mode Selector */}
      <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-baron-ink">Appearance Theme</h2>
            <p className="text-xs text-baron-ink-secondary">
              Active output: {resolved === "dark" ? "Cool-Black Dark" : "Cool-Slate Light"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {THEME_MODES.map((m) => {
            const Icon = m.icon;
            const active = preference === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreference(m.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition",
                  active
                    ? "border-baron-accent bg-baron-accent/12"
                    : "border-baron-border bg-baron-elevated hover:border-baron-border-strong",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    active ? "bg-baron-accent text-white" : "bg-baron-hover text-baron-ink-secondary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs font-bold text-baron-ink">{m.title}</div>
                  <div className="text-[11px] text-baron-ink-muted">{m.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider Failover Chain */}
      <div className="flex flex-col gap-2 rounded-xl border border-baron-border bg-baron-surface p-4">
        <div className="mb-1 text-sm font-bold text-baron-ink">Tier-list providers</div>
        <p className="text-xs text-baron-ink-secondary">Only OP.GG tier data is implemented. Other providers and build data are unavailable; automatic failover is not implemented.</p>
        {providers.map((prov, idx) => {
          const active = prov.id === activeProviderId;
          const available = isProviderAvailable(prov.id);
          return (
            <button
              key={prov.id}
              type="button"
              disabled={!available}
              title={available ? undefined : "Provider integration unavailable"}
              onClick={() => onSelectProvider(prov.id)}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 text-left transition",
                !available
                  ? "cursor-not-allowed border-baron-border bg-baron-elevated opacity-50"
                  : active
                    ? "border-baron-accent bg-baron-accent/12"
                    : "border-baron-border bg-baron-elevated hover:border-baron-border-strong",
              )}
            >
              <div className="min-w-0 pr-4">
                <div className="text-xs font-bold text-baron-ink">
                  #{idx + 1} · {prov.label}
                </div>
                <div className="mt-1 truncate text-[11px] text-baron-ink-muted">{prov.tierListUrl}</div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded px-2.5 py-1 text-[11px] font-bold",
                  active
                    ? "bg-baron-accent text-white"
                    : "bg-baron-hover text-baron-ink-secondary",
                )}
              >
                {active ? "Selected" : prov.id === "opgg" ? "Tier list" : "Unavailable"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
