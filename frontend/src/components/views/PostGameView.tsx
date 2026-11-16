"use client";

import { useState } from "react";
import { Activity, BarChart2, Shield, Swords } from "lucide-react";
import { ObjectiveBadge, RankCrest } from "@/components/icons/LolIcons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { POSTGAME_PARTICIPANTS } from "@/data/mockDpm";
import {
  champSplashUrl,
  champSquareUrl,
  itemIconUrl,
  runeIconUrl,
  spellIconUrl,
} from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { ScoreboardParticipant } from "@/types/baron";

interface PostGameViewProps {
  ddVersion: string;
  goldCurve: [number, number][];
}

const BLUE_BANS = ["Zed", "Rengar", "Akali", "Hecarim", "Caitlyn"];
const RED_BANS = ["Katarina", "Vayne", "Fizz", "Lucian", "Shaco"];

const AHRI_SKILL_LEVELS: ("Q" | "W" | "E" | "R")[] = [
  "Q", "W", "E", "Q", "Q", "R", "Q", "W", "Q", "W", "R", "W", "W", "E", "E", "R", "E", "E",
];

const AHRI_BUILD_TIMELINE = [
  { minute: "0:00", item: 1056, label: "Doran's Ring" },
  { minute: "9:40", item: 3118, label: "Malignance" },
  { minute: "15:10", item: 3020, label: "Sorcerer's Shoes" },
  { minute: "21:35", item: 4645, label: "Shadowflame" },
  { minute: "27:20", item: 3157, label: "Zhonya's Hourglass" },
  { minute: "31:45", item: 3089, label: "Rabadon's Deathcap" },
];

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
          className="fill-baron-surface stroke-baron-border"
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
          "absolute font-extrabold text-baron-ink",
          large ? "text-base" : "text-[11px]",
        )}
      >
        {score}
      </span>
    </div>
  );
}

