"use client";

import { useEffect, useState } from "react";
import { Check, Download } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { StatefulButton } from "@/components/ui/stateful-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  fetchRuneTreesMap,
  RUNE_STYLE_ICON_FALLBACK,
  runeIconUrl,
  STAT_SHARD_MATRIX,
  type RuneTreeMeta,
} from "@/lib/ddragon";
import {
  importOpggRunesToLcu,
  type OpggDesktopData,
  type OpggDesktopRuneBuild,
  type OpggSingleRuneStat,
} from "@/lib/tauri";

interface RuneMatrixPanelProps {
  championName: string;
  ddVersion: string;
  runePages: OpggDesktopRuneBuild[];
  singleRunes?: OpggDesktopData["single_runes"];
}

function formatStatRate(wins: number, plays: number): string {
  if (plays <= 0) return "—";
  return `${((wins / plays) * 100).toFixed(1)}%`;
}

function formatPickRate(pr: number): string {
  const pct = pr <= 1 ? pr * 100 : pr;
  return `${pct.toFixed(1)}%`;
}

function renderRuneSlotStat(stat?: OpggSingleRuneStat) {
  if (!stat || stat.play <= 0) return null;
  return (
    <div className="mt-1 text-center leading-tight tabular-nums">
      <div className="text-[10px] font-semibold text-baron-ink-secondary">
        {formatStatRate(stat.win, stat.play)}
      </div>
      <div className="text-[10px] font-bold text-baron-ink">
        {formatPickRate(stat.pick_rate)}
      </div>
      <div className="text-[9px] text-baron-ink-muted">{stat.play.toLocaleString()}</div>
    </div>
  );
}

