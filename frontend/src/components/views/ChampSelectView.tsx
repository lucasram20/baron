"use client";

import { useState } from "react";
import { ArrowLeftRight, Download } from "lucide-react";
import { LaneIcon, ShardIcon } from "@/components/icons/LolIcons";
import { BorderBeam } from "@/components/ui/border-beam";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ASHE_BUILDS,
  BLUE_BANS,
  BLUE_DRAFT,
  DOMINATION_SECONDARY_ROWS,
  PRECISION_ROWS,
  PRO_BUILDS,
  RED_BANS,
  RED_DRAFT,
  RUNE_STYLES_PRIMARY,
  RUNE_STYLES_SECONDARY,
} from "@/data/mockDpm";
import { champLoadingUrl, champSquareUrl, itemIconUrl, runeIconUrl, spellIconUrl } from "@/lib/ddragon";
import { buildBaronRunePayload } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type { DraftSlot } from "@/types/baron";

interface ChampSelectViewProps {
  ddVersion: string;
}

const TIER_CLASS: Record<DraftSlot["tier"], string> = {
  "S+": "text-amber-400",
  S: "text-purple-400",
  A: "text-sky-400",
  B: "text-emerald-400",
  C: "text-orange-400",
};

const TIER_GRADIENT: Record<DraftSlot["tier"], string> = {
  "S+": "from-amber-500/35",
  S: "from-purple-500/35",
  A: "from-sky-500/30",
  B: "from-emerald-500/30",
  C: "from-orange-500/30",
};

function DraftPortraitCard({ slot }: { slot: DraftSlot }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="group relative h-[132px] w-[88px] overflow-hidden rounded-md border border-baron-border bg-baron-elevated">
        <img
          src={champLoadingUrl(slot.champion, 0)}
          alt={slot.champion}
          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t via-black/35 to-transparent",
            TIER_GRADIENT[slot.tier],
          )}
        />
        <div className="absolute inset-x-0 bottom-0 p-2 leading-tight">
          <div className={cn("text-xl font-black tracking-tight", TIER_CLASS[slot.tier])}>
            {slot.tier}
          </div>
          <div className="text-[10px] font-medium text-slate-300">Tier</div>
        </div>
      </div>
      <div className="flex items-center justify-between px-0.5 text-[11px]">
        <span className="flex items-center gap-1 text-baron-ink-muted">
          <LaneIcon role={slot.role} className="h-3 w-3" />
          <span>{slot.role}</span>
        </span>
        <span
          className={cn(
            "font-semibold",
            slot.deltaPositive === true
              ? "text-baron-victory"
              : slot.deltaPositive === false
                ? "text-baron-defeat"
                : "text-baron-ink-muted",
          )}
        >
          {slot.delta}
        </span>
      </div>
    </div>
  );
}

