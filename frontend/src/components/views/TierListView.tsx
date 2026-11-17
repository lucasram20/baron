"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpDown, ExternalLink, RefreshCw, Search } from "lucide-react";
import { LaneIcon } from "@/components/icons/LolIcons";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIER_LIST_ROWS } from "@/data/mockDpm";
import { champSquareUrl, LATEST_DDRAGON } from "@/lib/ddragon";
import {
  fetchProviderTierList,
  isProviderAvailable,
  type ProviderTierEntry,
  type TierRole,
} from "@/lib/tauri";

const TIER_ROLES: { id: TierRole; label: string; short: string }[] = [
  { id: "Top", label: "Top", short: "Top" },
  { id: "Jungle", label: "Jungle", short: "Jg" },
  { id: "Middle", label: "Mid", short: "Mid" },
  { id: "Bottom", label: "Bot", short: "Bot" },
  { id: "Utility", label: "Support", short: "Sup" },
];

type SortKey = "rank" | "win_rate" | "pick_rate" | "ban_rate";

function tierColorClass(tier: string): string {
  const t = tier.toUpperCase();
  if (t === "OP" || t === "S+" || t === "0") return "text-baron-gold";
  if (t === "1" || t === "S") return "text-baron-ace";
  if (t === "2" || t === "A") return "text-baron-cyan";
  return "text-baron-ink-secondary";
}

function normalizeSampleRole(role: string): TierRole {
  const r = role.toLowerCase();
  if (r === "top") return "Top";
  if (r === "jg" || r === "jungle") return "Jungle";
  if (r === "mid" || r === "middle") return "Middle";
  if (r === "bot" || r === "bottom") return "Bottom";
  return "Utility";
}

