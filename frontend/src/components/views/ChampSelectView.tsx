"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Download, Sparkles, Swords } from "lucide-react";
import { LaneIcon } from "@/components/icons/LolIcons";
import SpotlightCard from "@/components/SpotlightCard";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatefulButton } from "@/components/ui/stateful-button";
import { RuneMatrixPanel } from "@/components/views/RuneMatrixPanel";
import { useTheme } from "@/lib/theme";
import {
  champSplashUrl,
  champSquareUrl,
  fetchChampionIdNameMap,
  itemIconUrl,
  spellIdUrl,
} from "@/lib/ddragon";
import {
  asList,
  fetchOpggChampionAnalysis,
  fetchProviderTierList,
  importOpggRunesToLcu,
  type LcuPlayerContext,
  type OpggChampionAnalysis,
  type TierRole,
} from "@/lib/tauri";

const ROLES: { id: TierRole; label: string }[] = [
  { id: "Top", label: "Top" },
  { id: "Jungle", label: "Jungle" },
  { id: "Middle", label: "Mid" },
  { id: "Bottom", label: "Bot" },
  { id: "Utility", label: "Support" },
];

function mapLcuPosToRole(pos: string): TierRole {
  switch (pos.trim().toLowerCase()) {
    case "top":
      return "Top";
    case "jungle":
      return "Jungle";
    case "bottom":
    case "adc":
      return "Bottom";
    case "utility":
    case "support":
      return "Utility";
    default:
      return "Middle";
  }
}

