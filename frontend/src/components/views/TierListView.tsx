"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TIER_LIST_ROWS } from "@/data/mockDpm";
import { champSquareUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { TierListRow } from "@/types/baron";

interface TierListViewProps {
  ddVersion: string;
  patch: string;
  activeProviderLabel: string;
}

const TIER_TEXT: Record<TierListRow["tier"], string> = {
  "S+": "text-amber-400",
  S: "text-indigo-300",
  A: "text-sky-400",
  B: "text-emerald-400",
};

export function TierListView({ ddVersion, patch, activeProviderLabel }: TierListViewProps) {
  const [mode, setMode] = useState("Ranked");
  const [roleFilter, setRoleFilter] = useState("*");
  const [offMeta, setOffMeta] = useState(false);
  const [search, setSearch] = useState("");

  const filteredRows = TIER_LIST_ROWS.filter((r) => {
    if (roleFilter !== "*" && r.role !== roleFilter) return false;
    if (search.trim() && !r.champion.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-extrabold text-slate-50">Tierlist</h1>
          <p className="text-xs text-slate-400">
            Explore Baron Tierlists ({activeProviderLabel} · Patch {patch}) and stay ahead of the
            meta!
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-baron-border bg-baron-surface p-1">
          {["Ranked", "Aram", "Arena", "Duo"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition",
                mode === m
                  ? "bg-baron-accent text-white"
                  : "text-slate-400 hover:text-slate-100",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-baron-border bg-baron-surface p-1">
            {["*", "Top", "Jg", "Mid", "Bot", "Sup"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-bold transition",
                  roleFilter === r
                    ? "bg-baron-accent text-white"
                    : "text-slate-400 hover:text-slate-100",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <span className="rounded-lg border border-baron-border bg-baron-surface px-3 py-1.5 text-xs font-bold text-emerald-400">
            ◆ EMERALD+
          </span>
          <span className="rounded-lg border border-baron-border bg-baron-surface px-3 py-1.5 text-xs font-semibold text-slate-200">
            ALL REGIONS
          </span>
          <span className="rounded-lg border border-baron-border bg-baron-surface px-3 py-1.5 text-xs font-semibold text-slate-200">
            {patch}
          </span>

          <div className="ml-1 flex items-center gap-2 text-xs text-slate-400">
            <Switch checked={offMeta} onCheckedChange={setOffMeta} />
            <span className="font-semibold tracking-wide">OFF-META</span>
          </div>
        </div>

        <div className="flex h-8 w-56 items-center gap-2 rounded-lg border border-baron-border bg-baron-surface px-2.5">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a champion"
            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
        <div className="grid grid-cols-[64px_1fr_110px_110px_120px_110px_110px] border-b border-baron-border px-4 py-2.5 text-[11px] font-bold tracking-wider text-slate-500">
          <div>RANK</div>
          <div>CHAMPION</div>
          <div>LANE</div>
          <div>TIER ▼</div>
          <div>WINRATE</div>
          <div>PICKRATE</div>
          <div className="text-right">GAMES</div>
        </div>
        {filteredRows.map((row) => (
          <div
            key={row.champion}
            className="grid grid-cols-[64px_1fr_110px_110px_120px_110px_110px] items-center border-b border-baron-border-muted px-4 py-2 text-xs hover:bg-baron-elevated/60"
          >
            <div className="font-semibold text-slate-400">{row.rank}</div>
            <div className="flex items-center gap-3">
              <img
                src={champSquareUrl(row.champion, ddVersion)}
                alt={row.champion}
                className="h-8 w-8 rounded-md object-cover ring-1 ring-baron-border"
              />
              <span className="font-bold text-slate-100">{row.champion}</span>
            </div>
            <div>
              <div className="font-semibold text-slate-200">{row.role}</div>
              <div className="text-[10px] text-slate-500">{row.rolePct}</div>
            </div>
            <div className={cn("text-sm font-black", TIER_TEXT[row.tier])}>{row.tier}</div>
            <div>
              <div className="font-bold text-slate-100">{row.winRate}</div>
              <div
                className={cn(
                  "text-[10px] font-semibold",
                  row.deltaPositive ? "text-emerald-400" : "text-baron-defeat",
                )}
              >
                {row.delta}
              </div>
            </div>
            <div className="font-bold text-slate-200">{row.pickRate}</div>
            <div className="text-right text-slate-300">{row.games}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
