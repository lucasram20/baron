"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, HelpCircle, Search, Sparkles } from "lucide-react";
import { LaneIcon } from "@/components/icons/LolIcons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TIER_LIST_ROWS } from "@/data/mockDpm";
import { champSplashUrl, champSquareUrl, itemIconUrl, runeIconUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { TierListRow } from "@/types/baron";

interface TierListViewProps {
  ddVersion: string;
  patch: string;
  activeProviderLabel: string;
  onOpenChampSelect?: () => void;
}

type SortField = "rank" | "tier" | "winRate" | "pickRate" | "games";

const TIER_TEXT: Record<TierListRow["tier"], string> = {
  "S+": "text-baron-gold",
  S: "text-baron-ace",
  A: "text-baron-cyan",
  B: "text-baron-emerald",
};

const TIER_ORDER: Record<TierListRow["tier"], number> = {
  "S+": 4,
  S: 3,
  A: 2,
  B: 1,
};

const ROLE_FILTERS = [
  { id: "*", label: "All roles" },
  { id: "Top", label: "Top" },
  { id: "Jg", label: "Jungle" },
  { id: "Mid", label: "Mid" },
  { id: "Bot", label: "Bot" },
  { id: "Sup", label: "Support" },
] as const;

export function TierListView({
  ddVersion,
  patch,
  activeProviderLabel,
  onOpenChampSelect,
}: TierListViewProps) {
  const [mode, setMode] = useState("Ranked");
  const [roleFilter, setRoleFilter] = useState("*");
  const [rankFilter, setRankFilter] = useState("emerald+");
  const [regionFilter, setRegionFilter] = useState("all");
  const [offMeta, setOffMeta] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("tier");
  const [sortAsc, setSortAsc] = useState(false);
  const [inspectedChamp, setInspectedChamp] = useState<TierListRow | null>(null);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(field === "rank");
    }
  };

  const filteredRows = TIER_LIST_ROWS.filter((r) => {
    if (roleFilter !== "*" && r.role !== roleFilter) return false;
    if (search.trim() && !r.champion.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  }).toSorted((a, b) => {
    let diff = 0;
    if (sortBy === "rank") diff = a.rank - b.rank;
    else if (sortBy === "tier") diff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.rank - b.rank;
    else if (sortBy === "winRate") diff = parseFloat(a.winRate) - parseFloat(b.winRate);
    else if (sortBy === "pickRate") diff = parseFloat(a.pickRate) - parseFloat(b.pickRate);
    else diff = parseInt(a.games.replace(/\D/g, ""), 10) - parseInt(b.games.replace(/\D/g, ""), 10);
    return sortAsc ? diff : -diff;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) return null;
    return sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header Banner matching DPM Tierlist */}
      <div className="relative flex items-center justify-between overflow-hidden rounded-xl border border-baron-border bg-baron-surface px-5 py-3.5">
        <img
          src={champSplashUrl("Syndra", 0)}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-24 h-full w-[38%] object-cover object-center opacity-18 [mask-image:linear-gradient(to_right,transparent,black_45%,transparent)]"
        />
        <div className="relative flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-baron-accent-soft" />
            <h1 className="text-2xl font-extrabold tracking-tight text-baron-ink">Tierlist</h1>
          </div>
          <p className="max-w-md text-xs text-baron-ink-secondary">
            Explore Baron Tierlists ({activeProviderLabel} · Patch {patch}) — click any champion to
            inspect core build, runes &amp; matchups.
          </p>
        </div>

        <div className="relative flex items-center gap-1 rounded-lg border border-baron-border bg-baron-elevated p-1">
          {["Ranked", "Aram", "Arena", "Duo"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition",
                mode === m
                  ? "bg-baron-accent text-white shadow-sm"
                  : "text-baron-ink-secondary hover:text-baron-ink",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-baron-border bg-baron-surface p-1">
            {ROLE_FILTERS.map((r) => (
              <Tooltip key={r.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={r.label}
                    onClick={() => setRoleFilter(r.id)}
                    className={cn(
                      "flex h-7 w-8 items-center justify-center rounded-md transition",
                      roleFilter === r.id
                        ? "bg-baron-accent text-white"
                        : "text-baron-ink-muted hover:bg-baron-hover hover:text-baron-ink",
                    )}
                  >
                    <LaneIcon role={r.id} className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{r.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Select value={rankFilter} onValueChange={setRankFilter}>
            <SelectTrigger size="sm" className="h-8 w-[142px] border-baron-border bg-baron-surface text-xs font-bold text-baron-emerald">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="emerald+">EMERALD+</SelectItem>
              <SelectItem value="diamond+">DIAMOND+</SelectItem>
              <SelectItem value="master+">MASTER+</SelectItem>
              <SelectItem value="all">ALL RANKS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger size="sm" className="h-8 w-[138px] border-baron-border bg-baron-surface text-xs font-semibold text-baron-ink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL REGIONS</SelectItem>
              <SelectItem value="kr">KR</SelectItem>
              <SelectItem value="euw">EUW</SelectItem>
              <SelectItem value="na">NA</SelectItem>
            </SelectContent>
          </Select>

          <span className="rounded-lg border border-baron-border bg-baron-surface px-3 py-1.5 text-xs font-semibold text-baron-ink">
            {patch}
          </span>

          <div className="ml-1 flex items-center gap-2 text-xs text-baron-ink-secondary">
            <Switch checked={offMeta} onCheckedChange={setOffMeta} />
            <span className="font-semibold tracking-wide">OFF-META</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Off-meta explanation"
                  className="text-baron-ink-muted hover:text-baron-ink"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Include low pickrate flex and off-meta lane picks</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex h-8 w-56 items-center gap-2 rounded-lg border border-baron-border bg-baron-surface px-2.5 focus-within:border-baron-accent">
          <Search className="h-3.5 w-3.5 text-baron-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a champion"
            className="w-full bg-transparent text-xs text-baron-ink placeholder:text-baron-ink-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
        <div className="grid grid-cols-[64px_1fr_110px_110px_120px_110px_110px] border-b border-baron-border px-4 py-2.5 text-[11px] font-bold tracking-wider text-baron-ink-muted">
          <button
            type="button"
            onClick={() => toggleSort("rank")}
            className="flex items-center gap-1 text-left hover:text-baron-ink"
          >
            <span>RANK</span>
            {renderSortIcon("rank")}
          </button>
          <div>CHAMPION</div>
          <div>LANE</div>
          <button
            type="button"
            onClick={() => toggleSort("tier")}
            className="flex items-center gap-1 text-left hover:text-baron-ink"
          >
            <span>TIER</span>
            {renderSortIcon("tier")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("winRate")}
            className="flex items-center gap-1 text-left hover:text-baron-ink"
          >
            <span>WINRATE</span>
            {renderSortIcon("winRate")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("pickRate")}
            className="flex items-center gap-1 text-left hover:text-baron-ink"
          >
            <span>PICKRATE</span>
            {renderSortIcon("pickRate")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("games")}
            className="flex items-center justify-end gap-1 hover:text-baron-ink"
          >
            <span>GAMES</span>
            {renderSortIcon("games")}
          </button>
        </div>

        {filteredRows.map((row, idx) => (
          <button
            key={row.champion}
            type="button"
            onClick={() => setInspectedChamp(row)}
            className="grid w-full grid-cols-[64px_1fr_110px_110px_120px_110px_110px] items-center border-b border-baron-border-muted px-4 py-2 text-left text-xs transition hover:bg-baron-hover/65"
          >
            <div className="font-semibold text-baron-ink-muted">{idx + 1}</div>
            <div className="flex items-center gap-3">
              <img
                src={champSquareUrl(row.champion, ddVersion)}
                alt={row.champion}
                className="h-8 w-8 rounded-md object-cover ring-1 ring-baron-border"
              />
              <span className="font-bold text-baron-ink">{row.champion}</span>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <LaneIcon role={row.role} className="h-3.5 w-3.5 text-baron-ink-secondary" />
              <div className="text-[10px] text-baron-ink-muted">{row.rolePct}</div>
            </div>
            <div className={cn("text-base font-black", TIER_TEXT[row.tier])}>{row.tier}</div>
            <div>
              <div className="font-bold text-baron-ink">{row.winRate}</div>
              <div
                className={cn(
                  "text-[10px] font-semibold",
                  row.deltaPositive ? "text-baron-emerald" : "text-baron-defeat",
                )}
              >
                {row.delta}
              </div>
            </div>
            <div className="font-bold text-baron-ink">{row.pickRate}</div>
            <div className="text-right text-baron-ink-secondary">{row.games}</div>
          </button>
        ))}
      </div>

      {/* Champion Build & Counter Quick Modal */}
      <Dialog open={inspectedChamp !== null} onOpenChange={(o) => !o && setInspectedChamp(null)}>
        <DialogContent className="max-w-lg border-baron-border bg-baron-sidebar text-baron-ink">
          {inspectedChamp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg font-extrabold text-baron-ink">
                  <img
                    src={champSquareUrl(inspectedChamp.champion, ddVersion)}
                    alt={inspectedChamp.champion}
                    className="h-10 w-10 rounded-lg object-cover ring-1 ring-baron-border"
                  />
                  <div>
                    <div>
                      {inspectedChamp.champion}{" "}
                      <span className={cn("ml-1 text-base font-black", TIER_TEXT[inspectedChamp.tier])}>
                        {inspectedChamp.tier}
                      </span>
                    </div>
                    <DialogDescription className="text-xs text-baron-ink-secondary">
                      {inspectedChamp.role} ({inspectedChamp.rolePct}) · {inspectedChamp.winRate} WR ·{" "}
                      {inspectedChamp.games} games ({activeProviderLabel})
                    </DialogDescription>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-3 text-xs">
                <div className="rounded-lg border border-baron-border bg-baron-surface p-3">
                  <div className="mb-2 text-[10px] font-bold tracking-wider text-baron-ink-muted">
                    RECOMMENDED KEYSTONE &amp; CORE ITEMS
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={runeIconUrl("perk-images/Styles/Domination/Electrocute/Electrocute.png")}
                        alt="Keystone"
                        className="h-8 w-8 rounded-full bg-baron-elevated p-1 ring-1 ring-baron-border"
                      />
                      <span className="font-semibold text-baron-ink">Primary Meta Setup</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[3006, 6672, 3046, 3031].map((id) => (
                        <img
                          key={id}
                          src={itemIconUrl(id, ddVersion)}
                          alt={String(id)}
                          className="h-7 w-7 rounded border border-baron-border"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {onOpenChampSelect && (
                  <div className="flex justify-end">
                    <HoverBorderGradient
                      onClick={() => {
                        setInspectedChamp(null);
                        onOpenChampSelect();
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-baron-gold" />
                      <span>Open in Champ Select</span>
                    </HoverBorderGradient>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
