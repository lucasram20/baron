"use client";

import { useState } from "react";
import { champSquareUrl, itemIconUrl } from "@/lib/ddragon";
import type { ProviderMeta } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type { BaronRoute } from "@/types/baron";

const TIER_BENTO = [
  { champ: "Malphite", wr: "51.9%", delta: "+0.3%", pr: "7.0%", pos: true },
  { champ: "Wukong", wr: "52.2%", delta: "+0.2%", pr: "6.7%", pos: true },
  { champ: "Ahri", wr: "51.5%", delta: "+0.0%", pr: "11.9%", pos: true },
  { champ: "Jinx", wr: "51.4%", delta: "+0.1%", pr: "10.6%", pos: true },
  { champ: "Thresh", wr: "51.0%", delta: "-0.6%", pr: "13.7%", pos: false },
];

const LB_PREVIEW = [
  { rank: 1, name: "Annie IRL", tag: "#Annie", champ: "Annie", lp: "4368 LP", wr: "55%" },
  { rank: 2, name: "Kaori", tag: "Kaori#EUW33", champ: "Kai'Sa", lp: "4351 LP", wr: "55%" },
  { rank: 3, name: "Mrozku", tag: "MRO#ZKU", champ: "Orianna", lp: "4332 LP", wr: "57%" },
  { rank: 4, name: "Mentos", tag: "GSMC", champ: "Ezreal", lp: "4130 LP", wr: "54%" },
  { rank: 5, name: "Nan0", tag: "RUD", champ: "Viego", lp: "4050 LP", wr: "54%" },
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

  return (
    <div className="flex flex-col gap-4">
      {/* 3-Card DPM Discovery Bento */}
      <div className="grid grid-cols-3 gap-3">
        {/* Card 1: Profile & LP Trajectory */}
        <div className="flex flex-col justify-between rounded-xl border border-baron-border bg-baron-surface p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={champSquareUrl("Ahri", ddVersion)}
                alt="Ahri"
                className="h-10 w-10 rounded-lg object-cover ring-1 ring-sky-400/50"
              />
              <div>
                <div className="text-sm font-bold text-slate-50">Hide on bush #KR1</div>
                <div className="text-xs font-bold text-baron-cyan">◆ CHALLENGER (1042 LP)</div>
              </div>
            </div>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
              Today: +58 LP
            </span>
          </div>

          <svg viewBox="0 0 320 96" className="mt-3 h-24 w-full">
            <defs>
              <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
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
        </div>

        {/* Card 2: Patch Tierlist & Builds Preview */}
        <div className="rounded-xl border border-baron-border bg-baron-surface p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">{patch} Tierlist & Builds</span>
            <button
              type="button"
              onClick={() => onNavigate("tierlist")}
              className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
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
                  <span className="font-semibold text-slate-100">{row.champ}</span>
                </div>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-400">
                  S+
                </span>
                <div className="text-right">
                  <div className="font-bold text-slate-100">{row.wr}</div>
                  <div
                    className={cn(
                      "text-[10px]",
                      row.pos ? "text-emerald-400" : "text-baron-defeat",
                    )}
                  >
                    {row.delta}
                  </div>
                </div>
                <span className="font-semibold text-slate-300">{row.pr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Regional Challenger Leaderboard Preview */}
        <div className="rounded-xl border border-baron-border bg-baron-surface p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-md border border-baron-border bg-baron-elevated p-0.5">
              {["EUW", "KR", "NA"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegionTab(r)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold transition",
                    regionTab === r ? "bg-baron-accent text-white" : "text-slate-400",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate("leaderboards")}
              className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
            >
              Top 100 ›
            </button>
          </div>
          <div className="divide-y divide-baron-border-muted text-xs">
            {LB_PREVIEW.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 text-[11px] text-slate-500">{p.rank}</span>
                  <img
                    src={champSquareUrl(p.champ, ddVersion)}
                    alt={p.name}
                    className="h-6 w-6 rounded object-cover"
                  />
                  <div>
                    <div className="font-semibold text-slate-100">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.tag}</div>
                  </div>
                </div>
                <span className="font-bold text-baron-cyan">{p.lp}</span>
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                  {p.wr}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match History Preview Card */}
      <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100">Recent Solo/Duo Matches</h2>
          <button
            type="button"
            onClick={() => onNavigate("postgame")}
            className="rounded-md bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30"
          >
            Open Post-game Lens ›
          </button>
        </div>

        <div
          onClick={() => onNavigate("postgame")}
          className="relative flex cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-baron-border bg-baron-elevated px-4 py-3 transition hover:border-baron-border-strong"
        >
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-baron-victory" />
          <div className="flex items-center gap-3 pl-1">
            <img
              src={champSquareUrl("Ahri", ddVersion)}
              alt="Ahri"
              className="h-11 w-11 rounded-lg object-cover"
            />
            <div>
              <div className="text-xs font-bold text-baron-victory">Victory · Ranked Solo/Duo</div>
              <div className="text-sm font-bold text-slate-100">Ahri · 33:07</div>
              <div className="text-[11px] text-slate-400">6 minutes ago</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-100">
              9 / <span className="text-baron-defeat">4</span> / 8
            </div>
            <div className="text-xs text-slate-400">4.25:1 KDA · 8.1 CS/m</div>
          </div>
          <div className="flex items-center gap-1">
            {[3118, 4645, 3157, 3020, 3089, 3364].map((id) => (
              <img
                key={id}
                src={itemIconUrl(id, ddVersion)}
                alt={String(id)}
                className="h-7 w-7 rounded border border-baron-border"
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border-2 border-baron-cyan px-2.5 py-1 text-xs font-extrabold text-slate-50">
              75
            </span>
            <span className="text-xs font-bold text-sky-300">+21 LP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeaderboardsView({ ddVersion }: { ddVersion: string }) {
  const [region, setRegion] = useState("KR");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-50">Leaderboards</h1>
        <div className="flex items-center gap-1 rounded-lg border border-baron-border bg-baron-surface p-1">
          {["EUW", "KR", "NA", "PH2", "Rivals"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-bold transition",
                region === r ? "bg-baron-accent text-white" : "text-slate-400",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
        <div className="grid grid-cols-[64px_1fr_170px_110px_110px_110px] border-b border-baron-border px-4 py-2.5 text-[11px] font-bold tracking-wider text-slate-500">
          <div>RANK</div>
          <div>SUMMONER</div>
          <div>TIER & LP</div>
          <div>WINRATE</div>
          <div>7D NET LP</div>
          <div className="text-right">AVG SCORE</div>
        </div>
        {LB_PREVIEW.map((row, idx) => (
          <div
            key={row.name}
            className="grid grid-cols-[64px_1fr_170px_110px_110px_110px] items-center border-b border-baron-border-muted px-4 py-2.5 text-xs"
          >
            <div className="font-bold text-slate-300">#{row.rank}</div>
            <div className="flex items-center gap-2.5">
              <img
                src={champSquareUrl(row.champ, ddVersion)}
                alt={row.name}
                className="h-7 w-7 rounded object-cover"
              />
              <div>
                <div className="font-bold text-slate-100">{row.name}</div>
                <div className="text-[10px] text-slate-500">{row.tag}</div>
              </div>
            </div>
            <div className="font-bold text-baron-cyan">◆ CHALLENGER · {row.lp}</div>
            <div className="font-bold text-slate-100">{row.wr}</div>
            <div className="font-bold text-emerald-400">+{130 - idx * 20} LP</div>
            <div className="text-right font-extrabold text-indigo-300">
              {(86.2 - idx * 1.4).toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-50">
          Data Studio & API Provider Mode
        </h1>
        <p className="text-xs text-slate-400">
          Patch {patch} · Rolling Window {period} · 100% Native Rust Backend (`baron-riot`)
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-baron-border bg-baron-surface p-4">
        {providers.map((prov, idx) => {
          const active = prov.id === activeProviderId;
          return (
            <button
              key={prov.id}
              type="button"
              onClick={() => onSelectProvider(prov.id)}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 text-left transition",
                active
                  ? "border-baron-accent bg-indigo-500/15"
                  : "border-baron-border bg-baron-elevated hover:border-baron-border-strong",
              )}
            >
              <div className="min-w-0 pr-4">
                <div className="text-xs font-bold text-slate-50">
                  #{idx + 1} · {prov.label}
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-400">{prov.tierListUrl}</div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded px-2.5 py-1 text-[11px] font-bold",
                  active
                    ? "bg-baron-accent text-white"
                    : "bg-baron-hover text-slate-300",
                )}
              >
                {active ? "Selected" : prov.roleTag}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
