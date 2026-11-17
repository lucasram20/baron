"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Slash } from "lucide-react";
import type { BaronRoute } from "@/components/shell/Sidebar";
import { ObjectiveBadge } from "@/components/icons/LolIcons";
import SpotlightCard from "@/components/SpotlightCard";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  champSplashUrl,
  champSquareUrl,
  fetchRuneMetadataMap,
  itemIconUrl,
  RUNE_STYLE_ICON_FALLBACK,
  runeIconUrl,
  spellIdUrl,
} from "@/lib/ddragon";
import type { OpggGameDetailResponse } from "@/lib/tauri";
import { useTheme } from "@/lib/theme";

type PostGameTab = "scoreboard" | "objectives";

function formatDuration(secs = 0): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PostGameView({
  ddVersion,
  gameDetail,
  loading = false,
  error = null,
  onNavigate,
}: {
  ddVersion: string;
  gameDetail?: OpggGameDetailResponse | null;
  loading?: boolean;
  error?: string | null;
  onNavigate?: (route: BaronRoute) => void;
}) {
  const { resolved } = useTheme();
  const [tab, setTab] = useState<PostGameTab>("scoreboard");
  const [runeMeta, setRuneMeta] = useState<Record<number, { name: string; icon: string }>>({});

  useEffect(() => {
    let cancelled = false;
    fetchRuneMetadataMap(ddVersion).then((m) => {
      if (!cancelled) setRuneMeta(m);
    });
    return () => {
      cancelled = true;
    };
  }, [ddVersion]);

  if (loading) {
    return (
      <div role="status" className="space-y-4 p-5">
        <div className="text-[12px] text-baron-ink-muted">
          Fetching full 10-player match detail from OP.GG MCP...
        </div>
        <Skeleton className="h-36 w-full rounded-xl bg-baron-surface" />
        <Skeleton className="h-72 w-full rounded-xl bg-baron-surface" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5">
        <div className="flex items-start gap-2.5 text-[13px] text-baron-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
          <div>
            <div className="font-bold">Could not load match detail</div>
            <p className="mt-1 text-[12px] text-baron-ink-secondary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const detail = gameDetail?.data?.game_detail;
  if (!detail) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-baron-border bg-baron-surface p-6">
          <h1 className="text-[17px] font-extrabold text-baron-ink">Post-game Match Analysis</h1>
          <p className="mt-1.5 max-w-xl text-[12.5px] text-baron-ink-secondary">
            Search any Riot ID on the Dashboard and select a recent match to inspect full 10-player
            items, runes, OP scores, damage shares, and objectives live from OP.GG MCP.
          </p>
          {onNavigate && (
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                onClick={() => onNavigate("dashboard")}
                className="h-8 bg-baron-accent px-3.5 text-[12px] font-semibold text-white"
              >
                Go to Summoner Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const teams = detail.teams ?? [];
  const allPlayers = teams.flatMap((t) => t.participants ?? []);
  const focus = allPlayers.find((p) => p.is_target) ?? allPlayers[0];
  const maxDmg = Math.max(
    1,
    ...allPlayers.map((p) => p.stats?.total_damage_dealt_to_champions ?? 1),
  );
  const avgDmg =
    allPlayers.reduce((sum, p) => sum + (p.stats?.total_damage_dealt_to_champions ?? 0), 0) /
    Math.max(1, allPlayers.length);

  const focusWin = (focus?.stats?.result ?? "").toUpperCase() === "WIN";
  const focusK = focus?.stats?.kill ?? 0;
  const focusD = focus?.stats?.death ?? 0;
  const focusA = focus?.stats?.assist ?? 0;
  const focusKda = focusD > 0 ? ((focusK + focusA) / focusD).toFixed(2) : "Perfect";
  const focusCs =
    (focus?.stats?.minion_kill ?? 0) + (focus?.stats?.neutral_minion_kill ?? 0);
  const mins = Math.max(1, (detail.game_length_second ?? 600) / 60);
  const focusScore = Math.round((focus?.stats?.op_score ?? 5) * 10);

  return (
    <div className="min-h-full">
      {/* Match Hero Header */}
      <SpotlightCard
        theme={resolved}
        intensity={0.07}
        borderGlow={0.45}
        style={{ borderRadius: 0 }}
        className="relative overflow-hidden rounded-none border-x-0 border-t-0 border-b border-baron-border bg-baron-surface"
      >
        {focus && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[44%] bg-cover bg-center opacity-[0.18] dark:opacity-[0.22]"
            style={{
              backgroundImage: `url('${champSplashUrl(focus.champion_name, 0)}')`,
              maskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
            }}
          />
        )}

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          {focus && (
            <div className="flex items-center gap-3.5">
              <div className="relative h-[52px] w-[52px] shrink-0">
                <img
                  src={champSquareUrl(focus.champion_name, ddVersion)}
                  alt={focus.champion_name}
                  className="h-[52px] w-[52px] rounded-xl border-2 border-baron-border-strong object-cover"
                />
                <span className="absolute -right-1 -bottom-1 rounded bg-baron-elevated px-1.5 py-[1px] text-[10px] font-bold text-baron-ink ring-1 ring-baron-border-strong tnum">
                  {focus.stats?.champion_level ?? 18}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1">
                {(focus.spells ?? []).slice(0, 2).map((spId, idx) => (
                  <img
                    key={`${spId}-${idx}`}
                    src={spellIdUrl(spId, ddVersion)}
                    alt={`Spell ${spId}`}
                    className="h-[22px] w-[22px] rounded border border-baron-border object-cover"
                  />
                ))}
                {focus.rune?.primary_rune_id && runeMeta[focus.rune.primary_rune_id]?.icon && (
                  <img
                    src={runeIconUrl(runeMeta[focus.rune.primary_rune_id].icon)}
                    alt="Keystone"
                    className="h-[22px] w-[22px] rounded-full border border-baron-border bg-baron-inset object-cover"
                  />
                )}
                {focus.rune?.secondary_page_id && (
                  <img
                    src={runeIconUrl(
                      runeMeta[focus.rune.secondary_page_id]?.icon ??
                        RUNE_STYLE_ICON_FALLBACK[focus.rune.secondary_page_id] ??
                        RUNE_STYLE_ICON_FALLBACK[8200],
                    )}
                    alt="Secondary Tree"
                    className="h-[22px] w-[22px] rounded-full border border-baron-border bg-baron-inset object-cover p-0.5"
                  />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[17px] font-extrabold tracking-[-0.02em] text-baron-ink">
                    {focus.summoner?.game_name ?? focus.champion_name}{" "}
                    <span className="font-semibold text-baron-ink-muted">
                      #{focus.summoner?.tagline ?? ""}
                    </span>
                  </h1>
                  <span className="rounded bg-baron-emerald/15 px-2 py-0.5 text-[10.5px] font-semibold text-baron-emerald">
                    Live · OP.GG MCP
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-baron-ink-muted tnum">
                  {focus.champion_name} · {detail.game_type ?? "RANKED"} ·{" "}
                  {formatDuration(detail.game_length_second)}
                  {detail.average_tier_info?.tier
                    ? ` · Avg ${detail.average_tier_info.tier}`
                    : ""}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3.5">
            <ScoreRing score={focusScore} size="lg" label={`OP Score ${focusScore}`} />
            <div className="text-right">
              <div
                className={`text-[20px] font-extrabold tracking-tight ${
                  focusWin ? "text-baron-victory" : "text-baron-defeat"
                }`}
              >
                {focusWin ? "Victory" : "Defeat"}
              </div>
              <div className="text-[11px] font-semibold text-baron-ink-muted tnum">
                Rank #{focus?.stats?.op_score_rank ?? "-"} in match
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 divide-x divide-baron-border border-t border-baron-border sm:grid-cols-5">
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">
              {focusK}/{focusD}/{focusA}
            </div>
            <div className="text-[11px] text-baron-ink-muted">{focusKda} KDA</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">
              {(focusCs / mins).toFixed(1)}
            </div>
            <div className="text-[11px] text-baron-ink-muted">CS/min · {focusCs} total</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">
              {((focus?.stats?.total_damage_dealt_to_champions ?? 0) / 1000).toFixed(1)}k
            </div>
            <div className="text-[11px] text-baron-ink-muted">Damage to champions</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">
              {((focus?.stats?.gold_earned ?? 0) / 1000).toFixed(1)}k
            </div>
            <div className="text-[11px] text-baron-ink-muted">Gold earned</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">
              {focus?.stats?.vision_wards_bought_in_game ?? 0}
            </div>
            <div className="text-[11px] text-baron-ink-muted">Control wards</div>
          </div>
        </div>
      </SpotlightCard>

      <div className="border-b border-baron-border bg-baron-surface/60 px-5 py-2">
        <AnimatedTabs
          layoutId="postgame-subtabs"
          ariaLabel="Post-game analysis views"
          value={tab}
          onChange={setTab}
          items={[
            { id: "scoreboard", label: "Scoreboard" },
            { id: "objectives", label: "Team Objectives & Bans" },
          ]}
        />
      </div>

      {tab === "scoreboard" && (
        <div className="divide-y divide-baron-border">
          {teams.map((tm) => {
            const isBlue = tm.key.toUpperCase() === "BLUE";
            const isWin = tm.game_stat?.is_win ?? false;
            const side: "blue" | "red" = isBlue ? "blue" : "red";
            const players = tm.participants ?? [];
            const avgTickPct = Math.min(92, Math.max(10, (avgDmg / maxDmg) * 100));

            return (
              <section key={tm.key}>
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 border-b border-baron-border px-5 py-2.5 ${
                    isWin ? "bg-baron-victory/5" : "bg-baron-defeat/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[13px] font-bold ${
                        isWin ? "text-baron-victory" : "text-baron-defeat"
                      }`}
                    >
                      {isWin ? "Victory" : "Defeat"}
                    </span>
                    <span className="text-[12px] text-baron-ink-muted">
                      {isBlue ? "Blue side" : "Red side"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <ObjectiveBadge kind="tower" count={tm.game_stat?.tower_kill ?? 0} team={side} />
                    <ObjectiveBadge kind="grub" count={tm.game_stat?.horde_kill ?? 0} team={side} />
                    <ObjectiveBadge
                      kind="herald"
                      count={tm.game_stat?.rift_herald_kill ?? 0}
                      team={side}
                    />
                    <ObjectiveBadge kind="dragon" count={tm.game_stat?.dragon_kill ?? 0} team={side} />
                    <ObjectiveBadge kind="baron" count={tm.game_stat?.baron_kill ?? 0} team={side} />
                  </div>

                  <div className="flex items-center gap-4">
                    {(tm.banned_champions_names?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-baron-ink-muted">Bans</span>
                        <div className="flex items-center gap-1">
                          {tm.banned_champions_names?.map((champ) => (
                            <div key={champ} className="relative h-5 w-5 overflow-hidden rounded">
                              <img
                                src={champSquareUrl(champ, ddVersion)}
                                alt={`Banned ${champ}`}
                                title={`Banned ${champ}`}
                                className="h-full w-full object-cover opacity-55 grayscale"
                              />
                              <Slash className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-baron-defeat/80" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-[12px] font-semibold text-baron-ink tnum">
                      {tm.game_stat?.champion_kill ?? 0} Kills{" "}
                      <span className="ml-2 font-normal text-baron-ink-secondary">
                        {((tm.game_stat?.gold_earned ?? 0) / 1000).toFixed(1)}k gold
                      </span>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableBody>
                    {players.map((p, pIdx) => {
                      const k = p.stats?.kill ?? 0;
                      const d = p.stats?.death ?? 0;
                      const a = p.stats?.assist ?? 0;
                      const pcs =
                        (p.stats?.minion_kill ?? 0) + (p.stats?.neutral_minion_kill ?? 0);
                      const pdmg = p.stats?.total_damage_dealt_to_champions ?? 0;
                      const dmgWidth = Math.round((pdmg / maxDmg) * 100);
                      const op = Math.round((p.stats?.op_score ?? 5) * 10);
                      const rankLabel = p.stats?.op_score_rank === 1 ? "MVP" : `#${p.stats?.op_score_rank ?? pIdx + 1}`;

                      return (
                        <TableRow
                          key={`${tm.key}-${p.champion_name}-${pIdx}`}
                          className={`border-baron-border ${
                            p.is_target
                              ? "bg-baron-accent/8 hover:bg-baron-accent/12"
                              : "hover:bg-baron-surface/75"
                          }`}
                        >
                          <TableCell className="w-[62px] pl-5">
                            {p.stats?.op_score_rank === 1 ? (
                              <span className="inline-block rounded bg-baron-gold/20 px-1.5 py-0.5 text-[10.5px] font-extrabold text-baron-gold">
                                {isWin ? "MVP" : "ACE"}
                              </span>
                            ) : (
                              <span className="text-[12px] font-semibold text-baron-ink-muted tnum">
                                {rankLabel}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="min-w-[220px]">
                            <div className="flex items-center gap-2.5">
                              <div className="relative h-9 w-9 shrink-0">
                                <img
                                  src={champSquareUrl(p.champion_name, ddVersion)}
                                  alt={p.champion_name}
                                  className="h-9 w-9 rounded-md border border-baron-border-strong object-cover"
                                />
                                <span className="absolute -right-1 -bottom-1 rounded bg-baron-elevated px-1 text-[9px] font-bold text-baron-ink ring-1 ring-baron-border tnum">
                                  {p.stats?.champion_level ?? 18}
                                </span>
                              </div>

                              <div className="grid shrink-0 grid-cols-2 gap-0.5">
                                {(p.spells ?? []).slice(0, 2).map((spId, si) => (
                                  <img
                                    key={`${spId}-${si}`}
                                    src={spellIdUrl(spId, ddVersion)}
                                    alt={`Spell ${spId}`}
                                    className="h-4 w-4 rounded-[3px] object-cover"
                                  />
                                ))}
                                {p.rune?.primary_rune_id && runeMeta[p.rune.primary_rune_id]?.icon && (
                                  <img
                                    src={runeIconUrl(runeMeta[p.rune.primary_rune_id].icon)}
                                    alt="Keystone"
                                    className="h-4 w-4 rounded-full bg-baron-inset object-cover"
                                  />
                                )}
                                {p.rune?.secondary_page_id && (
                                  <img
                                    src={runeIconUrl(
                                      runeMeta[p.rune.secondary_page_id]?.icon ??
                                        RUNE_STYLE_ICON_FALLBACK[p.rune.secondary_page_id] ??
                                        RUNE_STYLE_ICON_FALLBACK[8200],
                                    )}
                                    alt="Secondary"
                                    className="h-4 w-4 rounded-full bg-baron-inset object-cover p-0.5"
                                  />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-semibold text-baron-ink">
                                    {p.summoner?.game_name ?? p.champion_name}
                                  </span>
                                  {p.summoner?.tagline && (
                                    <span className="text-[11px] text-baron-ink-muted">
                                      #{p.summoner.tagline}
                                    </span>
                                  )}
                                  {p.is_target && (
                                    <span className="rounded bg-baron-victory/20 px-1 py-[1px] text-[9.5px] font-bold text-baron-victory">
                                      FOCUS
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-baron-ink-muted">
                                  {p.champion_name} · {p.position}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="w-[82px]">
                            <div className="grid w-[64px] grid-cols-3 gap-[2px]">
                              {(p.items ?? []).slice(0, 6).map((itemId, idx) => (
                                <img
                                  key={`${itemId}-${idx}`}
                                  src={itemIconUrl(itemId, ddVersion)}
                                  alt={p.items_names?.[idx] ?? `Item ${itemId}`}
                                  title={p.items_names?.[idx]}
                                  className="h-5 w-5 rounded-[3px] border border-baron-border object-cover"
                                />
                              ))}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-bold text-baron-ink tnum">
                              {k} / <span className="text-baron-defeat">{d}</span> / {a}
                            </div>
                            <div className="text-[11px] text-baron-ink-muted tnum">
                              {d > 0 ? `${((k + a) / d).toFixed(2)} KDA` : "Perfect KDA"}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-baron-ink tnum">
                              {(pcs / mins).toFixed(1)}
                            </div>
                            <div className="text-[11px] text-baron-ink-muted tnum">{pcs} CS</div>
                          </TableCell>

                          <TableCell className="w-[155px]">
                            <div className="text-[11.5px] font-semibold text-baron-ink tnum">
                              {(pdmg / 1000).toFixed(1)}k dmg
                            </div>
                            <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-baron-border">
                              <div
                                className={`h-full rounded-full ${
                                  isBlue ? "bg-baron-victory" : "bg-baron-defeat"
                                }`}
                                style={{ width: `${dmgWidth}%` }}
                              />
                              <div
                                aria-hidden="true"
                                className="absolute inset-y-0 w-[1.5px] bg-baron-ink/80"
                                style={{ left: `${avgTickPct}%` }}
                              />
                            </div>
                          </TableCell>

                          <TableCell className="w-16 pr-5 text-right">
                            <div className="inline-flex justify-end">
                              <ScoreRing score={op} size="sm" label={`OP Score ${op}`} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </section>
            );
          })}
        </div>
      )}

      {tab === "objectives" && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {teams.map((tm) => (
            <div
              key={tm.key}
              className="rounded-xl border border-baron-border bg-baron-surface p-4"
            >
              <div className="text-[13px] font-bold text-baron-ink">
                {tm.key} Side — {tm.game_stat?.is_win ? "Victory" : "Defeat"}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-baron-ink-secondary tnum">
                <div>Towers: {tm.game_stat?.tower_kill ?? 0}</div>
                <div>Dragons: {tm.game_stat?.dragon_kill ?? 0}</div>
                <div>Barons: {tm.game_stat?.baron_kill ?? 0}</div>
                <div>Voidgrubs: {tm.game_stat?.horde_kill ?? 0}</div>
                <div>Heralds: {tm.game_stat?.rift_herald_kill ?? 0}</div>
                <div>Total Gold: {(tm.game_stat?.gold_earned ?? 0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