export function ChampSelectView({
  ddVersion,
  lcuConnected = false,
  lcuPlayer = null,
}: {
  ddVersion: string;
  lcuConnected?: boolean;
  lcuPlayer?: LcuPlayerContext | null;
}) {
  const { resolved } = useTheme();
  const [championInput, setChampionInput] = useState("");
  const [manualSelection, setManualSelection] = useState<{
    champion: string;
    role: TierRole;
  } | null>(null);
  const [role, setRole] = useState<TierRole>("Middle");
  const [metaTopChampion, setMetaTopChampion] = useState<string | null>(null);
  const [champIdMap, setChampIdMap] = useState<Record<number, { id: string; name: string }>>({});
  const [importingRunes, setImportingRunes] = useState(false);
  const [runeStatus, setRuneStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [state, setState] = useState<{
    key: string;
    data: OpggChampionAnalysis | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchChampionIdNameMap(ddVersion).then((m) => {
      if (!cancelled) setChampIdMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, [ddVersion]);

  const lcuChampId = lcuPlayer?.champSelect?.championId ?? 0;
  const lcuPickedChamp = lcuChampId > 0 ? champIdMap[lcuChampId]?.name ?? null : null;
  const lcuPickedRole = lcuPlayer?.champSelect?.assignedPosition
    ? mapLcuPosToRole(lcuPlayer.champSelect.assignedPosition)
    : null;

  useEffect(() => {
    if (lcuPickedChamp || manualSelection) return;
    let cancelled = false;
    fetchProviderTierList("opgg", role)
      .then((rows) => {
        if (!cancelled && rows[0]?.champion_name) {
          setMetaTopChampion(rows[0].champion_name);
        }
      })
      .catch(() => {
        // Ignore tier preview errors cleanly; Champ Select prompt stays ready for manual lookup.
      });
    return () => {
      cancelled = true;
    };
  }, [lcuPickedChamp, manualSelection, role]);

  const activeChampion = manualSelection?.champion ?? lcuPickedChamp ?? metaTopChampion;
  const effectiveRole = manualSelection?.role ?? lcuPickedRole ?? role;
  const reqKey = activeChampion ? `${activeChampion}:${effectiveRole}` : "";
  const isLoading = Boolean(reqKey) && state.key !== reqKey;

  useEffect(() => {
    if (!activeChampion) return;
    let cancelled = false;
    fetchOpggChampionAnalysis(activeChampion, effectiveRole)
      .then((data) => {
        if (!cancelled) {
          setState({ key: reqKey, data, error: null });
          setRuneStatus(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            key: reqKey,
            data: null,
            error: err instanceof Error ? err.message : "Failed to load OP.GG draft analysis.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeChampion, effectiveRole, reqKey]);

  const analysis = state.key === reqKey && reqKey ? state.data : null;
  const error = state.key === reqKey && reqKey ? state.error : null;
  const topRune = asList(analysis?.data.runes)[0];
  const topCore = asList(analysis?.data.core_items)[0];
  const topStarters = asList(analysis?.data.starter_items)[0];
  const topBoots = asList(analysis?.data.boots)[0];
  const topSpells = asList(analysis?.data.summoner_spells)[0];
  const weakCounters = asList(analysis?.data.weak_counters);

  const handleImportRunes = async (): Promise<boolean> => {
    if (!activeChampion || !topRune || importingRunes) return false;
    const all9 = [
      ...(topRune.primary_rune_ids ?? []).slice(0, 4),
      ...(topRune.secondary_rune_ids ?? []).slice(0, 2),
      ...(topRune.stat_mod_ids ?? []).slice(0, 3),
    ];
    if (all9.length < 9 || topRune.primary_page_id <= 0 || topRune.secondary_page_id <= 0) {
      setRuneStatus({
        ok: false,
        text: "Incomplete OP.GG rune set returned for this champion.",
      });
      return false;
    }
    setImportingRunes(true);
    setRuneStatus(null);
    try {
      const res = await importOpggRunesToLcu(
        activeChampion,
        topRune.primary_page_id,
        topRune.secondary_page_id,
        all9.slice(0, 9),
      );
      setRuneStatus({ ok: true, text: res.message });
      return true;
    } catch (err: unknown) {
      setRuneStatus({
        ok: false,
        text:
          err instanceof Error
            ? err.message
            : "League Client is offline. Start League of Legends to import OP.GG runes.",
      });
      return false;
    } finally {
      setImportingRunes(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Header (@react-bits/SpotlightCard + subtle @magicui/border-beam) */}
      <SpotlightCard
        theme={resolved}
        intensity={0.075}
        borderGlow={0.45}
        style={{ borderRadius: 0 }}
        className="relative overflow-hidden rounded-none border-x-0 border-t-0 border-b border-baron-border bg-baron-surface px-5 py-4"
      >
        {activeChampion && (
          <BorderBeam
            size={140}
            duration={12}
            colorFrom="#d46233"
            colorTo="#eab349"
            borderWidth={1}
            className="opacity-45"
          />
        )}
        {activeChampion && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-cover bg-center opacity-[0.18]"
            style={{
              backgroundImage: `url('${champSplashUrl(activeChampion, 0)}')`,
              maskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
            }}
          />
        )}

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {activeChampion ? (
              <img
                src={champSquareUrl(activeChampion, ddVersion)}
                alt={activeChampion}
                className="h-12 w-12 rounded-xl border-2 border-baron-accent object-cover shadow-md"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-baron-border bg-baron-elevated">
                <Sparkles className="h-5 w-5 text-baron-accent-soft" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
                  {activeChampion ?? "Draft Companion"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md border border-baron-accent/30 bg-baron-accent/12 px-2 py-0.5 text-[10.5px] font-bold text-baron-accent-soft">
                  <Sparkles className="h-3 w-3" />
                  Champ Select
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                    lcuPickedChamp
                      ? "bg-baron-emerald/15 text-baron-emerald"
                      : lcuConnected
                        ? "bg-baron-accent/15 text-baron-accent-soft"
                        : "bg-baron-elevated text-baron-ink-secondary"
                  }`}
                >
                  {lcuPickedChamp
                    ? "Auto-Detected from LCU Lobby"
                    : lcuConnected
                      ? "LCU Connected (Waiting for Draft Pick)"
                      : "LCU Offline (Manual OP.GG Prep)"}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-baron-ink-muted">
                Live runes, builds, and counters fetched directly from OP.GG MCP. Ranked lobby
                anonymity is always respected.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <StatefulButton
              disabled={!topRune || importingRunes || !activeChampion}
              onClick={handleImportRunes}
              className="h-8 px-3.5 text-[12px] font-semibold"
            >
              {runeStatus?.ok ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {runeStatus.text}
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  {importingRunes
                    ? "Importing OP.GG Runes..."
                    : activeChampion
                      ? `Import Runes (Baron: ${activeChampion})`
                      : "Load Champion First"}
                </>
              )}
            </StatefulButton>
            {runeStatus && !runeStatus.ok && (
              <span className="max-w-xs text-right text-[10.5px] font-medium text-baron-gold">
                {runeStatus.text}
              </span>
            )}
          </div>
        </div>

        {/* Champion & Role Picker (@shadcn Input & Select) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (championInput.trim()) {
              setManualSelection({ champion: championInput.trim(), role });
            }
          }}
          className="relative z-10 mt-3.5 flex flex-wrap items-center gap-2"
        >
          <Input
            type="text"
            value={championInput}
            onChange={(e) => setChampionInput(e.target.value)}
            placeholder="Champion name..."
            aria-label="Draft champion name"
            className="h-8 w-44 border-baron-border bg-baron-inset px-3 text-[12px] text-baron-ink"
          />
          <Select
            value={effectiveRole}
            onValueChange={(val) => {
              const nextRole = val as TierRole;
              setRole(nextRole);
              if (manualSelection) {
                setManualSelection({ champion: manualSelection.champion, role: nextRole });
              }
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Select draft lane"
              className="h-8 min-w-[106px] border-baron-border bg-baron-inset text-[12px] font-semibold text-baron-ink"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="baron-popover-surface border-baron-border-strong bg-baron-surface"
            >
              {ROLES.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-[12px]">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-8 border-baron-border bg-baron-elevated px-3 text-[12px] hover:border-baron-border-strong"
          >
            Load OP.GG Prep
          </Button>
          {manualSelection && lcuPickedChamp && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setManualSelection(null)}
              className="h-8 px-2.5 text-[11.5px] text-baron-accent-soft"
            >
              Sync to LCU Pick ({lcuPickedChamp})
            </Button>
          )}
        </form>
      </SpotlightCard>

      {!activeChampion && !error && (
        <div className="m-5 rounded-xl border border-baron-border bg-baron-surface p-6 text-[13px] text-baron-ink-secondary">
          Enter any champion above or enter League Client Champion Select to load live OP.GG MCP
          runes and build paths.
        </div>
      )}

      {isLoading && (
        <div role="status" className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl bg-baron-surface" />
          <Skeleton className="h-48 w-full rounded-xl bg-baron-surface" />
        </div>
      )}

      {!isLoading && error && (
        <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5">
          <div className="flex items-start gap-2.5 text-[13px] text-baron-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
            <div>
              <div className="font-bold">Live Champ Select Prep Unavailable</div>
              <p className="mt-1 text-[12px] text-baron-ink-secondary">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && analysis && (
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
          {/* Core Loadout & Runes */}
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12.5px] font-bold text-baron-ink">
                <LaneIcon role={effectiveRole} className="h-3.5 w-3.5" />
                <span>Recommended Runes &amp; Loadout ({effectiveRole})</span>
              </div>
              {topSpells && (
                <div className="flex items-center gap-1.5">
                  {topSpells.ids.map((id) => (
                    <img
                      key={id}
                      src={spellIdUrl(id, ddVersion)}
                      alt={`Spell ${id}`}
                      className="h-6 w-6 rounded border border-baron-border object-cover"
                    />
                  ))}
                </div>
              )}
            </div>

            {asList(analysis?.data.runes).length > 0 && activeChampion && (
              <div className="mt-3">
                <RuneMatrixPanel
                  championName={activeChampion}
                  ddVersion={ddVersion}
                  runePages={asList(analysis?.data.runes).map((r, idx) => ({
                    id: idx + 1,
                    primary_page_id: r.primary_page_id,
                    primary_rune_ids: r.primary_rune_ids ?? [],
                    secondary_page_id: r.secondary_page_id,
                    secondary_rune_ids: r.secondary_rune_ids ?? [],
                    stat_mod_ids: r.stat_mod_ids ?? [],
                    play: r.play ?? 0,
                    win: r.win ?? 0,
                    pick_rate: r.pick_rate ?? 0,
                  }))}
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-baron-border pt-3">
              {topStarters && (
                <div>
                  <div className="mb-1 text-[10px] font-bold text-baron-ink-muted uppercase">
                    Starters
                  </div>
                  <div className="flex gap-1">
                    {topStarters.ids.map((id, i) => (
                      <img
                        key={`${id}-${i}`}
                        src={itemIconUrl(id, ddVersion)}
                        alt="Starter"
                        className="h-7 w-7 rounded border border-baron-border"
                      />
                    ))}
                  </div>
                </div>
              )}
              {topBoots && topBoots.ids[0] && (
                <div>
                  <div className="mb-1 text-[10px] font-bold text-baron-ink-muted uppercase">
                    Boots
                  </div>
                  <img
                    src={itemIconUrl(topBoots.ids[0], ddVersion)}
                    alt="Boots"
                    className="h-7 w-7 rounded border border-baron-border"
                  />
                </div>
              )}
              {topCore && (
                <div>
                  <div className="mb-1 text-[10px] font-bold text-baron-ink-muted uppercase">
                    Core Path
                  </div>
                  <div className="flex gap-1.5">
                    {topCore.ids.map((id, i) => (
                      <img
                        key={`${id}-${i}`}
                        src={itemIconUrl(id, ddVersion)}
                        alt={topCore.ids_names?.[i] ?? "Item"}
                        className="h-7 w-7 rounded border border-baron-border-strong"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Matchups */}
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-baron-ink">
              <Swords className="h-3.5 w-3.5 text-baron-defeat" />
              <span>Counter Watch</span>
            </div>
            <div className="mt-3 space-y-2">
              {weakCounters.slice(0, 5).map((c) => {
                const wr = c.my_win_rate ?? (c.play ? c.win / c.play : 0.5);
                return (
                  <div
                    key={c.champion_name}
                    className="flex items-center justify-between rounded-lg border border-baron-border bg-baron-inset px-3 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={champSquareUrl(c.champion_name, ddVersion)}
                        alt={c.champion_name}
                        className="h-6 w-6 rounded object-cover"
                      />
                      <span className="text-[12px] font-semibold text-baron-ink">
                        {c.champion_name}
                      </span>
                    </div>
                    <span className="text-[11.5px] font-bold text-baron-defeat tnum">
                      {(wr * 100).toFixed(1)}% WR
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
