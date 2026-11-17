"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";
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
import {
  champSplashUrl,
  champSquareUrl,
  fetchRuneMetadataMap,
  itemIconUrl,
  LATEST_DDRAGON,
  RUNE_STYLE_ICON_FALLBACK,
  runeIconUrl,
  spellIdName,
  spellIdUrl,
  statShardLabel,
} from "@/lib/ddragon";
import {
  asList,
  fetchOpggChampionAnalysis,
  fetchProviderTierList,
  importOpggRunesToLcu,
  isProviderAvailable,
  type OpggChampionAnalysis,
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
  if (t === "OP" || t === "S+" || t === "0" || t === "1") return "text-baron-gold";
  if (t === "2" || t === "S") return "text-baron-ace";
  if (t === "3" || t === "A") return "text-baron-cyan";
  return "text-baron-ink-secondary";
}

function formatTierLabel(tier: string | number | undefined): string {
  if (tier === undefined || tier === null) return "-";
  const t = String(tier).trim();
  if (t === "0") return "OP";
  return `T${t}`;
}

function calcWinRate(win: number, play: number): string {
  if (!play || play <= 0) return "-";
  return `${((win / play) * 100).toFixed(2)}%`;
}

function calcPct(rate: number | undefined): string {
  if (rate === undefined || rate === null) return "-";
  return `${(rate * 100).toFixed(2)}%`;
}

function skillLetterColor(letter: string): string {
  switch (letter.toUpperCase()) {
    case "Q":
      return "border-baron-victory/50 bg-baron-victory/20 text-baron-victory";
    case "W":
      return "border-baron-emerald/50 bg-baron-emerald/20 text-baron-emerald";
    case "E":
      return "border-baron-gold/50 bg-baron-gold/20 text-baron-gold";
    case "R":
      return "border-baron-ace/50 bg-baron-ace/20 text-baron-ace";
    default:
      return "border-baron-border bg-baron-elevated text-baron-ink-secondary";
  }
}

