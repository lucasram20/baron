"use client";

import { useState } from "react";
import { Activity, BarChart2, Shield, Swords } from "lucide-react";
import { POSTGAME_PARTICIPANTS } from "@/data/mockDpm";
import { champSquareUrl, itemIconUrl, runeIconUrl, spellIconUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { ScoreboardParticipant } from "@/types/baron";

interface PostGameViewProps {
  ddVersion: string;
  goldCurve: [number, number][];
}

function ScoreRing({ score, large = false }: { score: number; large?: boolean }) {
  const color =
    score >= 85 ? "#F59E0B" : score >= 70 ? "#38BDF8" : score >= 50 ? "#818CF8" : "#F97316";
  const r = large ? 22 : 13;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, score)) / 100);
  const size = large ? 54 : 34;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="rgba(17,21,31,0.8)"
          stroke="#1E2536"
          strokeWidth={large ? 3 : 2.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={large ? 3 : 2.5}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn(
          "absolute font-extrabold text-slate-100",
          large ? "text-base" : "text-[11px]",
        )}
      >
        {score}
      </span>
    </div>
  );
}

export function PostGameView({ ddVersion, goldCurve }: PostGameViewProps) {
  const [activeTab, setActiveTab] = useState<"scoreboard" | "loadout" | "details" | "advanced">(
    "scoreboard",
  );
  const bluePlayers = POSTGAME_PARTICIPANTS.filter((p) => p.team === "blue");
  const redPlayers = POSTGAME_PARTICIPANTS.filter((p) => p.team === "red");

  const renderRow = (p: ScoreboardParticipant) => (
    <div
      key={`${p.team}-${p.name}`}
      className={cn(
        "grid grid-cols-[54px_245px_188px_132px_74px_150px_48px] items-center border-b border-baron-border-muted px-3 py-2 text-xs transition",
        p.isYou ? "bg-blue-500/12" : "hover:bg-baron-elevated/60",
      )}
    >
      <div>
        {p.badge === "MVP" ? (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-400 ring-1 ring-amber-400/50">
            MVP
          </span>
        ) : p.badge === "ACE" ? (
          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-black text-purple-300 ring-1 ring-purple-400/50">
            ACE
          </span>
        ) : (
          <span className="text-slate-400">{p.place}</span>
        )}
      </div>

      {/* Champion + Spells + Runes + Summoner */}
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <img
            src={champSquareUrl(p.champion, ddVersion)}
            alt={p.champion}
            className="h-9 w-9 rounded-md object-cover ring-1 ring-baron-border"
          />
          <span className="absolute -right-1 -bottom-1 rounded bg-baron-canvas px-1 text-[9px] font-bold text-slate-200 ring-1 ring-baron-border">
            {p.level}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <img
            src={spellIconUrl(p.spells[0], ddVersion)}
            alt={p.spells[0]}
            className="h-4 w-4 rounded-sm"
          />
          <img
            src={spellIconUrl(p.spells[1], ddVersion)}
            alt={p.spells[1]}
            className="h-4 w-4 rounded-sm"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <img
            src={runeIconUrl(p.keystoneIcon)}
            alt="keystone"
            className="h-4 w-4 rounded-full bg-baron-canvas"
          />
          <img
            src={runeIconUrl(p.secondaryIcon)}
            alt="secondary"
            className="h-4 w-4 rounded-full bg-baron-canvas p-0.5"
          />
        </div>
        <div className="min-w-0 pl-0.5">
          <div className="flex items-center gap-1">
            <span className="truncate font-bold text-slate-100">{p.name}</span>
            <span className="text-[10px] text-slate-500">{p.tag}</span>
            {p.isYou && (
              <span className="rounded bg-indigo-500/30 px-1 text-[9px] font-bold text-indigo-200">
                YOU
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            <span className="font-semibold text-sky-400">{p.rankBadge}</span> {p.champion}
          </div>
        </div>
      </div>

      {/* 6 Items */}
      <div className="flex items-center gap-1">
        {p.items.map((id, i) => (
          <img
            key={`${id}-${i}`}
            src={itemIconUrl(id, ddVersion)}
            alt={String(id)}
            className={cn(
              "h-6 w-6 rounded border border-baron-border",
              i === 5 && "rounded-full",
            )}
          />
        ))}
      </div>

      {/* KDA */}
      <div>
        <div className="font-bold text-slate-100">
          {p.kills} / <span className="text-baron-defeat">{p.deaths}</span> / {p.assists}
        </div>
        <div className="text-[10px] text-slate-400">{p.kdaLine}</div>
      </div>

      {/* CS / Vision */}
      <div>
        <div className="font-bold text-slate-100">{p.csTop}</div>
        <div className="text-[10px] text-slate-400">{p.csSub}</div>
      </div>

      {/* Damage + Proportional Bar */}
      <div className="pr-3">
        <div className="mb-1 text-[11px] font-bold text-slate-100">{p.dmgLabel}</div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-baron-elevated">
          <div
            className={cn("h-full rounded-full", p.team === "blue" ? "bg-baron-victory" : "bg-baron-defeat")}
            style={{ width: `${Math.round(p.dmgRatio * 100)}%` }}
          />
        </div>
      </div>

      {/* Baron Score Circular Ring */}
      <div className="flex justify-end">
        <ScoreRing score={p.score} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Match Hero Card */}
      <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
        <div className="flex items-center justify-between border-b border-baron-border px-5 py-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={champSquareUrl("Ahri", ddVersion)}
                alt="Ahri"
                className="h-14 w-14 rounded-lg object-cover ring-1 ring-blue-500/40"
              />
              <span className="absolute -right-1 -bottom-1 rounded bg-baron-canvas px-1.5 text-[10px] font-bold text-slate-200 ring-1 ring-baron-border">
                17
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <img
                src={spellIconUrl("SummonerFlash", ddVersion)}
                alt="Flash"
                className="h-5 w-5 rounded"
              />
              <img
                src={spellIconUrl("SummonerDot", ddVersion)}
                alt="Ignite"
                className="h-5 w-5 rounded"
              />
            </div>
            <img
              src={runeIconUrl("perk-images/Styles/Domination/Electrocute/Electrocute.png")}
              alt="Electrocute"
              className="h-8 w-8 rounded-full bg-baron-elevated p-0.5 ring-1 ring-rose-500/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-50">
                  Nyx<span className="text-slate-400">#DPM</span>
                </span>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-sky-300 ring-1 ring-blue-500/40">
                  ◆ D4
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Ahri · Ranked Solo/Duo · 33:07 · 6 minutes ago
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ScoreRing score={75} large />
            <div className="text-right">
              <div className="text-xl font-extrabold text-baron-victory">Victory</div>
              <span className="inline-block rounded bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-sky-300">
                +21 LP
              </span>
            </div>
          </div>
        </div>

        {/* 5-Column KPI Summary Strip */}
        <div className="grid grid-cols-5 divide-x divide-baron-border">
          {[
            { top: "9 / 4 / 8", sub: "4.25 KDA" },
            { top: "55%", sub: "Kill participation" },
            { top: "8.1", sub: "CS / min · 267 total" },
            { top: "35.1k", sub: "Damage · 27% of team" },
            { top: "25", sub: "Vision score" },
          ].map((m) => (
            <div key={m.sub} className="px-5 py-3">
              <div className="text-lg font-extrabold text-slate-50">{m.top}</div>
              <div className="text-xs text-slate-400">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-6 border-b border-baron-border px-1">
        {[
          { id: "scoreboard", label: "Scoreboard", icon: <Swords className="h-3.5 w-3.5" /> },
          { id: "loadout", label: "Loadout", icon: <Shield className="h-3.5 w-3.5" /> },
          { id: "details", label: "Details", icon: <BarChart2 className="h-3.5 w-3.5" /> },
          { id: "advanced", label: "Advanced", icon: <Activity className="h-3.5 w-3.5" /> },
        ].map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition",
                active
                  ? "border-baron-victory text-slate-50"
                  : "border-transparent text-slate-400 hover:text-slate-200",
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "scoreboard" ? (
        <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
          <div className="flex items-center justify-between border-b border-baron-border bg-blue-500/10 px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-baron-victory">Victory</span>
              <span className="text-slate-400">Blue side</span>
            </div>
            <div className="text-slate-400">Towers 8 · Voidgrubs 3 · Herald 1 · Dragons 2 · Baron 1</div>
            <div className="font-bold text-slate-200">31 / 24 / 60 KDA · 68.5k gold</div>
          </div>
          {bluePlayers.map(renderRow)}

          <div className="flex items-center justify-between border-b border-baron-border bg-rose-500/10 px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-baron-defeat">Defeat</span>
              <span className="text-slate-400">Red side</span>
            </div>
            <div className="text-slate-400">Towers 5 · Voidgrubs 0 · Herald 0 · Dragons 2 · Baron 0</div>
            <div className="font-bold text-slate-200">24 / 31 / 50 KDA · 63.2k gold</div>
          </div>
          {redPlayers.map(renderRow)}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_320px] gap-3">
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Team Gold Advantage Timeline (@14:00: +1,850g)
              </span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
                XP @14: +410 · CS @14: +14
              </span>
            </div>
            <svg viewBox="0 0 500 160" className="h-44 w-full">
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <line x1="0" y1="130" x2="500" y2="130" stroke="#1E2536" strokeWidth="1" />
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                points={goldCurve
                  .map(([m, g]) => `${(m / 33) * 480 + 10},${130 - (g / 5600) * 110}`)
                  .join(" ")}
              />
              <polygon
                fill="url(#goldFill)"
                points={`10,130 ${goldCurve
                  .map(([m, g]) => `${(m / 33) * 480 + 10},${130 - (g / 5600) * 110}`)
                  .join(" ")} 490,130`}
              />
            </svg>
          </div>
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="mb-2 text-xs font-bold text-slate-200">6-Axis Combat Profile (Ahri)</div>
            <div className="space-y-2 pt-2 text-xs">
              {[
                ["DPM", 84],
                ["GPM", 79],
                ["CS / min", 86],
                ["Kill Participation", 72],
                ["Vision / min", 68],
                ["DMG / Gold", 81],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <div className="mb-1 flex justify-between text-slate-300">
                    <span>{label}</span>
                    <span className="font-bold text-indigo-300">{val}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-baron-elevated">
                    <div
                      className="h-full rounded-full bg-baron-accent"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