export function ChampSelectView({ ddVersion }: ChampSelectViewProps) {
  const [selectedBuildId, setSelectedBuildId] = useState<string>("crit");
  const [selectedRole, setSelectedRole] = useState<string>("Bot");
  const [autoRunes, setAutoRunes] = useState(true);
  const [autoItems, setAutoItems] = useState(true);
  const [injectStatus, setInjectStatus] = useState<string | null>(null);

  const activeBuild = ASHE_BUILDS.find((b) => b.id === selectedBuildId) ?? ASHE_BUILDS[0];
  const isLethality = selectedBuildId === "lethality";

  const handleImportRunes = async () => {
    const runeIds = isLethality
      ? [8021, 8009, 9105, 8014, 8143, 8135, 5008, 5008, 5001]
      : [8008, 8009, 9104, 8017, 8139, 8135, 5005, 5008, 5001];
    const payload = await buildBaronRunePayload("Ashe", 8000, 8100, runeIds);
    setInjectStatus(`Injected "${payload.name}" (${activeBuild.name}) to LCU`);
    setTimeout(() => setInjectStatus(null), 3200);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top Bans & Win Probability Split Bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-baron-border bg-baron-surface px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {BLUE_BANS.map((champ) => (
            <div key={champ} className="relative h-8 w-8 overflow-hidden rounded border border-baron-border">
              <img
                src={champSquareUrl(champ, ddVersion)}
                alt={champ}
                className="h-full w-full object-cover opacity-70 grayscale"
              />
              <span className="absolute inset-0 bg-black/25" />
            </div>
          ))}
        </div>

        <div className="flex max-w-xl flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-sm text-baron-victory">54%</span>
            <span className="text-[10px] font-semibold tracking-widest text-baron-ink-muted">
              WIN PROBABILITY
            </span>
            <span className="text-sm text-baron-defeat">46%</span>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-baron-defeat">
            <div className="h-full bg-baron-victory" style={{ width: "54%" }} />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {RED_BANS.map((champ) => (
            <div key={champ} className="relative h-8 w-8 overflow-hidden rounded border border-baron-border">
              <img
                src={champSquareUrl(champ, ddVersion)}
                alt={champ}
                className="h-full w-full object-cover opacity-70 grayscale"
              />
              <span className="absolute inset-0 bg-black/25" />
            </div>
          ))}
        </div>
      </div>

      {/* 5v5 Vertical Champion Splash Draft Strip + Center Team Comp Radar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-baron-border bg-baron-surface p-3">
        <div className="flex items-center gap-2">
          {BLUE_DRAFT.map((slot) => (
            <DraftPortraitCard key={`blue-${slot.champion}`} slot={slot} />
          ))}
        </div>

        {/* Team Composition 6-Axis Radar */}
        <div className="flex flex-col items-center justify-center px-2">
          <svg viewBox="0 0 180 160" className="h-[148px] w-[168px]">
            {[24, 42, 60].map((r) => (
              <polygon
                key={r}
                points={`90,${80 - r} ${90 + r * 0.866},${80 - r * 0.5} ${90 + r * 0.866},${80 + r * 0.5} 90,${80 + r} ${90 - r * 0.866},${80 + r * 0.5} ${90 - r * 0.866},${80 - r * 0.5}`}
                fill="none"
                className="stroke-baron-border-strong"
                strokeWidth="1"
              />
            ))}
            <polygon
              points="90,34 134,58 138,108 90,126 52,102 48,54"
              fill="rgba(59, 130, 246, 0.25)"
              stroke="#3B82F6"
              strokeWidth="1.75"
            />
            <polygon
              points="90,46 124,62 120,100 90,118 46,104 58,64"
              fill="rgba(244, 63, 94, 0.22)"
              stroke="#F43F5E"
              strokeWidth="1.75"
            />
            <text x="90" y="13" textAnchor="middle" className="fill-baron-ink-muted" fontSize="8" fontWeight="700">
              EARLY
            </text>
            <text x="150" y="54" textAnchor="start" className="fill-baron-ink-muted" fontSize="8" fontWeight="700">
              MID
            </text>
            <text x="150" y="112" textAnchor="start" className="fill-baron-ink-muted" fontSize="8" fontWeight="700">
              LATE
            </text>
            <text x="90" y="152" textAnchor="middle" className="fill-baron-ink-muted" fontSize="8" fontWeight="700">
              DAMAGE CRIT
            </text>
            <text x="30" y="112" textAnchor="end" className="fill-baron-ink-muted" fontSize="8" fontWeight="700">
              CROWD CTRL
            </text>
            <text x="30" y="54" textAnchor="end" className="fill-baron-ink-muted" fontSize="8" fontWeight="700">
              SYNERGY
            </text>
          </svg>
        </div>

        <div className="flex items-center gap-2">
          {RED_DRAFT.map((slot) => (
            <DraftPortraitCard key={`red-${slot.champion}`} slot={slot} />
          ))}
        </div>
      </div>

      {/* 3-Column Loadout Workbench */}
      <div className="grid grid-cols-[276px_1fr_268px] gap-3">
        {/* Column 1: Role Switcher, Builds, Pro Builds */}
        <div className="flex flex-col gap-3 rounded-xl border border-baron-border bg-baron-surface p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={champSquareUrl("Ashe", ddVersion)}
                alt="Ashe"
                className="h-8 w-8 rounded-md object-cover ring-1 ring-baron-accent/60"
              />
              <span className="text-xs font-bold text-baron-ink">Ashe</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-baron-border bg-baron-elevated p-0.5">
              {["Top", "Jg", "Mid", "Bot", "Sup"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold transition",
                    selectedRole === r
                      ? "bg-baron-accent text-white"
                      : "text-baron-ink-secondary hover:text-baron-ink",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] font-bold tracking-wider text-baron-ink-muted">BUILDS</div>
          <div className="flex flex-col gap-1.5">
            {ASHE_BUILDS.map((b) => {
              const active = b.id === selectedBuildId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBuildId(b.id)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-2.5 py-2 text-left transition",
                    active
                      ? "border-baron-accent/70 bg-baron-accent/12"
                      : "border-baron-border bg-baron-elevated hover:border-baron-border-strong",
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div
                      className={cn(
                        "truncate text-xs font-bold",
                        active ? "text-baron-accent-soft" : "text-baron-ink",
                      )}
                    >
                      {b.name}
                    </div>
                    <div className="text-[11px] text-baron-ink-muted">{b.games}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {b.coreItems.slice(1, 3).map((id) => (
                      <img
                        key={id}
                        src={itemIconUrl(id, ddVersion)}
                        alt={String(id)}
                        className="h-5 w-5 rounded border border-baron-border"
                      />
                    ))}
                    <span
                      className={cn(
                        "ml-1 rounded px-1.5 py-0.5 text-[11px] font-bold",
                        b.accent === "emerald"
                          ? "bg-baron-emerald/15 text-baron-emerald"
                          : b.accent === "rose"
                            ? "bg-baron-defeat/15 text-baron-defeat"
                            : "bg-baron-accent/15 text-baron-accent-soft",
                      )}
                    >
                      {b.winRate}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 text-[10px] font-bold tracking-wider text-baron-ink-muted">
            PRO BUILDS
          </div>
          <div className="flex flex-col divide-y divide-baron-border-muted">
            {PRO_BUILDS.map((pro) => (
              <div key={pro.player} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-baron-elevated text-[10px] font-bold text-baron-ink-secondary ring-1 ring-baron-border">
                    {pro.team}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-baron-ink">{pro.player}</div>
                    <div className="text-[10px] text-baron-ink-muted">{pro.when}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <img
                    src={runeIconUrl(pro.keystoneIcon)}
                    alt={pro.player}
                    className="h-5 w-5 rounded-full bg-baron-canvas p-0.5 ring-1 ring-baron-gold/40"
                  />
                  {pro.items.map((id) => (
                    <img
                      key={id}
                      src={itemIconUrl(id, ddVersion)}
                      alt={String(id)}
                      className="h-5 w-5 rounded border border-baron-border"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Visual Primary + Secondary Rune Tree + Skill Max Order */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-baron-border bg-baron-surface p-4">
          {autoRunes && (
            <BorderBeam
              size={140}
              duration={12}
              colorFrom="#6366F1"
              colorTo="#38BDF8"
              borderWidth={1}
            />
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-baron-ink">Runes</span>
              <HoverBorderGradient onClick={handleImportRunes}>
                <Download className="h-3 w-3" />
                <span>Import</span>
              </HoverBorderGradient>
              {injectStatus && (
                <span className="rounded bg-baron-emerald/15 px-2 py-0.5 text-[11px] font-semibold text-baron-emerald">
                  {injectStatus}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-baron-ink-secondary">
              <span>Auto-Runes</span>
              <Switch checked={autoRunes} onCheckedChange={setAutoRunes} />
            </div>
          </div>

          <div className="my-4 flex items-start justify-center gap-14">
            {/* Primary Tree: Precision */}
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-2.5">
                {RUNE_STYLES_PRIMARY.map((style) => (
                  <Tooltip key={style.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border p-1",
                          style.active
                            ? "border-baron-gold/80 bg-baron-gold/15"
                            : "border-baron-border bg-baron-elevated opacity-35 grayscale",
                        )}
                      >
                        <img src={runeIconUrl(style.icon)} alt={style.name} className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{style.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {PRECISION_ROWS.map((row, rowIdx) => (
                <div key={`p-${rowIdx}`} className="flex items-center gap-4">
                  {row.map((rune) => {
                    const isActive = isLethality
                      ? [8021, 8009, 9105, 8014].includes(rune.id)
                      : rune.active;
                    return (
                      <Tooltip key={rune.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center justify-center rounded-full border transition",
                              rowIdx === 0 ? "h-12 w-12" : "h-9 w-9",
                              isActive
                                ? "border-baron-gold bg-baron-gold/15"
                                : "border-baron-border bg-baron-elevated opacity-30 grayscale",
                            )}
                          >
                            <img
                              src={runeIconUrl(rune.icon)}
                              alt={rune.name}
                              className={cn(
                                "rounded-full object-contain",
                                rowIdx === 0 ? "h-9 w-9" : "h-7 w-7",
                              )}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{rune.name}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Secondary Tree: Domination + Stat Shards */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2.5">
                {RUNE_STYLES_SECONDARY.map((style) => (
                  <Tooltip key={style.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border p-1",
                          style.active
                            ? "border-baron-defeat/80 bg-baron-defeat/15"
                            : "border-baron-border bg-baron-elevated opacity-35 grayscale",
                        )}
                      >
                        <img src={runeIconUrl(style.icon)} alt={style.name} className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{style.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {DOMINATION_SECONDARY_ROWS.map((row, rowIdx) => (
                <div key={`s-${rowIdx}`} className="flex items-center gap-4">
                  {row.map((rune) => {
                    const isActive = isLethality
                      ? [8143, 8135].includes(rune.id)
                      : rune.active;
                    return (
                      <Tooltip key={rune.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full border transition",
                              isActive
                                ? "border-baron-defeat bg-baron-defeat/15"
                                : "border-baron-border bg-baron-elevated opacity-30 grayscale",
                            )}
                          >
                            <img src={runeIconUrl(rune.icon)} alt={rune.name} className="h-7 w-7" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{rune.name}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Stat Shards with Authored ShardIcon SVGs */}
              <div className="mt-2 flex flex-col gap-2.5">
                {[
                  [
                    { label: "Adaptive", active: isLethality, tone: "border-baron-ace text-baron-ace" },
                    { label: "Attack Speed", active: !isLethality, tone: "border-baron-gold text-baron-gold" },
                    { label: "Ability Haste", active: false, tone: "border-baron-cyan text-baron-cyan" },
                  ],
                  [
                    { label: "Adaptive", active: true, tone: "border-baron-ace text-baron-ace" },
                    { label: "Move Speed", active: false, tone: "border-baron-cyan text-baron-cyan" },
                    { label: "Health Scaling", active: false, tone: "border-baron-emerald text-baron-emerald" },
                  ],
                  [
                    { label: "Health", active: true, tone: "border-baron-emerald text-baron-emerald" },
                    { label: "Tenacity", active: false, tone: "border-baron-accent text-baron-accent" },
                    { label: "Health Scaling", active: false, tone: "border-baron-emerald text-baron-emerald" },
                  ],
                ].map((shardRow, rIdx) => (
                  <div key={`sh-${rIdx}`} className="flex items-center gap-4">
                    {shardRow.map((s) => (
                      <Tooltip key={`${s.label}-${rIdx}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full border",
                              s.active
                                ? `${s.tone} bg-baron-hover`
                                : "border-baron-border bg-baron-elevated text-baron-ink-muted opacity-40",
                            )}
                          >
                            <ShardIcon kind={s.label} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{s.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Skill Max Order Strip */}
          <div className="border-t border-baron-border pt-3">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="font-bold text-baron-ink">Skill max order</span>
              <span className="text-baron-ink-muted">{activeBuild.games}</span>
            </div>
            <div className="flex items-center gap-2">
              {activeBuild.skillOrder.map((key, idx) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-baron-accent/40 bg-baron-elevated text-xs font-extrabold text-baron-accent-soft">
                    {key}
                  </div>
                  {idx < activeBuild.skillOrder.length - 1 && (
                    <span className="text-xs text-baron-ink-muted">›</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Summoners & Items Progression */}
        <div className="flex flex-col gap-4 rounded-xl border border-baron-border bg-baron-surface p-3.5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-baron-ink">Summoners</span>
              <button
                type="button"
                onClick={handleImportRunes}
                className="flex items-center gap-1 text-xs text-baron-ink-secondary hover:text-baron-ink"
              >
                <Download className="h-3 w-3" />
                <span>Import</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <img
                src={spellIconUrl("SummonerFlash", ddVersion)}
                alt="Flash"
                className="h-9 w-9 rounded-md border border-baron-border"
              />
              <img
                src={spellIconUrl("SummonerHeal", ddVersion)}
                alt="Heal"
                className="h-9 w-9 rounded-md border border-baron-border"
              />
              <ArrowLeftRight className="ml-1 h-3.5 w-3.5 text-baron-ink-muted" />
            </div>
          </div>

          <div className="border-t border-baron-border pt-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-baron-ink">Items</span>
              <div className="flex items-center gap-2 text-[11px] text-baron-ink-secondary">
                <span>Auto</span>
                <Switch checked={autoItems} onCheckedChange={setAutoItems} />
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-baron-ink-muted">Starting items</div>
              <div className="flex items-center gap-1.5">
                {[1055, 2003].map((id) => (
                  <img
                    key={id}
                    src={itemIconUrl(id, ddVersion)}
                    alt={String(id)}
                    className="h-8 w-8 rounded border border-baron-border"
                  />
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-baron-ink-muted">Core build order</div>
              <div className="flex items-center gap-1.5">
                {activeBuild.coreItems.map((id, idx) => (
                  <div key={id} className="flex items-center gap-1">
                    <img
                      src={itemIconUrl(id, ddVersion)}
                      alt={String(id)}
                      className="h-8 w-8 rounded border border-baron-border"
                    />
                    {idx < activeBuild.coreItems.length - 1 && (
                      <span className="text-xs text-baron-ink-muted">›</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-baron-ink-muted">Completed items</div>
              <div className="grid grid-cols-5 gap-1.5">
                {activeBuild.completedItems.map((item) => (
                  <div key={item.id} className="flex flex-col items-center gap-1">
                    <img
                      src={itemIconUrl(item.id, ddVersion)}
                      alt={String(item.id)}
                      className="h-8 w-8 rounded border border-baron-border"
                    />
                    <span className="text-[10px] font-semibold text-baron-ink-secondary">
                      {item.winRate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] text-baron-ink-muted">Situational</div>
              <div className="grid grid-cols-5 gap-1.5">
                {activeBuild.situationalItems.map((item) => (
                  <div key={item.id} className="flex flex-col items-center gap-1">
                    <img
                      src={itemIconUrl(item.id, ddVersion)}
                      alt={String(item.id)}
                      className="h-8 w-8 rounded border border-baron-border"
                    />
                    <span className="text-[10px] font-semibold text-baron-ink-secondary">
                      {item.winRate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
