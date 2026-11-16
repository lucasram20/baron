"use client";

import { useState } from "react";
import { Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPECTATE_MATCHES } from "@/data/mockDpm";
import { champLoadingUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { SpectatePlayer } from "@/types/baron";

function PlayerStrip({ p }: { p: SpectatePlayer }) {
  return (
    <div className="flex w-[64px] flex-col items-center gap-1">
      <div
        className={cn(
          "relative h-[86px] w-[64px] overflow-hidden rounded border bg-baron-elevated",
          p.isPro ? "border-baron-border-strong" : "border-baron-border opacity-55 grayscale",
        )}
      >
        <img
          src={champLoadingUrl(p.champion, 0)}
          alt={p.champion}
          className="h-full w-full object-cover object-top"
        />
        <span className="absolute top-1 left-1 rounded bg-baron-canvas/85 px-1 text-[9px] font-bold text-slate-300">
          {p.role}
        </span>
        {p.teamTag && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-baron-canvas/90 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-amber-400 ring-1 ring-amber-400/40">
            {p.teamTag}
          </span>
        )}
      </div>
      <span
        className={cn(
          "w-full truncate text-center text-[11px]",
          p.isPro ? "font-semibold text-slate-100" : "text-slate-500",
        )}
      >
        {p.playerName}
      </span>
    </div>
  );
}

export function SpectateView() {
  const [regionFilter, setRegionFilter] = useState<string>("All");
  const [query, setQuery] = useState<string>("");

  const visibleMatches = SPECTATE_MATCHES.filter((m) => {
    if (regionFilter !== "All" && m.region !== regionFilter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return [...m.blue, ...m.red].some(
      (p) => p.playerName.toLowerCase().includes(q) || p.champion.toLowerCase().includes(q),
    );
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-slate-50">Spectate</h1>
          <span className="text-xs text-slate-400">{visibleMatches.length} live games</span>
        </div>
        <p className="text-xs text-slate-400">
          Watch live soloQ games from pros and popular streamers.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-64 items-center gap-2 rounded-md border border-baron-border bg-baron-surface px-2.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player or champion"
              className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-baron-border bg-baron-surface p-0.5">
            {["All", "KR", "EUW", "NA"].map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setRegionFilter(reg)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-semibold transition",
                  regionFilter === reg
                    ? "bg-baron-accent text-white"
                    : "text-slate-400 hover:text-slate-100",
                )}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-baron-border bg-baron-surface px-3 py-1.5 text-xs text-slate-300">
          Sort <span className="font-bold text-slate-100">Most relevant</span>
        </div>
      </div>

      {/* Live Game Rows */}
      <div className="flex flex-col gap-2.5">
        {visibleMatches.map((m) => {
          const isChal = m.avgTier === "CHALLENGER";
          return (
            <div
              key={m.id}
              className="relative flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-baron-border bg-baron-surface px-4 py-3"
            >
              <span
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  isChal ? "bg-baron-cyan" : "bg-baron-defeat",
                )}
              />

              {/* Match Info */}
              <div className="flex w-[148px] shrink-0 flex-col gap-2 pl-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-100">
                    <span className="h-2 w-2 rounded-full bg-baron-defeat" />
                    {m.duration}
                  </span>
                  <span className="rounded bg-baron-elevated px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                    {m.region}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-500">AVERAGE</div>
                  <div className="text-xs font-extrabold text-slate-100">{m.avgTier}</div>
                  <div
                    className={cn(
                      "text-xs font-bold",
                      isChal ? "text-baron-cyan" : "text-baron-defeat",
                    )}
                  >
                    {m.avgLp}
                  </div>
                </div>
              </div>

              {/* 5v5 Strips */}
              <div className="flex flex-1 items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  {m.blue.map((p) => (
                    <PlayerStrip key={`b-${p.champion}-${p.playerName}`} p={p} />
                  ))}
                </div>
                <span className="px-1 text-xs font-black text-slate-500">VS</span>
                <div className="flex items-center gap-1.5">
                  {m.red.map((p) => (
                    <PlayerStrip key={`r-${p.champion}-${p.playerName}`} p={p} />
                  ))}
                </div>
              </div>

              {/* Watch Action */}
              <div className="flex w-[112px] shrink-0 flex-col items-end gap-2">
                <span className="text-[11px] text-slate-400">{m.knownPlayers}</span>
                <Button size="sm" className="h-8 gap-1.5 bg-indigo-500/85 text-xs font-bold hover:bg-indigo-500">
                  <Eye className="h-3.5 w-3.5" />
                  Watch
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