function ChampionBuildView({
  champion,
  role,
  ddVersion,
  onChangeRole,
  onSelectChampion,
  onBack,
}: {
  champion: string;
  role: TierRole;
  ddVersion: string;
  onChangeRole: (role: TierRole) => void;
  onSelectChampion: (champ: string, role: TierRole) => void;
  onBack: () => void;
}) {
  const [buildState, setBuildState] = useState<{
    key: string;
    data: OpggChampionAnalysis | null;
    error: string | null;
  }>({ key: "", data: null, error: null });
  const [runeMeta, setRuneMeta] = useState<Record<number, { name: string; icon: string }>>({});
  const [runeIdx, setRuneIdx] = useState(0);
  const [importingRunes, setImportingRunes] = useState(false);
  const [runeStatus, setRuneStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const reqKey = `${champion}:${role}`;
  const loading = buildState.key !== reqKey;

  useEffect(() => {
    let cancelled = false;
    fetchRuneMetadataMap(ddVersion).then((map) => {
      if (!cancelled) setRuneMeta(map);
    });
    return () => {
      cancelled = true;
    };
  }, [ddVersion]);

  useEffect(() => {
    let cancelled = false;
    fetchOpggChampionAnalysis(champion, role)
      .then((data) => {
        if (!cancelled) {
          setBuildState({ key: reqKey, data, error: null });
          setRuneIdx(0);
          setRuneStatus(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBuildState({
            key: reqKey,
            data: null,
            error: err instanceof Error ? err.message : "Failed to load OP.GG champion build.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [champion, role, reqKey]);

  const analysis = buildState.key === reqKey ? buildState.data : null;
  const error = buildState.key === reqKey ? buildState.error : null;

  const avg = analysis?.data.summary?.average_stats;
  const runePages = asList(analysis?.data.runes);
  const activeRune = runePages[runeIdx] ?? runePages[0];
  const starters = asList(analysis?.data.starter_items);
  const boots = asList(analysis?.data.boots);
  const cores = asList(analysis?.data.core_items);
  const fourths = asList(analysis?.data.fourth_items);
  const fifths = asList(analysis?.data.fifth_items);
  const sixths = asList(analysis?.data.sixth_items);
  const spells = asList(analysis?.data.summoner_spells);
  const masteries = asList(analysis?.data.skill_masteries);
  const mastery = masteries[0];
  const skillsArr = asList(analysis?.data.skills);
  const skillOrder15 = skillsArr[0]?.order ?? mastery?.builds?.[0]?.order ?? [];
  const strongCounters = asList(analysis?.data.strong_counters);
  const weakCounters = asList(analysis?.data.weak_counters);

  const handleImportRunes = async () => {
    if (!activeRune || importingRunes) return;
    const all9 = [
      ...(activeRune.primary_rune_ids ?? []).slice(0, 4),
      ...(activeRune.secondary_rune_ids ?? []).slice(0, 2),
      ...(activeRune.stat_mod_ids ?? []).slice(0, 3),
    ];
    if (all9.length < 9 || activeRune.primary_page_id <= 0 || activeRune.secondary_page_id <= 0) {
      setRuneStatus({
        ok: false,
        text: "Incomplete OP.GG rune data; cannot import empty rune page.",
      });
      return;
    }
    setImportingRunes(true);
    setRuneStatus(null);
    try {
      const res = await importOpggRunesToLcu(
        champion,
        activeRune.primary_page_id,
        activeRune.secondary_page_id,
        all9.slice(0, 9),
      );
      setRuneStatus({ ok: true, text: res.message });
    } catch (err: unknown) {
      setRuneStatus({
        ok: false,
        text:
          err instanceof Error
            ? err.message
            : "League Client is offline. Open League to import runes.",
      });
    } finally {
      setImportingRunes(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Top Back + Lane Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold text-baron-ink-secondary transition-colors hover:bg-baron-hover hover:text-baron-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to {role} Tier List</span>
        </button>

        <AnimatedTabs
          layoutId="opgg-build-role-tabs"
          ariaLabel="Switch champion build lane"
          value={role}
          onChange={onChangeRole}
          items={TIER_ROLES.map((r) => ({
            id: r.id,
            label: r.label,
            icon: <LaneIcon role={r.short} className="h-3.5 w-3.5" />,
          }))}
        />
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-baron-border bg-baron-surface px-5 py-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[44%] bg-cover bg-center opacity-[0.2]"
          style={{
            backgroundImage: `url('${champSplashUrl(champion, 0)}')`,
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.88) 20%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.88) 20%, transparent 95%)",
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={champSquareUrl(champion, ddVersion)}
              alt={champion}
              className="h-14 w-14 rounded-xl border-2 border-baron-border-strong object-cover shadow-md"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-baron-ink">
                  {champion}
                </h1>
                <span className="inline-flex items-center gap-1 rounded bg-baron-elevated px-2 py-0.5 text-[11px] font-bold text-baron-ink-secondary">
                  <LaneIcon role={role} className="h-3 w-3" />
                  {role}
                </span>
                {analysis?.data.damage_type && (
                  <span className="rounded bg-baron-accent/15 px-2 py-0.5 text-[10.5px] font-bold text-baron-accent-soft">
                    {analysis.data.damage_type}
                  </span>
                )}
                {avg?.tier !== undefined && (
                  <span
                    className={`rounded bg-baron-elevated px-2 py-0.5 text-[11px] font-black ${tierColorClass(
                      String(avg.tier),
                    )}`}
                  >
                    {formatTierLabel(avg.tier)}
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[12px] text-baron-ink-secondary tnum">
                <span>
                  Win <strong className="text-baron-emerald">{calcPct(avg?.win_rate)}</strong>
                </span>
                <span>
                  Pick <strong className="text-baron-ink">{calcPct(avg?.pick_rate)}</strong>
                </span>
                <span>
                  Ban <strong className="text-baron-ink">{calcPct(avg?.ban_rate)}</strong>
                </span>
                {avg?.kda !== undefined && (
                  <span>
                    KDA <strong className="text-baron-ink">{avg.kda.toFixed(2)}</strong>
                  </span>
                )}
                {avg?.play !== undefined && (
                  <span>
                    Games <strong className="text-baron-ink">{avg.play.toLocaleString()}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {activeRune && (
            <div className="flex flex-col items-end gap-1.5">
              <Button
                type="button"
                size="sm"
                onClick={handleImportRunes}
                disabled={importingRunes}
                className="h-8 bg-baron-accent px-3 text-[12px] font-semibold text-white hover:opacity-90"
              >
                {runeStatus?.ok ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    {runeStatus.text}
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {importingRunes
                      ? "Importing to Client..."
                      : `Import Runes (Baron: ${champion})`}
                  </>
                )}
              </Button>
              {runeStatus && !runeStatus.ok ? (
                <span className="max-w-xs text-right text-[10.5px] font-medium text-baron-gold">
                  {runeStatus.text}
                </span>
              ) : (
                <span className="text-[10.5px] text-baron-ink-muted">Live via OP.GG MCP</span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div role="status" className="space-y-4 p-5">
          <div className="text-[12px] text-baron-ink-muted">
            Fetching live {champion} ({role}) build from OP.GG MCP...
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-52 w-full rounded-xl bg-baron-surface" />
            <Skeleton className="h-52 w-full rounded-xl bg-baron-surface" />
          </div>
          <Skeleton className="h-36 w-full rounded-xl bg-baron-surface" />
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5">
          <div className="flex items-start gap-2.5 text-[13px] text-baron-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
            <div>
              <div className="font-bold">Could not load {champion} build</div>
              <p className="mt-1 text-[12px] text-baron-ink-muted">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && analysis && (
        <div className="space-y-4 p-5">
          {/* Top Grid: Runes + Summoner Spells / Skills */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* OP.GG Runes & Shards Card */}
            <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[12px] font-bold tracking-[0.04em] text-baron-ink uppercase">
                  Recommended Runes
                </div>
                {runePages.length > 1 && (
                  <div className="flex items-center gap-1">
                    {runePages.slice(0, 2).map((rp, i) => (
                      <button
                        key={rp.id ?? i}
                        type="button"
                        onClick={() => setRuneIdx(i)}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold tnum ${
                          runeIdx === i
                            ? "bg-baron-accent text-white"
                            : "bg-baron-elevated text-baron-ink-secondary hover:text-baron-ink"
                        }`}
                      >
                        Page {i + 1} · {calcPct(rp.pick_rate)} PR · {calcWinRate(rp.win, rp.play)} WR
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activeRune ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Primary Tree */}
                  <div className="rounded-lg border border-baron-border bg-baron-inset p-3">
                    <div className="mb-2.5 flex items-center gap-2">
                      <img
                        src={runeIconUrl(
                          runeMeta[activeRune.primary_page_id]?.icon ??
                            RUNE_STYLE_ICON_FALLBACK[activeRune.primary_page_id] ??
                            RUNE_STYLE_ICON_FALLBACK[8000],
                        )}
                        alt={activeRune.primary_page_name}
                        className="h-6 w-6 rounded-full border border-baron-gold/50 bg-baron-surface p-0.5"
                      />
                      <span className="text-[12px] font-bold text-baron-ink">
                        {activeRune.primary_page_name}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(activeRune.primary_rune_ids ?? []).map((id, i) => {
                        const info = runeMeta[id];
                        const name = activeRune.primary_rune_names?.[i] ?? info?.name ?? `#${id}`;
                        return (
                          <div key={`${id}-${i}`} className="flex items-center gap-2.5">
                            {info?.icon ? (
                              <img
                                src={runeIconUrl(info.icon)}
                                alt={name}
                                className={`${
                                  i === 0 ? "h-8 w-8 border-baron-gold/70" : "h-6 w-6 border-baron-border-strong"
                                } rounded-full border bg-baron-surface object-cover`}
                              />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-baron-border bg-baron-surface text-[9px] text-baron-ink-muted">
                                {i + 1}
                              </span>
                            )}
                            <span
                              className={`text-[12px] ${
                                i === 0 ? "font-bold text-baron-ink" : "font-medium text-baron-ink-secondary"
                              }`}
                            >
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Secondary Tree + Stat Shards */}
                  <div className="flex flex-col justify-between gap-3 rounded-lg border border-baron-border bg-baron-inset p-3">
                    <div>
                      <div className="mb-2.5 flex items-center gap-2">
                        <img
                          src={runeIconUrl(
                            runeMeta[activeRune.secondary_page_id]?.icon ??
                              RUNE_STYLE_ICON_FALLBACK[activeRune.secondary_page_id] ??
                              RUNE_STYLE_ICON_FALLBACK[8200],
                          )}
                          alt={activeRune.secondary_page_name}
                          className="h-6 w-6 rounded-full border border-baron-border-strong bg-baron-surface p-0.5"
                        />
                        <span className="text-[12px] font-bold text-baron-ink">
                          {activeRune.secondary_page_name}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(activeRune.secondary_rune_ids ?? []).map((id, i) => {
                          const info = runeMeta[id];
                          const name = activeRune.secondary_rune_names?.[i] ?? info?.name ?? `#${id}`;
                          return (
                            <div key={`${id}-${i}`} className="flex items-center gap-2.5">
                              {info?.icon && (
                                <img
                                  src={runeIconUrl(info.icon)}
                                  alt={name}
                                  className="h-6 w-6 rounded-full border border-baron-border-strong bg-baron-surface object-cover"
                                />
                              )}
                              <span className="text-[12px] font-medium text-baron-ink-secondary">
                                {name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-baron-border pt-2.5">
                      <div className="mb-1.5 text-[10px] font-bold tracking-wider text-baron-ink-muted uppercase">
                        Stat Shards
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeRune.stat_mod_ids ?? []).map((sid, idx) => (
                          <span
                            key={`${sid}-${idx}`}
                            className="rounded border border-baron-border bg-baron-surface px-2 py-0.5 text-[11px] font-semibold text-baron-ink-secondary"
                          >
                            {statShardLabel(sid)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-baron-ink-muted">No rune data returned.</div>
              )}
            </section>

            {/* Summoner Spells + Skill Order */}
            <section className="flex flex-col gap-4 rounded-xl border border-baron-border bg-baron-surface p-4">
              {/* Summoner Spells */}
              <div>
                <div className="mb-2.5 text-[12px] font-bold tracking-[0.04em] text-baron-ink uppercase">
                  Summoner Spells
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {spells.slice(0, 2).map((sp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5">
                        {sp.ids.map((id) => (
                          <img
                            key={id}
                            src={spellIdUrl(id, ddVersion)}
                            alt={spellIdName(id)}
                            title={spellIdName(id)}
                            className="h-7 w-7 rounded border border-baron-border-strong object-cover"
                          />
                        ))}
                      </div>
                      <div className="text-right text-[11px] tnum">
                        <div className="font-bold text-baron-emerald">
                          {calcWinRate(sp.win, sp.play)}
                        </div>
                        <div className="text-baron-ink-muted">{calcPct(sp.pick_rate)} PR</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill Max Priority & Level 1-15 */}
              <div className="border-t border-baron-border pt-3.5">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-bold tracking-[0.04em] text-baron-ink uppercase">
                    Skill Priority &amp; Order
                  </span>
                  {mastery && (
                    <div className="flex items-center gap-1.5">
                      {mastery.ids.map((letter, idx) => (
                        <div key={`${letter}-${idx}`} className="flex items-center gap-1.5">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded border text-[11.5px] font-extrabold ${skillLetterColor(
                              letter,
                            )}`}
                          >
                            {letter}
                          </span>
                          {idx < mastery.ids.length - 1 && (
                            <ChevronRight className="h-3 w-3 text-baron-ink-muted" />
                          )}
                        </div>
                      ))}
                      <span className="ml-2 text-[11px] font-semibold text-baron-emerald tnum">
                        {calcWinRate(mastery.win, mastery.play)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
                  {skillOrder15.slice(0, 15).map((letter, lvlIdx) => (
                    <div key={lvlIdx} className="text-center">
                      <div className="mb-1 text-[9.5px] font-semibold text-baron-ink-muted tnum">
                        {lvlIdx + 1}
                      </div>
                      <div
                        className={`flex h-7 items-center justify-center rounded border text-[11px] font-extrabold ${skillLetterColor(
                          letter,
                        )}`}
                      >
                        {letter}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Items Build Progression (Starter -> Boots -> Core -> 4th/5th/6th) */}
          <section className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="mb-3 text-[12px] font-bold tracking-[0.04em] text-baron-ink uppercase">
              Recommended Item Builds
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
              {/* Starter Items */}
              <div className="rounded-lg border border-baron-border bg-baron-inset p-3">
                <div className="mb-2 text-[10.5px] font-bold tracking-wider text-baron-ink-muted uppercase">
                  Starter Items
                </div>
                <div className="space-y-2">
                  {starters.slice(0, 2).map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {opt.ids.map((itemId, i) => (
                          <img
                            key={`${itemId}-${i}`}
                            src={itemIconUrl(itemId, ddVersion)}
                            alt={opt.ids_names?.[i] ?? `Item ${itemId}`}
                            title={opt.ids_names?.[i]}
                            className="h-7 w-7 rounded border border-baron-border object-cover"
                          />
                        ))}
                      </div>
                      <div className="text-right text-[11px] tnum">
                        <span className="font-bold text-baron-emerald">
                          {calcWinRate(opt.win, opt.play)}
                        </span>{" "}
                        <span className="text-baron-ink-muted">({calcPct(opt.pick_rate)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boots */}
              <div className="rounded-lg border border-baron-border bg-baron-inset p-3">
                <div className="mb-2 text-[10.5px] font-bold tracking-wider text-baron-ink-muted uppercase">
                  Boots
                </div>
                <div className="space-y-2">
                  {boots.slice(0, 2).map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {opt.ids[0] && (
                          <img
                            src={itemIconUrl(opt.ids[0], ddVersion)}
                            alt={opt.ids_names?.[0] ?? "Boots"}
                            className="h-7 w-7 rounded border border-baron-border object-cover"
                          />
                        )}
                        <span className="truncate text-[11.5px] font-medium text-baron-ink">
                          {opt.ids_names?.[0] ?? "Boots"}
                        </span>
                      </div>
                      <div className="text-right text-[11px] tnum">
                        <span className="font-bold text-baron-emerald">
                          {calcWinRate(opt.win, opt.play)}
                        </span>{" "}
                        <span className="text-baron-ink-muted">({calcPct(opt.pick_rate)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Core 3-Item Builds */}
              <div className="rounded-lg border border-baron-border bg-baron-inset p-3">
                <div className="mb-2 text-[10.5px] font-bold tracking-wider text-baron-ink-muted uppercase">
                  Core Builds
                </div>
                <div className="space-y-2">
                  {cores.slice(0, 2).map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {opt.ids.map((itemId, i) => (
                          <div key={`${itemId}-${i}`} className="flex items-center gap-1">
                            <img
                              src={itemIconUrl(itemId, ddVersion)}
                              alt={opt.ids_names?.[i] ?? `Item ${itemId}`}
                              title={opt.ids_names?.[i]}
                              className="h-8 w-8 rounded border border-baron-border-strong object-cover"
                            />
                            {i < opt.ids.length - 1 && (
                              <ChevronRight className="h-3 w-3 text-baron-ink-muted" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-right text-[11px] tnum">
                        <div className="font-bold text-baron-emerald">
                          {calcWinRate(opt.win, opt.play)} WR
                        </div>
                        <div className="text-baron-ink-muted">
                          {calcPct(opt.pick_rate)} · {opt.play.toLocaleString()}G
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4th / 5th / 6th Slot Options */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { label: "4th Item Options", items: fourths },
                { label: "5th Item Options", items: fifths },
                { label: "6th / Late Options", items: sixths },
              ].map((slot) => (
                <div
                  key={slot.label}
                  className="rounded-lg border border-baron-border bg-baron-inset p-3"
                >
                  <div className="mb-2 text-[10.5px] font-bold tracking-wider text-baron-ink-muted uppercase">
                    {slot.label}
                  </div>
                  <div className="space-y-1.5">
                    {slot.items.slice(0, 3).map((opt, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {opt.ids[0] && (
                            <img
                              src={itemIconUrl(opt.ids[0], ddVersion)}
                              alt={opt.ids_names?.[0] ?? "Item"}
                              className="h-6 w-6 shrink-0 rounded border border-baron-border object-cover"
                            />
                          )}
                          <span className="truncate text-[11.5px] text-baron-ink">
                            {opt.ids_names?.[0] ?? `#${opt.ids[0]}`}
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-baron-emerald tnum">
                          {calcWinRate(opt.win, opt.play)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Matchups: Weak Against vs Strong Against */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: "Hard Matchups (Weak Against)", rows: weakCounters, danger: true },
              { title: "Favorable Matchups (Strong Against)", rows: strongCounters, danger: false },
            ].map((group) => (
              <section
                key={group.title}
                className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface"
              >
                <div className="border-b border-baron-border px-4 py-2.5 text-[12px] font-bold text-baron-ink">
                  {group.title}
                </div>
                <div className="divide-y divide-baron-border">
                  {group.rows.slice(0, 5).map((c) => {
                    const wr = c.my_win_rate ?? (c.play ? c.win / c.play : 0.5);
                    return (
                      <button
                        key={c.champion_name}
                        type="button"
                        onClick={() => onSelectChampion(c.champion_name, role)}
                        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-baron-hover/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={champSquareUrl(c.champion_name, ddVersion)}
                            alt={c.champion_name}
                            className="h-7 w-7 rounded border border-baron-border object-cover"
                          />
                          <span className="text-[12.5px] font-semibold text-baron-ink">
                            {c.champion_name}
                          </span>
                        </div>
                        <div className="text-right text-[11.5px] tnum">
                          <span
                            className={`font-bold ${
                              group.danger ? "text-baron-defeat" : "text-baron-emerald"
                            }`}
                          >
                            {(wr * 100).toFixed(2)}% WR
                          </span>
                          <span className="ml-2 text-baron-ink-muted">
                            ({c.play.toLocaleString()}G)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TierListView({
  activeProviderId,
  activeProviderLabel,
  refreshNonce = 0,
  searchFilter = "",
  initialSelectedChampion = null,
}: {
  activeProviderId: string;
  activeProviderLabel: string;
  refreshNonce?: number;
  searchFilter?: string;
  initialSelectedChampion?: { champion: string; role: TierRole } | null;
}) {
  const [role, setRole] = useState<TierRole>(initialSelectedChampion?.role ?? "Middle");
  const [selectedChamp, setSelectedChamp] = useState<string | null>(
    initialSelectedChampion?.champion ?? null,
  );
  const [query, setQuery] = useState(searchFilter);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

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
    ? `${activeProviderLabel} has no verified integration. Select OP.GG to view live data.`
    : fetchState.key === requestKey
      ? fetchState.error
      : null;

  const liveEntries = fetchState.key === requestKey ? fetchState.entries : [];

  if (selectedChamp) {
    return (
      <ChampionBuildView
        champion={selectedChamp}
        role={role}
        ddVersion={LATEST_DDRAGON}
        onChangeRole={setRole}
        onSelectChampion={(nextChamp, nextRole) => {
          setSelectedChamp(nextChamp);
          setRole(nextRole);
        }}
        onBack={() => setSelectedChamp(null)}
      />
    );
  }

  const filtered = liveEntries.filter((row) =>
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
                Champion Tierlist &amp; Builds
              </h1>
              {effectiveError ? (
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
              Click any champion to inspect live builds, runes, skills, and counters from{" "}
              <a
                href="https://op.gg"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-baron-accent-soft hover:underline"
              >
                OP.GG
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              (All Regions · Emerald+ · Current Patch).
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRetryCount((n) => n + 1)}
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

      {/* Honest Error / Offline Notice (Zero mock fallback) */}
      {!isLoading && effectiveError && (
        <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold text-baron-ink">
                Live OP.GG Tier List Unavailable
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-baron-ink-secondary">
                {effectiveError}
              </p>
              {available && (
                <div className="mt-3.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setRetryCount((n) => n + 1)}
                    className="h-7 bg-baron-accent px-3 text-[11.5px] text-white hover:opacity-90"
                  >
                    Retry Live Request
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live OP.GG Tierlist Table (Clickable Rows -> Builds) */}
      {!isLoading && !effectiveError && (
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
                  onClick={() => setSelectedChamp(entry.champion_name)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedChamp(entry.champion_name);
                    }
                  }}
                  aria-label={`Open OP.GG build for ${entry.champion_name}`}
                  className="group cursor-pointer border-baron-border hover:bg-baron-surface/85"
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
                      <span className="font-semibold text-baron-ink group-hover:text-baron-accent-soft">
                        {entry.champion_name}
                      </span>
                      <span className="ml-1 text-[10.5px] font-medium text-baron-accent-soft opacity-0 transition-opacity group-hover:opacity-100">
                        Builds →
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-baron-ink-muted">
                    <span className="inline-flex justify-center">
                      <LaneIcon role={entry.role} className="h-3.5 w-3.5" />
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-center text-[13.5px] font-black tracking-tight ${tierColorClass(
                      entry.tier,
                    )}`}
                  >
                    {formatTierLabel(entry.tier)}
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