export function RuneMatrixPanel({
  championName,
  ddVersion,
  runePages,
  singleRunes,
}: RuneMatrixPanelProps) {
  const pageScopeKey = `${championName}:${runePages.length}`;
  const [pageSelection, setPageSelection] = useState<{ key: string; idx: number }>({
    key: pageScopeKey,
    idx: 0,
  });
  const [runeTrees, setRuneTrees] = useState<Record<number, RuneTreeMeta>>({});
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    key: string;
    ok: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRuneTreesMap(ddVersion).then((trees) => {
      if (!cancelled) setRuneTrees(trees);
    });
    return () => {
      cancelled = true;
    };
  }, [ddVersion]);

  const selectedPageIdx = pageSelection.key === pageScopeKey ? pageSelection.idx : 0;
  const activeImportStatus = importStatus?.key === pageScopeKey ? importStatus : null;

  const topPages = runePages.slice(0, 2);
  const activePage = topPages[selectedPageIdx] ?? topPages[0];

  if (!activePage) {
    return (
      <div className="rounded-xl border border-baron-border bg-baron-surface p-5 text-[12.5px] text-baron-ink-muted">
        No rune trees were published for {championName} in this mode.
      </div>
    );
  }

  const primaryTree = runeTrees[activePage.primary_page_id];
  const secondaryTree = runeTrees[activePage.secondary_page_id];

  const primarySelected = new Set(activePage.primary_rune_ids ?? []);
  const secondarySelected = new Set(activePage.secondary_rune_ids ?? []);

  const primarySingleMap = new Map<number, OpggSingleRuneStat>();
  for (const r of singleRunes?.primary_page?.runes ?? []) {
    primarySingleMap.set(r.id, r);
  }
  const secondarySingleMap = new Map<number, OpggSingleRuneStat>();
  for (const r of singleRunes?.secondary_page?.runes ?? []) {
    secondarySingleMap.set(r.id, r);
  }

  const handleImport = async (): Promise<boolean> => {
    if (importing) return false;
    const all9 = [
      ...(activePage.primary_rune_ids ?? []).slice(0, 4),
      ...(activePage.secondary_rune_ids ?? []).slice(0, 2),
      ...(activePage.stat_mod_ids ?? []).slice(0, 3),
    ];
    if (
      all9.length < 9 ||
      activePage.primary_page_id <= 0 ||
      activePage.secondary_page_id <= 0
    ) {
      setImportStatus({
        key: pageScopeKey,
        ok: false,
        text: "Incomplete rune configuration for LCU import.",
      });
      return false;
    }

    setImporting(true);
    setImportStatus(null);
    try {
      const res = await importOpggRunesToLcu(
        championName,
        activePage.primary_page_id,
        activePage.secondary_page_id,
        all9.slice(0, 9),
      );
      setImportStatus({ key: pageScopeKey, ok: true, text: res.message });
      return true;
    } catch (err: unknown) {
      setImportStatus({
        key: pageScopeKey,
        ok: false,
        text:
          err instanceof Error
            ? err.message
            : "League Client offline. Launch LoL to inject this rune page.",
      });
      return false;
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="baron-surface-card relative rounded-xl border border-baron-border bg-baron-surface">
      <GlowingEffect
        variant="baron"
        spread={36}
        proximity={54}
        inactiveZone={0.25}
        borderWidth={1}
        disabled={false}
      />
      <div className="relative z-10 overflow-hidden rounded-[inherit]">
      {/* Page Selector Strip (up to 2 pages like OP.GG) */}
      <div className="grid grid-cols-1 border-b border-baron-border sm:grid-cols-2">
        {topPages.map((page, idx) => {
          const isActive = idx === selectedPageIdx || (selectedPageIdx >= topPages.length && idx === 0);
          const pTree = runeTrees[page.primary_page_id];
          const sTree = runeTrees[page.secondary_page_id];
          const pIcon =
            pTree?.icon ?? RUNE_STYLE_ICON_FALLBACK[page.primary_page_id] ?? RUNE_STYLE_ICON_FALLBACK[8000];
          const sIcon =
            sTree?.icon ?? RUNE_STYLE_ICON_FALLBACK[page.secondary_page_id] ?? RUNE_STYLE_ICON_FALLBACK[8400];
          const wr = page.play > 0 ? ((page.win / page.play) * 100).toFixed(2) : "0.00";
          const pr = formatPickRate(page.pick_rate);
          const keystoneId = page.primary_rune_ids?.[0];
          const keystoneNode = pTree?.slots?.[0]?.runes?.find((r) => r.id === keystoneId);

          return (
            <button
              key={`${page.primary_page_id}-${page.secondary_page_id}-${idx}`}
              type="button"
              onClick={() => setPageSelection({ key: pageScopeKey, idx })}
              className={`flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                idx > 0 ? "border-t border-baron-border sm:border-t-0 sm:border-l" : ""
              } ${
                isActive
                  ? "bg-baron-elevated/85 shadow-[inset_0_2px_0_0_var(--color-baron-accent)]"
                  : "bg-baron-surface opacity-70 hover:bg-baron-elevated/45 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={runeIconUrl(keystoneNode?.icon ?? pIcon)}
                  alt={pTree?.name ?? "Primary"}
                  className="h-8 w-8 rounded-full border border-baron-border bg-baron-inset object-cover"
                />
                <img
                  src={runeIconUrl(sIcon)}
                  alt={sTree?.name ?? "Secondary"}
                  className="h-6 w-6 rounded-full border border-baron-border bg-baron-inset object-cover"
                />
              </div>

              <div className="flex items-center gap-5 tabular-nums">
                <div className="text-center">
                  <div className="text-[12.5px] font-bold text-baron-ink">{pr}</div>
                  <div className="text-[10.5px] text-baron-ink-muted">
                    {page.play.toLocaleString()} Games
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-extrabold text-baron-victory">{wr}%</div>
                  <div className="text-[10.5px] text-baron-ink-muted">Win rate</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3-Column Visual Matrix */}
      <div className="grid grid-cols-1 divide-y divide-baron-border lg:grid-cols-[1.35fr_1fr_0.9fr] lg:divide-x lg:divide-y-0">
        {/* Column 1: Primary Tree */}
        <div className="p-4">
          <div className="space-y-3.5">
            {(primaryTree?.slots ?? []).slice(0, 4).map((slot, slotIdx) => {
              const isKeystoneRow = slotIdx === 0;
              return (
                <div
                  key={`primary-slot-${slotIdx}`}
                  className={`flex items-start justify-center gap-3 ${
                    isKeystoneRow ? "border-b border-baron-border/70 pb-3" : ""
                  }`}
                >
                  {slot.runes.map((rune) => {
                    const selected = primarySelected.has(rune.id);
                    const stat = primarySingleMap.get(rune.id);
                    return (
                      <div key={rune.id} className="flex w-11 flex-col items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`relative rounded-full transition-all ${
                                isKeystoneRow ? "h-9 w-9" : "h-8 w-8"
                              } ${
                                selected
                                  ? "ring-2 ring-baron-accent shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] opacity-100"
                                  : "opacity-30 grayscale-[75%]"
                              }`}
                            >
                              <img
                                src={runeIconUrl(rune.icon)}
                                alt={rune.name}
                                className="h-full w-full rounded-full bg-baron-inset object-cover"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="font-semibold text-baron-ink">{rune.name}</div>
                            {stat && (
                              <div className="text-[11px] text-baron-ink-secondary tabular-nums">
                                WR {formatStatRate(stat.win, stat.play)} · Pick {formatPickRate(stat.pick_rate)} ({stat.play.toLocaleString()} games)
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                        {renderRuneSlotStat(stat)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-center text-[11px] font-semibold text-baron-ink-secondary">
            {primaryTree?.name ?? `Style ${activePage.primary_page_id}`}
          </div>
        </div>

        {/* Column 2: Secondary Tree (3 rows x 3 runes) */}
        <div className="flex flex-col justify-between p-4">
          <div className="space-y-3.5 pt-2">
            {(secondaryTree?.slots ?? []).slice(1, 4).map((slot, slotIdx) => (
              <div
                key={`secondary-slot-${slotIdx}`}
                className="flex items-start justify-center gap-3.5"
              >
                {slot.runes.map((rune) => {
                  const selected = secondarySelected.has(rune.id);
                  const stat = secondarySingleMap.get(rune.id);
                  return (
                    <div key={rune.id} className="flex w-11 flex-col items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-8 w-8 rounded-full transition-all ${
                              selected
                                ? "ring-2 ring-baron-accent shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] opacity-100"
                                : "opacity-30 grayscale-[75%]"
                            }`}
                          >
                            <img
                              src={runeIconUrl(rune.icon)}
                              alt={rune.name}
                              className="h-full w-full rounded-full bg-baron-inset object-cover"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="font-semibold text-baron-ink">{rune.name}</div>
                          {stat && (
                            <div className="text-[11px] text-baron-ink-secondary tabular-nums">
                              WR {formatStatRate(stat.win, stat.play)} · Pick {formatPickRate(stat.pick_rate)} ({stat.play.toLocaleString()} games)
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                      {renderRuneSlotStat(stat)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 text-center text-[11px] font-semibold text-baron-ink-secondary">
            {secondaryTree?.name ?? `Style ${activePage.secondary_page_id}`}
          </div>
        </div>

        {/* Column 3: Stat Shards (3 rows x 3 shards, matched per row index) */}
        <div className="flex flex-col justify-between p-4">
          <div className="space-y-4 pt-3">
            {STAT_SHARD_MATRIX.map((row, rowIdx) => {
              const targetShardId = Number(activePage.stat_mod_ids?.[rowIdx] ?? 0);
              return (
                <div
                  key={`shard-row-${rowIdx}`}
                  className="flex items-center justify-center gap-4"
                >
                  {row.map((shard) => {
                    const selected = targetShardId === shard.id;
                    return (
                      <Tooltip key={`${rowIdx}-${shard.id}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                              selected
                                ? "border-baron-accent bg-baron-accent/20 ring-2 ring-baron-accent/70 opacity-100"
                                : "border-baron-border bg-baron-inset opacity-30 grayscale-[75%]"
                            }`}
                          >
                            <img
                              src={shard.iconUrl}
                              alt={shard.name}
                              className="h-5 w-5 rounded-full object-contain"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{shard.name}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-center text-[11px] font-semibold text-baron-ink-secondary">
            Shards
          </div>
        </div>
      </div>

      {/* Full-width Import Rune Bar (@aceternity/stateful-button) */}
      <div className="border-t border-baron-border bg-baron-inset/60 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatefulButton
            disabled={importing}
            onClick={handleImport}
            className="h-8 flex-1 text-[12px] font-bold"
          >
            {activeImportStatus?.ok ? (
              <>
                <Check className="h-3.5 w-3.5" />
                {activeImportStatus.text}
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                {importing
                  ? "Injecting Runes to League Client..."
                  : `Import Runes (Baron: ${championName})`}
              </>
            )}
          </StatefulButton>
          {activeImportStatus && !activeImportStatus.ok && (
            <span className="text-[11px] font-medium text-baron-gold">
              {activeImportStatus.text}
            </span>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
