"use client";

import { useState } from "react";
import { ArrowLeftRight, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
            "absolute inset-0 bg-gradient-to-t via-baron-canvas/35 to-transparent",
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
        <span className="text-slate-400">{slot.role}</span>
        <span
          className={cn(
            "font-semibold",
            slot.deltaPositive === true
              ? "text-baron-victory"
              : slot.deltaPositive === false
                ? "text-baron-defeat"
                : "text-slate-500",
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

  const handleImportRunes = async () => {
    const payload = await buildBaronRunePayload(
      "Ashe",
      8000,
      8100,
      [8008, 8009, 9104, 8017, 8139, 8135, 5005, 5008, 5001],
    );
    setInjectStatus(`Injected "${payload.name}" to LCU`);
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
                className="h-full w-full object-cover grayscale opacity-75"
              />
              <span className="absolute inset-0 bg-baron-canvas/35" />
            </div>
          ))}
        </div>

        <div className="flex max-w-xl flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-sm text-baron-victory">54%</span>
            <span className="text-[10px] font-semibold tracking-widest text-slate-400">
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
                className="h-full w-full object-cover grayscale opacity-75"
              />
              <span className="absolute inset-0 bg-baron-canvas/35" />
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
                stroke="#1E2536"
                strokeWidth="1"
              />
            ))}
            {/* Blue Team Comp Polygon */}
            <polygon
              points="90,34 134,58 138,108 90,126 52,102 48,54"
              fill="rgba(59, 130, 246, 0.28)"
              stroke="#3B82F6"
              strokeWidth="1.75"
            />
            {/* Red Team Comp Polygon */}
            <polygon
              points="90,46 124,62 120,100 90,118 46,104 58,64"
              fill="rgba(244, 63, 94, 0.24)"
              stroke="#F43F5E"
              strokeWidth="1.75"
            />
            <text x="90" y="13" textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="700">
              EARLY
            </text>
            <text x="150" y="54" textAnchor="start" fill="#64748B" fontSize="8" fontWeight="700">
              MID
            </text>
            <text x="150" y="112" textAnchor="start" fill="#64748B" fontSize="8" fontWeight="700">
              LATE
            </text>
            <text x="90" y="152" textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="700">
              DAMAGE CRIT
            </text>
            <text x="30" y="112" textAnchor="end" fill="#64748B" fontSize="8" fontWeight="700">
              CROWD CTRL
            </text>
            <text x="30" y="54" textAnchor="end" fill="#64748B" fontSize="8" fontWeight="700">
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
                className="h-8 w-8 rounded-md object-cover ring-1 ring-indigo-500/60"
              />
              <span className="text-xs font-bold text-slate-100">Ashe</span>
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
                      ? "bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-500/60"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] font-bold tracking-wider text-slate-500">BUILDS</div>
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
                      ? "border-indigo-500/60 bg-indigo-500/15"
                      : "border-baron-border bg-baron-elevated hover:border-baron-border-strong",
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div
                      className={cn(
                        "truncate text-xs font-bold",
                        active ? "text-indigo-300" : "text-slate-100",
                      )}
                    >
                      {b.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{b.games}</div>
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
                          ? "bg-emerald-500/20 text-emerald-300"
                          : b.accent === "rose"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-indigo-500/20 text-indigo-300",
                      )}
                    >
                      {b.winRate}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 text-[10px] font-bold tracking-wider text-slate-500">PRO BUILDS</div>
          <div className="flex flex-col divide-y divide-baron-border-muted">
            {PRO_BUILDS.map((pro) => (
              <div key={pro.player} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-baron-elevated text-[10px] font-bold text-slate-300 ring-1 ring-baron-border">
                    {pro.team}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-100">{pro.player}</div>
                    <div className="text-[10px] text-slate-500">{pro.when}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <img
                    src={runeIconUrl(pro.keystoneIcon)}
                    alt={pro.player}
                    className="h-5 w-5 rounded-full bg-baron-canvas p-0.5 ring-1 ring-amber-500/40"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-100">Runes</span>
              <button
                type="button"
                onClick={handleImportRunes}
                className="flex items-center gap-1 rounded-md border border-baron-border bg-baron-elevated px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-indigo-500/50 hover:text-white"
              >
                <Download className="h-3 w-3" />
                <span>Import</span>
              </button>
              {injectStatus && (
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  {injectStatus}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Auto-Runes</span>
              <Switch checked={autoRunes} onCheckedChange={setAutoRunes} />
            </div>
          </div>

          <div className="my-4 flex items-start justify-center gap-14">
            {/* Primary Tree: Precision */}
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-2.5">
                {RUNE_STYLES_PRIMARY.map((style) => (
                  <div
                    key={style.id}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border p-1",
                      style.active
                        ? "border-amber-400/80 bg-amber-500/15"
                        : "border-baron-border bg-baron-elevated opacity-35 grayscale",
                    )}
                  >
                    <img src={runeIconUrl(style.icon)} alt={style.name} className="h-4 w-4" />
                  </div>
                ))}
              </div>

              {PRECISION_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-4">
                  {row.map((rune) => (
                    <div
                      key={rune.id}
                      title={rune.name}
                      className={cn(
                        "flex items-center justify-center rounded-full border transition",
                        rowIdx === 0 ? "h-12 w-12" : "h-9 w-9",
                        rune.active
                          ? "border-amber-400 bg-amber-500/15 shadow-[0_0_14px_rgba(245,158,11,0.35)]"
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
                  ))}
                </div>
              ))}
            </div>

            {/* Secondary Tree: Domination + Stat Shards */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2.5">
                {RUNE_STYLES_SECONDARY.map((style) => (
                  <div
                    key={style.id}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border p-1",
                      style.active
                        ? "border-rose-400/80 bg-rose-500/15"
                        : "border-baron-border bg-baron-elevated opacity-35 grayscale",
                    )}
                  >
                    <img src={runeIconUrl(style.icon)} alt={style.name} className="h-4 w-4" />
                  </div>
                ))}
              </div>

              {DOMINATION_SECONDARY_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-4">
                  {row.map((rune) => (
                    <div
                      key={rune.id}
                      title={rune.name}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border transition",
                        rune.active
                          ? "border-rose-500 bg-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                          : "border-baron-border bg-baron-elevated opacity-30 grayscale",
                      )}
                    >
                      <img src={runeIconUrl(rune.icon)} alt={rune.name} className="h-7 w-7" />
                    </div>
                  ))}
                </div>
              ))}

              {/* Stat Shards */}
              <div className="mt-2 flex flex-col gap-2.5">
                {[
                  [
                    { label: "Adaptive", active: false, tone: "border-purple-400" },
                    { label: "Attack Speed", active: true, tone: "border-amber-400" },
                    { label: "Ability Haste", active: false, tone: "border-sky-400" },
                  ],
                  [
                    { label: "Adaptive", active: true, tone: "border-purple-400" },
                    { label: "Move Speed", active: false, tone: "border-sky-400" },
                    { label: "Health Scaling", active: false, tone: "border-emerald-400" },
                  ],
                  [
                    { label: "Health", active: true, tone: "border-emerald-400" },
                    { label: "Tenacity", active: false, tone: "border-indigo-400" },
                    { label: "Health Scaling", active: false, tone: "border-emerald-400" },
                  ],
                ].map((shardRow, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-4">
                    {shardRow.map((s) => (
                      <div
                        key={s.label + rIdx}
                        title={s.label}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                          s.active
                            ? `${s.tone} bg-baron-hover text-slate-100`
                            : "border-baron-border bg-baron-elevated text-slate-600 opacity-40",
                        )}
                      >
                        ●
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Skill Max Order Strip */}
          <div className="border-t border-baron-border pt-3">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-100">Skill max order</span>
              <span className="text-slate-500">{activeBuild.games}</span>
            </div>
            <div className="flex items-center gap-2">
              {activeBuild.skillOrder.map((key, idx) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-indigo-500/40 bg-baron-elevated text-xs font-extrabold text-indigo-300">
                    {key}
                  </div>
                  {idx < activeBuild.skillOrder.length - 1 && (
                    <span className="text-xs text-slate-500">›</span>
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
              <span className="text-sm font-bold text-slate-100">Summoners</span>
              <button
                type="button"
                onClick={handleImportRunes}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100"
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
              <ArrowLeftRight className="ml-1 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          <div className="border-t border-baron-border pt-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100">Items</span>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Auto</span>
                <Switch checked={autoItems} onCheckedChange={setAutoItems} />
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-slate-400">Starting items</div>
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
              <div className="mb-1.5 text-[11px] text-slate-400">Core build order</div>
              <div className="flex items-center gap-1.5">
                {activeBuild.coreItems.map((id, idx) => (
                  <div key={id} className="flex items-center gap-1">
                    <img
                      src={itemIconUrl(id, ddVersion)}
                      alt={String(id)}
                      className="h-8 w-8 rounded border border-baron-border"
                    />
                    {idx < activeBuild.coreItems.length - 1 && (
                      <span className="text-xs text-slate-500">›</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-slate-400">Completed items</div>
              <div className="grid grid-cols-5 gap-1.5">
                {activeBuild.completedItems.map((item) => (
                  <div key={item.id} className="flex flex-col items-center gap-1">
                    <img
                      src={itemIconUrl(item.id, ddVersion)}
                      alt={String(item.id)}
                      className="h-8 w-8 rounded border border-baron-border"
                    />
                    <span className="text-[10px] font-semibold text-slate-300">
                      {item.winRate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] text-slate-400">Situational</div>
              <div className="grid grid-cols-5 gap-1.5">
                {activeBuild.situationalItems.map((item) => (
                  <div key={item.id} className="flex flex-col items-center gap-1">
                    <img
                      src={itemIconUrl(item.id, ddVersion)}
                      alt={String(item.id)}
                      className="h-8 w-8 rounded border border-baron-border"
                    />
                    <span className="text-[10px] font-semibold text-slate-300">
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
