"use client";

import { useState } from "react";
import { Eye, Search } from "lucide-react";
import { LaneIcon, RankCrest } from "@/components/icons/LolIcons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPECTATE_MATCHES } from "@/data/mockDpm";
import { champLoadingUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { SpectatePlayer } from "@/types/baron";

function PlayerStrip({ p }: { p: SpectatePlayer }) {
  return (
    <div className="flex w-[64px] flex-col items-center gap-1">
      <div
        className={cn(
          "group relative h-[86px] w-[64px] overflow-hidden rounded-md border bg-baron-elevated transition",
          p.isPro
            ? "border-baron-border-strong shadow-sm"
            : "border-baron-border opacity-55 grayscale hover:opacity-85 hover:grayscale-0",
        )}
      >
        <img
          src={champLoadingUrl(p.champion, 0)}
          alt={p.champion}
          className="h-full w-full object-cover object-top transition duration-200 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent" />
        <span
          title={p.role}
          className="absolute top-1 left-1 flex h-4.5 w-4.5 items-center justify-center rounded bg-black/75 text-slate-200 ring-1 ring-white/15"
        >
          <LaneIcon role={p.role} className="h-3 w-3" />
        </span>
        {p.teamTag && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-amber-400 ring-1 ring-amber-400/50">
            {p.teamTag}
          </span>
        )}
      </div>
      <span
        className={cn(
          "w-full truncate text-center text-[11px]",
          p.isPro ? "font-semibold text-baron-ink" : "text-baron-ink-muted",
        )}
      >
        {p.playerName}
      </span>
    </div>
  );
}

export function SpectateView() {
  const [regionFilter, setRegionFilter] = useState<string>("All");
  const [teamFilter, setTeamFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("relevant");
  const [query, setQuery] = useState<string>("");
  const [watchingId, setWatchingId] = useState<string | null>(null);

  const visibleMatches = SPECTATE_MATCHES.filter((m) => {
    if (regionFilter !== "All" && m.region !== regionFilter) return false;
    const participants = [...m.blue, ...m.red];
    if (teamFilter !== "All" && !participants.some((p) => p.teamTag === teamFilter)) {
      return false;
    }
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return participants.some(
      (p) => p.playerName.toLowerCase().includes(q) || p.champion.toLowerCase().includes(q),
    );
  }).toSorted((a, b) => {
    if (sortBy === "lp") {
      return parseInt(b.avgLp.replace(/\D/g, ""), 10) - parseInt(a.avgLp.replace(/\D/g, ""), 10);
    }
    if (sortBy === "duration") {
      return parseInt(b.duration.split(":")[0], 10) - parseInt(a.duration.split(":")[0], 10);
    }
    return (parseInt(b.knownPlayers, 10) || 0) - (parseInt(a.knownPlayers, 10) || 0);
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-baron-ink">Spectate</h1>
          <span className="text-xs font-medium text-baron-ink-muted">
            {visibleMatches.length} live games
          </span>
        </div>
        <p className="text-xs text-baron-ink-secondary">
          Watch live soloQ games from pros and popular streamers.
        </p>
      </div>

      {/* Filter Bar matching DPM v1.8.1 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-64 items-center gap-2 rounded-md border border-baron-border bg-baron-surface px-2.5 focus-within:border-baron-accent">
            <Search className="h-3.5 w-3.5 text-baron-ink-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player or champion"
              className="w-full bg-transparent text-xs text-baron-ink placeholder:text-baron-ink-muted focus:outline-none"
            />
          </div>

          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger size="sm" className="h-8 w-[124px] border-baron-border bg-baron-surface text-xs text-baron-ink">
              <span className="text-baron-ink-muted">Region</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="KR">KR</SelectItem>
              <SelectItem value="EUW">EUW</SelectItem>
              <SelectItem value="NA">NA</SelectItem>
            </SelectContent>
          </Select>

          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger size="sm" className="h-8 w-[140px] border-baron-border bg-baron-surface text-xs text-baron-ink">
              <SelectValue placeholder="Every team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Every team</SelectItem>
              <SelectItem value="T1">T1</SelectItem>
              <SelectItem value="GEN">Gen.G</SelectItem>
              <SelectItem value="HLE">Hanwha Life</SelectItem>
              <SelectItem value="KC">Karmine Corp</SelectItem>
              <SelectItem value="G2">G2 Esports</SelectItem>
              <SelectItem value="TL">Team Liquid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger size="sm" className="h-8 w-[176px] border-baron-border bg-baron-surface text-xs text-baron-ink">
            <span className="text-baron-ink-muted">Sort</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevant">Most relevant</SelectItem>
            <SelectItem value="lp">Highest LP</SelectItem>
            <SelectItem value="duration">Longest running</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Live Game Rows */}
      <div className="flex flex-col gap-2.5">
        {visibleMatches.map((m) => {
          const isChal = m.avgTier === "CHALLENGER";
          const isWatching = watchingId === m.id;
          return (
            <div
              key={m.id}
              className="relative flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-baron-border bg-baron-surface px-4 py-3 transition hover:border-baron-border-strong"
            >
              {/* Subtle 1px left edge glow strip matching rank tier */}
              <span
                className={cn(
                  "absolute top-0 bottom-0 left-0 w-px",
                  isChal ? "bg-baron-cyan" : "bg-baron-defeat",
                )}
              />

              {/* Match Info */}
              <div className="flex w-[154px] shrink-0 flex-col gap-2.5 pl-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-baron-ink">
                    <span className="h-2 w-2 rounded-full bg-baron-defeat" />
                    {m.duration}
                  </span>
                  <span className="rounded border border-baron-border bg-baron-elevated px-1.5 py-0.5 text-[10px] font-bold text-baron-ink-secondary">
                    {m.region}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <RankCrest tier={m.avgTier} className="h-7 w-7" />
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-baron-ink-muted">
                      AVERAGE
                    </div>
                    <div className="text-xs font-extrabold text-baron-ink">{m.avgTier}</div>
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
              </div>

              {/* 5v5 Strips */}
              <div className="flex flex-1 items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  {m.blue.map((p) => (
                    <PlayerStrip key={`b-${p.champion}-${p.playerName}`} p={p} />
                  ))}
                </div>
                <span className="px-1 text-xs font-black tracking-wider text-baron-ink-muted">
                  VS
                </span>
                <div className="flex items-center gap-1.5">
                  {m.red.map((p) => (
                    <PlayerStrip key={`r-${p.champion}-${p.playerName}`} p={p} />
                  ))}
                </div>
              </div>

              {/* Right Watch Action */}
              <div className="flex w-[124px] shrink-0 flex-col items-end gap-2">
                <span className="text-[11px] font-medium text-baron-ink-secondary">
                  {m.knownPlayers}
                </span>
                <Button
                  size="sm"
                  onClick={() => setWatchingId(isWatching ? null : m.id)}
                  className={cn(
                    "h-8 w-[108px] gap-1.5 text-xs font-bold transition",
                    isWatching
                      ? "bg-baron-emerald text-white hover:bg-baron-emerald/90"
                      : "bg-baron-accent-soft/90 text-slate-950 hover:bg-baron-accent-soft",
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {isWatching ? "Launching" : "Watch"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