export function TierListView({
  activeProviderId,
  activeProviderLabel,
  refreshNonce = 0,
  searchFilter = "",
}: {
  activeProviderId: string;
  activeProviderLabel: string;
  refreshNonce?: number;
  searchFilter?: string;
}) {
  const [role, setRole] = useState<TierRole>("Middle");
  const [query, setQuery] = useState(searchFilter);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  const [fetchState, setFetchState] = useState<{
    key: string;
    entries: ProviderTierEntry[];
    error: string | null;
  }>({
    key: "",
    entries: [],
    error: null,
  });

  const available = isProviderAvailable(activeProviderId);
  const requestKey = `${activeProviderId}:${role}:${refreshNonce}:${retryCount}`;
  const isLoading = available && fetchState.key !== requestKey;

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    fetchProviderTierList(activeProviderId, role)
      .then((entries) => {
        if (!cancelled) {
          setFetchState({ key: requestKey, entries, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load live OP.GG tier list.";
          setFetchState({ key: requestKey, entries: [], error: message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [available, activeProviderId, role, requestKey]);

  const effectiveError = !available
    ? `${activeProviderLabel} is currently unavailable because only OP.GG has a verified live tier-list integration.`
    : fetchState.key === requestKey
      ? fetchState.error
      : null;

  const liveEntries = fetchState.key === requestKey ? fetchState.entries : [];

  const usingSampleFallback = Boolean(effectiveError && showSamplePreview);
  const activeRows: ProviderTierEntry[] = usingSampleFallback
    ? TIER_LIST_ROWS.filter((r) => normalizeSampleRole(r.role) === role).map((r, i) => ({
        rank: r.rank ?? i + 1,
        champion_name: r.champion,
        role,
        tier: r.tier,
        win_rate: Number.parseFloat(r.winRate) || 50,
        pick_rate: Number.parseFloat(r.pickRate) || 0,
        ban_rate: 0,
        matches_label: r.games,
      }))
    : liveEntries;

  const filtered = activeRows.filter((row) =>
    row.champion_name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const sorted = filtered.toSorted((a, b) => {
    const dir = sortAsc ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * dir;
  });

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(nextKey);
      setSortAsc(nextKey === "rank");
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="border-b border-baron-border bg-baron-surface px-5 pt-4 pb-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-baron-ink">
                Champion Tierlist
              </h1>
              {usingSampleFallback ? (
                <span className="rounded bg-baron-gold/15 px-2 py-0.5 text-[10.5px] font-semibold text-baron-gold">
                  Sample Preview (Not Live OP.GG)
                </span>
              ) : effectiveError ? (
                <span className="rounded bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary ring-1 ring-baron-border">
                  Desktop Host Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded bg-baron-emerald/12 px-2 py-0.5 text-[10.5px] font-semibold text-baron-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-baron-emerald" aria-hidden="true" />
                  Live · {activeProviderLabel} MCP
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-baron-ink-muted">
              Live lane rankings from{" "}
              <a
                href="https://op.gg"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-baron-accent-soft hover:underline"
              >
                OP.GG
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              (All Regions · Emerald+ · Current Patch). No unimplemented region/rank dropdowns.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowSamplePreview(false);
              setRetryCount((n) => n + 1);
            }}
            className="border-baron-border bg-baron-elevated text-[12px] text-baron-ink hover:border-baron-border-strong"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Feed
          </Button>
        </div>

        {/* Role & Champion Search Bar */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          <AnimatedTabs
            layoutId="tierlist-lane-tabs"
            ariaLabel="Select champion lane"
            value={role}
            onChange={(next) => {
              setRole(next);
              setSortKey("rank");
              setSortAsc(true);
            }}
            items={TIER_ROLES.map((r) => ({
              id: r.id,
              label: r.label,
              icon: <LaneIcon role={r.short} className="h-3.5 w-3.5" />,
            }))}
          />

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-baron-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search champion..."
              aria-label="Filter champions by name"
              className="h-8 w-56 rounded-md border border-baron-border bg-baron-inset pr-3 pl-8 text-[12px] text-baron-ink placeholder:text-baron-ink-muted focus:border-baron-accent focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Loading Skeleton */}
      {isLoading && (
        <div role="status" aria-label="Loading live OP.GG tier list" className="divide-y divide-baron-border">
          <div className="px-5 py-2.5 text-[11.5px] font-medium text-baron-ink-muted">
            Fetching live {role} rankings from {activeProviderLabel}...
          </div>
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-7 bg-baron-elevated" />
              <Skeleton className="h-8 w-8 rounded-md bg-baron-elevated" />
              <Skeleton className="h-4 w-32 bg-baron-elevated" />
              <Skeleton className="ml-auto h-4 w-12 bg-baron-elevated" />
              <Skeleton className="h-4 w-16 bg-baron-elevated" />
              <Skeleton className="h-4 w-16 bg-baron-elevated" />
              <Skeleton className="h-4 w-16 bg-baron-elevated" />
            </div>
          ))}
        </div>
      )}

      {/* Honest Error / Browser Preview Notice */}
      {!isLoading && effectiveError && !usingSampleFallback && (
        <div
          role="alert"
          className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold text-baron-ink">
                Live OP.GG Tier List Unavailable Outside Desktop Host
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-baron-ink-secondary">
                {effectiveError}
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {available && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setRetryCount((n) => n + 1)}
                    className="h-7 bg-baron-accent px-3 text-[11.5px] text-white hover:opacity-90"
                  >
                    Retry Live Request
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSamplePreview(true)}
                  className="h-7 border-baron-border bg-baron-elevated px-3 text-[11.5px] text-baron-ink-secondary hover:text-baron-ink"
                >
                  Inspect Sample Table Schema
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dense DPM-Style Data Table */}
      {!isLoading && (!effectiveError || usingSampleFallback) && (
        <Table>
          <TableHeader>
            <TableRow className="border-baron-border hover:bg-transparent">
              <TableHead className="w-16 pl-5">
                <button
                  type="button"
                  onClick={() => handleSort("rank")}
                  className="inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase hover:text-baron-ink"
                >
                  <span>Rank</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Champion
              </TableHead>
              <TableHead className="w-20 text-center text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Lane
              </TableHead>
              <TableHead className="w-20 text-center text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Tier
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => handleSort("win_rate")}
                  className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase hover:text-baron-ink"
                >
                  <span>Winrate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => handleSort("pick_rate")}
                  className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase hover:text-baron-ink"
                >
                  <span>Pickrate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  type="button"
                  onClick={() => handleSort("ban_rate")}
                  className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase hover:text-baron-ink"
                >
                  <span>Banrate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="pr-5 text-right text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                Games
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-[13px] text-baron-ink-muted">
                  No champions found for &ldquo;{query}&rdquo; in {role}.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((entry) => (
                <TableRow
                  key={`${entry.role}-${entry.champion_name}`}
                  className="border-baron-border hover:bg-baron-surface/80"
                >
                  <TableCell className="pl-5 font-bold text-baron-ink-muted tnum">
                    {entry.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={champSquareUrl(entry.champion_name, LATEST_DDRAGON)}
                        alt={entry.champion_name}
                        className="h-8 w-8 rounded-md border border-baron-border object-cover"
                      />
                      <span className="font-semibold text-baron-ink">{entry.champion_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-baron-ink-muted">
                    <span className="inline-flex justify-center">
                      <LaneIcon role={entry.role} className="h-3.5 w-3.5" />
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-center text-[14px] font-black tracking-tight ${tierColorClass(
                      entry.tier,
                    )}`}
                  >
                    {entry.tier}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold tnum ${
                      entry.win_rate >= 51.5
                        ? "text-baron-emerald"
                        : entry.win_rate < 49
                          ? "text-baron-defeat"
                          : "text-baron-ink"
                    }`}
                  >
                    {entry.win_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-baron-ink-secondary tnum">
                    {entry.pick_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-baron-ink-muted tnum">
                    {entry.ban_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="pr-5 text-right text-baron-ink-secondary tnum">
                    {entry.matches_label}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