function BannedIcon({ champ, ddVersion }: { champ: string; ddVersion: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative h-5 w-5 overflow-hidden rounded-sm border border-baron-border">
          <img
            src={champSquareUrl(champ, ddVersion)}
            alt={`Banned ${champ}`}
            className="h-full w-full object-cover opacity-55 grayscale"
          />
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute inset-0 h-full w-full text-baron-defeat/90"
          >
            <line x1="2" y1="18" x2="18" y2="2" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent>Banned: {champ}</TooltipContent>
    </Tooltip>
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
        "relative grid grid-cols-[54px_245px_188px_132px_74px_150px_48px] items-center border-b border-baron-border-muted px-3 py-2 text-xs transition",
        p.isYou ? "bg-baron-victory/10" : "hover:bg-baron-hover/65",
      )}
    >
      {p.isYou && <span className="absolute top-0 bottom-0 left-0 w-px bg-baron-victory" />}
      <div>
        {p.badge === "MVP" ? (
          <span className="rounded bg-baron-gold/18 px-2 py-0.5 text-[10px] font-black text-baron-gold ring-1 ring-baron-gold/50">
            MVP
          </span>
        ) : p.badge === "ACE" ? (
          <span className="rounded bg-baron-ace/18 px-2 py-0.5 text-[10px] font-black text-baron-ace ring-1 ring-baron-ace/50">
            ACE
          </span>
        ) : (
          <span className="font-medium text-baron-ink-muted">{p.place}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <img
            src={champSquareUrl(p.champion, ddVersion)}
            alt={p.champion}
            className="h-9 w-9 rounded-md object-cover ring-1 ring-baron-border"
          />
          <span className="absolute -right-1 -bottom-1 rounded bg-baron-canvas px-1 text-[9px] font-bold text-baron-ink ring-1 ring-baron-border">
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
            <span className="truncate font-bold text-baron-ink">{p.name}</span>
            <span className="text-[10px] text-baron-ink-muted">{p.tag}</span>
            {p.isYou && (
              <span className="rounded bg-baron-accent/25 px-1 text-[9px] font-bold text-baron-accent-soft">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-baron-ink-secondary">
            <RankCrest tier={p.rankBadge} className="h-3.5 w-3.5" />
            <span className="font-semibold text-baron-cyan">{p.rankBadge}</span>
            <span>{p.champion}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {p.items.map((id, idx) => (
          <Tooltip key={`${p.name}-slot-${idx}`}>
            <TooltipTrigger asChild>
              <img
                src={itemIconUrl(id, ddVersion)}
                alt={`Item ${id}`}
                className={cn(
                  "h-6 w-6 rounded border border-baron-border",
                  idx === 5 && "rounded-full",
                )}
              />
            </TooltipTrigger>
            <TooltipContent>Item ID #{id}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div>
        <div className="font-bold text-baron-ink">
          {p.kills} / <span className="text-baron-defeat">{p.deaths}</span> / {p.assists}
        </div>
        <div className="text-[10px] text-baron-ink-secondary">{p.kdaLine}</div>
      </div>

      <div>
        <div className="font-bold text-baron-ink">{p.csTop}</div>
        <div className="text-[10px] text-baron-ink-secondary">{p.csSub}</div>
      </div>

      <div className="pr-3">
        <div className="mb-1 text-[11px] font-bold text-baron-ink">{p.dmgLabel}</div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-baron-elevated">
          <div
            className={cn(
              "h-full rounded-full",
              p.team === "blue" ? "bg-baron-victory" : "bg-baron-defeat",
            )}
            style={{ width: `${Math.round(p.dmgRatio * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <ScoreRing score={p.score} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Match Hero Card */}
      <div className="relative overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
        <img
          src={champSplashUrl("Ahri", 0)}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 h-[108px] w-[420px] object-cover object-top opacity-20 [mask-image:linear-gradient(to_left,black_15%,transparent_95%)]"
        />

        <div className="relative flex items-center justify-between border-b border-baron-border px-5 py-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={champSquareUrl("Ahri", ddVersion)}
                alt="Ahri"
                className="h-14 w-14 rounded-lg object-cover ring-1 ring-baron-victory/50"
              />
              <span className="absolute -right-1 -bottom-1 rounded bg-baron-canvas px-1.5 text-[10px] font-bold text-baron-ink ring-1 ring-baron-border">
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
              className="h-8 w-8 rounded-full bg-baron-elevated p-0.5 ring-1 ring-baron-defeat/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-baron-ink">
                  Nyx<span className="text-baron-ink-muted">#DPM</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-baron-victory/15 px-2 py-0.5 text-[11px] font-bold text-baron-cyan ring-1 ring-baron-victory/40">
                  <RankCrest tier="DIAMOND" className="h-3.5 w-3.5" />
                  <span>D4</span>
                </span>
              </div>
              <div className="mt-1 text-xs text-baron-ink-secondary">
                Ahri · Ranked Solo/Duo · 33:07 · 6 minutes ago
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ScoreRing score={75} large />
            <div className="text-right">
              <div className="text-xl font-extrabold text-baron-victory">Victory</div>
              <span className="inline-block rounded bg-baron-victory/15 px-2 py-0.5 text-xs font-bold text-baron-cyan">
                +21 LP
              </span>
            </div>
          </div>
        </div>

        {/* 5-Column KPI Strip */}
        <div className="grid grid-cols-5 divide-x divide-baron-border">
          {[
            { top: "9 / 4 / 8", sub: "4.25 KDA" },
            { top: "55%", sub: "Kill participation" },
            { top: "8.1", sub: "CS / min · 267 total" },
            { top: "35.1k", sub: "Damage · 27% of team" },
            { top: "25", sub: "Vision score" },
          ].map((m) => (
            <div key={m.sub} className="px-5 py-3">
              <div className="text-lg font-extrabold text-baron-ink">{m.top}</div>
              <div className="text-xs text-baron-ink-muted">{m.sub}</div>
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
                  ? "border-baron-victory text-baron-ink"
                  : "border-transparent text-baron-ink-muted hover:text-baron-ink",
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "scoreboard" && (
        <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-victory/10 px-4 py-2 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-baron-victory">Victory</span>
                <span className="text-baron-ink-secondary">Blue side</span>
              </div>
              <div className="flex items-center gap-3">
                <ObjectiveBadge kind="tower" count={8} team="blue" />
                <ObjectiveBadge kind="grub" count={3} team="blue" />
                <ObjectiveBadge kind="herald" count={1} team="blue" />
                <ObjectiveBadge kind="dragon" count={2} team="blue" />
                <ObjectiveBadge kind="baron" count={1} team="blue" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-baron-ink-muted">Bans</span>
              <div className="flex items-center gap-1">
                {BLUE_BANS.map((champ) => (
                  <BannedIcon key={champ} champ={champ} ddVersion={ddVersion} />
                ))}
              </div>
            </div>

            <div className="font-bold text-baron-ink">
              31 / 24 / 60 KDA <span className="ml-2 text-baron-ink-secondary">68.5k gold</span>
            </div>
          </div>
          {bluePlayers.map(renderRow)}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-defeat/10 px-4 py-2 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-baron-defeat">Defeat</span>
                <span className="text-baron-ink-secondary">Red side</span>
              </div>
              <div className="flex items-center gap-3">
                <ObjectiveBadge kind="tower" count={5} team="red" />
                <ObjectiveBadge kind="grub" count={0} team="red" />
                <ObjectiveBadge kind="herald" count={0} team="red" />
                <ObjectiveBadge kind="dragon" count={2} team="red" />
                <ObjectiveBadge kind="baron" count={0} team="red" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-baron-ink-muted">Bans</span>
              <div className="flex items-center gap-1">
                {RED_BANS.map((champ) => (
                  <BannedIcon key={champ} champ={champ} ddVersion={ddVersion} />
                ))}
              </div>
            </div>

            <div className="font-bold text-baron-ink">
              24 / 31 / 50 KDA <span className="ml-2 text-baron-ink-secondary">63.2k gold</span>
            </div>
          </div>
          {redPlayers.map(renderRow)}
        </div>
      )}

      {activeTab === "loadout" && (
        <div className="grid grid-cols-[1.2fr_1fr] gap-3">
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <h3 className="text-sm font-bold text-baron-ink">Item Purchase Timeline (Ahri)</h3>
            <p className="mb-4 text-xs text-baron-ink-secondary">
              Exact build timings &amp; gold spikes reconstructed from Match-V5 item events
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {AHRI_BUILD_TIMELINE.map((step, idx) => (
                <div key={`${step.item}-${step.minute}`} className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center rounded-lg border border-baron-border bg-baron-elevated px-2.5 py-2">
                    <img
                      src={itemIconUrl(step.item, ddVersion)}
                      alt={step.label}
                      className="h-9 w-9 rounded border border-baron-border"
                    />
                    <span className="mt-1.5 text-[11px] font-bold text-baron-ink">{step.minute}</span>
                    <span className="text-[10px] text-baron-ink-muted">{step.label}</span>
                  </div>
                  {idx < AHRI_BUILD_TIMELINE.length - 1 && (
                    <span className="text-xs font-bold text-baron-ink-muted">›</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-baron-border pt-4">
              <div className="mb-2 text-xs font-bold text-baron-ink">
                Skill Upgrade Order (Q › W › E)
              </div>
              <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-18">
                {AHRI_SKILL_LEVELS.map((sk, idx) => (
                  <div
                    key={`lvl-${idx + 1}`}
                    className={cn(
                      "flex flex-col items-center rounded border py-1 text-[10px] font-bold",
                      sk === "R"
                        ? "border-baron-gold/50 bg-baron-gold/15 text-baron-gold"
                        : sk === "Q"
                          ? "border-baron-accent/40 bg-baron-accent/15 text-baron-accent-soft"
                          : "border-baron-border bg-baron-elevated text-baron-ink-secondary",
                    )}
                  >
                    <span className="text-[9px] text-baron-ink-muted">{idx + 1}</span>
                    <span>{sk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <h3 className="text-sm font-bold text-baron-ink">Runes Used (Domination · Sorcery)</h3>
            <p className="mb-4 text-xs text-baron-ink-secondary">
              Post-game rune effectiveness &amp; bonus contribution
            </p>
            <div className="flex flex-col gap-2.5 text-xs">
              {[
                {
                  name: "Electrocute",
                  metric: "2,410 bonus damage dealt",
                  icon: "perk-images/Styles/Domination/Electrocute/Electrocute.png",
                },
                {
                  name: "Sudden Impact",
                  metric: "890 true damage after Spirit Rush",
                  icon: "perk-images/Styles/Domination/SuddenImpact/SuddenImpact.png",
                },
                {
                  name: "Ultimate Hunter",
                  metric: "5/5 stacks (-31% R cooldown)",
                  icon: "perk-images/Styles/Domination/UltimateHunter/UltimateHunter.png",
                },
                {
                  name: "Manaflow Band + Transcendence",
                  metric: "250 max mana · 10 Ability Haste",
                  icon: "perk-images/Styles/7202_Sorcery.png",
                },
              ].map((r) => (
                <div
                  key={r.name}
                  className="flex items-center gap-3 rounded-lg border border-baron-border bg-baron-elevated p-2.5"
                >
                  <img
                    src={runeIconUrl(r.icon)}
                    alt={r.name}
                    className="h-8 w-8 rounded-full bg-baron-canvas p-1 ring-1 ring-baron-defeat/40"
                  />
                  <div>
                    <div className="font-bold text-baron-ink">{r.name}</div>
                    <div className="text-[11px] text-baron-ink-secondary">{r.metric}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "details" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <h3 className="text-sm font-bold text-baron-ink">Team Gold Lead Curve (0 → 33m)</h3>
            <p className="mb-3 text-xs text-baron-ink-secondary">
              Computed locally in Rust (`baron-core::timeline`) from Match-V5 frame diffs
            </p>
            <svg viewBox="0 0 420 150" className="h-40 w-full">
              <line
                x1="20"
                y1="115"
                x2="400"
                y2="115"
                className="stroke-baron-border-strong"
                strokeWidth="1"
              />
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                points={goldCurve
                  .map(([min, lead]) => {
                    const x = 20 + (min / 33) * 380;
                    const y = 115 - Math.max(-25, Math.min(95, (lead / 6000) * 90));
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
            <div className="flex justify-between text-[11px] text-baron-ink-muted">
              <span>0:00</span>
              <span className="font-semibold text-baron-emerald">@14:00: +1,850g lead</span>
              <span className="font-semibold text-baron-victory">@33:07: +5,300g finish</span>
            </div>
          </div>

          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <h3 className="text-sm font-bold text-baron-ink">
              @14m Laning Differentials (Nyx vs Orianna)
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "GOLD@14", val: "+840g" },
                { label: "CS@14", val: "+14 CS" },
                { label: "XP@14", val: "+620 XP" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-baron-border bg-baron-elevated p-3 text-center"
                >
                  <div className="text-[10px] font-bold tracking-wider text-baron-ink-muted">
                    {s.label}
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-baron-emerald">{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="overflow-hidden rounded-xl border border-baron-border bg-baron-surface">
          <div className="grid grid-cols-[190px_1fr_1fr_110px_110px_90px] border-b border-baron-border px-4 py-2.5 text-[11px] font-bold tracking-wider text-baron-ink-muted">
            <div>PARTICIPANT</div>
            <div>DAMAGE DEALT</div>
            <div>DAMAGE TAKEN</div>
            <div>GOLD / MIN</div>
            <div>VISION SCORE</div>
            <div className="text-right">BARON SCORE</div>
          </div>
          {POSTGAME_PARTICIPANTS.map((p) => {
            const goldPerMin = (340 + p.score * 1.4).toFixed(0);
            const takenRatio = Math.min(1, p.dmgRatio * 0.72 + (p.badge ? 0.12 : 0.05));
            const vision = p.csSub === "vision" ? p.csTop : String(Math.round(p.score * 0.34));
            return (
              <div
                key={`adv-${p.team}-${p.name}`}
                className={cn(
                  "grid grid-cols-[190px_1fr_1fr_110px_110px_90px] items-center gap-3 border-b border-baron-border-muted px-4 py-2 text-xs",
                  p.isYou ? "bg-baron-victory/10" : "hover:bg-baron-hover/60",
                )}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={champSquareUrl(p.champion, ddVersion)}
                    alt={p.champion}
                    className="h-6 w-6 rounded object-cover"
                  />
                  <span className="truncate font-bold text-baron-ink">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-baron-elevated">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        p.team === "blue" ? "bg-baron-victory" : "bg-baron-defeat",
                      )}
                      style={{ width: `${Math.round(p.dmgRatio * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-semibold text-baron-ink">
                    {p.dmgLabel.replace(" dmg", "")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-baron-elevated">
                    <div
                      className="h-full rounded-full bg-baron-ink-muted"
                      style={{ width: `${Math.round(takenRatio * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-semibold text-baron-ink-secondary">
                    {(takenRatio * 34).toFixed(1)}k
                  </span>
                </div>
                <div className="font-bold text-baron-gold">{goldPerMin} g/m</div>
                <div className="font-semibold text-baron-ink">{vision} vs</div>
                <div className="flex justify-end">
                  <ScoreRing score={p.score} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
