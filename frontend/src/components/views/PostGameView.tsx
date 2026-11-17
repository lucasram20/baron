"use client";

import { useState } from "react";
import { Slash } from "lucide-react";
import { ObjectiveBadge } from "@/components/icons/LolIcons";
import SpotlightCard from "@/components/SpotlightCard";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { ScoreRing } from "@/components/ui/score-ring";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { BLUE_BANS, POSTGAME_PARTICIPANTS, RED_BANS } from "@/data/mockDpm";
import {
  champSplashUrl,
  champSquareUrl,
  itemIconUrl,
  runeIconUrl,
  spellIconUrl,
} from "@/lib/ddragon";
import { useTheme } from "@/lib/theme";

type PostGameTab = "scoreboard" | "loadout" | "details" | "advanced";

function GoldCurveSvg({ goldCurve }: { goldCurve: [number, number][] }) {
  const w = 720;
  const h = 190;
  const ptsSource = goldCurve.length >= 2 ? goldCurve : [[0, 0], [14, 1850], [33, 5300]];
  const maxMin = Math.max(...ptsSource.map(([m]) => m), 33);
  const maxAbsGold = Math.max(...ptsSource.map(([, g]) => Math.abs(g)), 2000);

  const pts = ptsSource.map(([min, gold]) => ({
    min,
    gold,
    x: 48 + (min / maxMin) * (w - 72),
    y: h / 2 - (gold / (maxAbsGold * 1.15)) * (h / 2 - 22),
  }));

  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    pathD += ` C ${mx} ${pts[i].y}, ${mx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  const midY = h / 2;
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${midY} L ${pts[0].x} ${midY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[190px] w-full overflow-visible">
      <defs>
        <linearGradient id="postgameGoldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--baron-victory)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--baron-victory)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={44} x2={w - 16} y1={midY} y2={midY} stroke="var(--baron-border-strong)" />
      <text x={38} y={midY + 3} textAnchor="end" fontSize="10" fill="var(--baron-ink-muted)" className="tnum">
        0
      </text>
      <text x={38} y={24} textAnchor="end" fontSize="10" fill="var(--baron-victory)" className="tnum">
        +{Math.round(maxAbsGold / 100) / 10}k
      </text>
      <path d={areaD} fill="url(#postgameGoldFill)" />
      <path d={pathD} fill="none" stroke="var(--baron-victory)" strokeWidth="2.4" />
      {pts.map((p) => (
        <g key={`${p.min}-${p.gold}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="var(--baron-surface)"
            stroke="var(--baron-victory)"
            strokeWidth="2"
          />
          <text
            x={p.x}
            y={h - 4}
            textAnchor="middle"
            fontSize="10"
            fill="var(--baron-ink-muted)"
            className="tnum"
          >
            {p.min}m
          </text>
        </g>
      ))}
    </svg>
  );
}

export function PostGameView({
  ddVersion,
  goldCurve,
}: {
  ddVersion: string;
  goldCurve: [number, number][];
}) {
  const { resolved } = useTheme();
  const [tab, setTab] = useState<PostGameTab>("scoreboard");

  const blueTeam = POSTGAME_PARTICIPANTS.filter((p) => p.team === "blue");
  const redTeam = POSTGAME_PARTICIPANTS.filter((p) => p.team === "red");

  const teamBlocks = [
    {
      team: "blue" as const,
      resultLabel: "Victory",
      sideLabel: "Blue side",
      kdaSummary: "31 / 24 / 60 KDA",
      goldSummary: "68.5k gold",
      objectives: [
        { kind: "tower" as const, count: 8 },
        { kind: "grub" as const, count: 3 },
        { kind: "herald" as const, count: 1 },
        { kind: "dragon" as const, count: 2 },
        { kind: "baron" as const, count: 1 },
      ],
      bans: BLUE_BANS,
      rows: blueTeam,
    },
    {
      team: "red" as const,
      resultLabel: "Defeat",
      sideLabel: "Red side",
      kdaSummary: "24 / 31 / 50 KDA",
      goldSummary: "63.2k gold",
      objectives: [
        { kind: "tower" as const, count: 5 },
        { kind: "grub" as const, count: 3 },
        { kind: "herald" as const, count: 0 },
        { kind: "dragon" as const, count: 2 },
        { kind: "baron" as const, count: 0 },
      ],
      bans: RED_BANS,
      rows: redTeam,
    },
  ];

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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[44%] bg-cover bg-center opacity-[0.18] dark:opacity-[0.22]"
          style={{
            backgroundImage: `url('${champSplashUrl("Ahri", 0)}')`,
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3.5">
            <div className="relative h-[52px] w-[52px] shrink-0">
              <img
                src={champSquareUrl("Ahri", ddVersion)}
                alt="Ahri"
                className="h-[52px] w-[52px] rounded-xl border-2 border-baron-border-strong object-cover"
              />
              <span className="absolute -right-1 -bottom-1 rounded bg-baron-elevated px-1.5 py-[1px] text-[10px] font-bold text-baron-ink ring-1 ring-baron-border-strong tnum">
                17
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <img
                src={spellIconUrl("SummonerFlash", ddVersion)}
                alt="Flash"
                className="h-[22px] w-[22px] rounded border border-baron-border object-cover"
              />
              <img
                src={runeIconUrl("perk-images/Styles/Domination/Electrocute/Electrocute.png")}
                alt="Electrocute"
                className="h-[22px] w-[22px] rounded-full border border-baron-border bg-baron-inset object-cover"
              />
              <img
                src={spellIconUrl("SummonerDot", ddVersion)}
                alt="Ignite"
                className="h-[22px] w-[22px] rounded border border-baron-border object-cover"
              />
              <img
                src={runeIconUrl("perk-images/Styles/7202_Sorcery.png")}
                alt="Sorcery"
                className="h-[22px] w-[22px] rounded-full border border-baron-border bg-baron-inset object-cover p-0.5"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[17px] font-extrabold tracking-[-0.02em] text-baron-ink">
                  Nyx <span className="font-semibold text-baron-ink-muted">#DPM</span>
                </h1>
                <span className="rounded bg-baron-victory/15 px-1.5 py-0.5 text-[10.5px] font-bold text-baron-victory">
                  D4
                </span>
                <span className="rounded bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary ring-1 ring-baron-border">
                  Sample match
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-baron-ink-muted">
                Ahri · Ranked Solo/Duo · 33:07 · 6 minutes ago
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <ScoreRing score={75} size="lg" label="Baron Score 75" />
            <div className="text-right">
              <div className="text-[20px] font-extrabold tracking-tight text-baron-victory">
                Victory
              </div>
              <span className="inline-block rounded bg-baron-cyan/15 px-2 py-0.5 text-[11px] font-bold text-baron-cyan tnum">
                +21 LP
              </span>
            </div>
          </div>
        </div>

        {/* Flush 5-Column KPI Strip */}
        <div className="relative z-10 grid grid-cols-2 divide-x divide-baron-border border-t border-baron-border sm:grid-cols-5">
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">9/4/8</div>
            <div className="text-[11px] text-baron-ink-muted">4.25 KDA</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">55%</div>
            <div className="text-[11px] text-baron-ink-muted">Kill participation</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">8.1</div>
            <div className="text-[11px] text-baron-ink-muted">CS/min · 267 total</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">35.1k</div>
            <div className="text-[11px] text-baron-ink-muted">Damage · 27% of team</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[15px] font-bold text-baron-ink tnum">25</div>
            <div className="text-[11px] text-baron-ink-muted">Vision score</div>
          </div>
        </div>
      </SpotlightCard>

      {/* Tabs */}
      <div className="border-b border-baron-border bg-baron-surface/60 px-5 py-2">
        <AnimatedTabs
          layoutId="postgame-subtabs"
          ariaLabel="Post-game analysis views"
          value={tab}
          onChange={setTab}
          items={[
            { id: "scoreboard", label: "Scoreboard" },
            { id: "loadout", label: "Loadout" },
            { id: "details", label: "Details" },
            { id: "advanced", label: "Gold & Advanced" },
          ]}
        />
      </div>

      {/* Tab Content */}
      {tab === "scoreboard" && (
        <div className="divide-y divide-baron-border">
          {teamBlocks.map((block) => (
            <section key={block.team}>
              {/* Team Summary Header */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-b border-baron-border px-5 py-2.5 ${
                  block.team === "blue" ? "bg-baron-victory/5" : "bg-baron-defeat/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[13px] font-bold ${
                      block.team === "blue" ? "text-baron-victory" : "text-baron-defeat"
                    }`}
                  >
                    {block.resultLabel}
                  </span>
                  <span className="text-[12px] text-baron-ink-muted">{block.sideLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {block.objectives.map((obj) => (
                    <ObjectiveBadge
                      key={`${block.team}-${obj.kind}`}
                      kind={obj.kind}
                      count={obj.count}
                      team={block.team}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-baron-ink-muted">Bans</span>
                    <div className="flex items-center gap-1">
                      {block.bans.map((champ) => (
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
                  <div className="text-[12px] font-semibold text-baron-ink tnum">
                    {block.kdaSummary}{" "}
                    <span className="ml-2 font-normal text-baron-ink-secondary">
                      {block.goldSummary}
                    </span>
                  </div>
                </div>
              </div>

              <Table>
                <TableBody>
                  {block.rows.map((p) => (
                    <TableRow
                      key={`${p.name}-${p.champion}`}
                      className={`border-baron-border ${
                        p.isYou
                          ? "bg-baron-accent/8 hover:bg-baron-accent/12"
                          : "hover:bg-baron-surface/75"
                      }`}
                    >
                      {/* Place / Badge */}
                      <TableCell className="w-[68px] pl-5">
                        {p.badge ? (
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10.5px] font-extrabold ${
                              p.badge === "MVP"
                                ? "bg-baron-gold/20 text-baron-gold"
                                : "bg-baron-ace/20 text-baron-ace"
                            }`}
                          >
                            {p.badge}
                          </span>
                        ) : (
                          <span className="text-[12px] font-semibold text-baron-ink-muted tnum">
                            {p.place}
                          </span>
                        )}
                      </TableCell>

                      {/* Champion + Spells/Runes + Name */}
                      <TableCell className="min-w-[230px]">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-9 w-9 shrink-0">
                            <img
                              src={champSquareUrl(p.champion, ddVersion)}
                              alt={p.champion}
                              className="h-9 w-9 rounded-md border border-baron-border-strong object-cover"
                            />
                            <span className="absolute -right-1 -bottom-1 rounded bg-baron-elevated px-1 text-[9px] font-bold text-baron-ink ring-1 ring-baron-border tnum">
                              {p.level}
                            </span>
                          </div>

                          <div className="grid shrink-0 grid-cols-2 gap-0.5">
                            <img
                              src={spellIconUrl(p.spells[0], ddVersion)}
                              alt={p.spells[0]}
                              className="h-4 w-4 rounded-[3px] object-cover"
                            />
                            <img
                              src={runeIconUrl(p.keystoneIcon)}
                              alt="Keystone"
                              className="h-4 w-4 rounded-full bg-baron-inset object-cover"
                            />
                            <img
                              src={spellIconUrl(p.spells[1], ddVersion)}
                              alt={p.spells[1]}
                              className="h-4 w-4 rounded-[3px] object-cover"
                            />
                            <img
                              src={runeIconUrl(p.secondaryIcon)}
                              alt="Secondary"
                              className="h-4 w-4 rounded-full bg-baron-inset object-cover p-0.5"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-baron-ink">{p.name}</span>
                              <span className="text-[11px] text-baron-ink-muted">{p.tag}</span>
                              {p.isYou && (
                                <span className="rounded bg-baron-victory/20 px-1 py-[1px] text-[9.5px] font-bold text-baron-victory">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-baron-ink-muted">
                              <span className="font-semibold text-baron-ink-secondary">
                                {p.rankBadge}
                              </span>{" "}
                              {p.champion}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2x3 Items Grid */}
                      <TableCell className="w-[82px]">
                        <div className="grid w-[64px] grid-cols-3 gap-[2px]">
                          {p.items.map((itemId, idx) => (
                            <img
                              key={`${p.name}-${itemId}-${idx}`}
                              src={itemIconUrl(itemId, ddVersion)}
                              alt={`Item ${itemId}`}
                              className="h-5 w-5 rounded-[3px] border border-baron-border object-cover"
                            />
                          ))}
                        </div>
                      </TableCell>

                      {/* KDA */}
                      <TableCell>
                        <div className="font-bold text-baron-ink tnum">
                          {p.kills} / <span className="text-baron-defeat">{p.deaths}</span> /{" "}
                          {p.assists}
                        </div>
                        <div className="text-[11px] text-baron-ink-muted tnum">{p.kdaLine}</div>
                      </TableCell>

                      {/* CS / Vision */}
                      <TableCell>
                        <div className="font-semibold text-baron-ink tnum">{p.csTop}</div>
                        <div className="text-[11px] text-baron-ink-muted tnum">{p.csSub}</div>
                      </TableCell>

                      {/* Damage + Avg Tick */}
                      <TableCell className="w-[155px]">
                        <div className="text-[11.5px] font-semibold text-baron-ink tnum">
                          {p.dmgLabel}
                        </div>
                        <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-baron-border">
                          <div
                            className={`h-full rounded-full ${
                              block.team === "blue" ? "bg-baron-victory" : "bg-baron-defeat"
                            }`}
                            style={{ width: `${Math.round(p.dmgRatio * 100)}%` }}
                          />
                          <div
                            aria-hidden="true"
                            className="absolute inset-y-0 left-[54%] w-[1.5px] bg-baron-ink/80"
                          />
                        </div>
                      </TableCell>

                      {/* Score Ring */}
                      <TableCell className="w-16 pr-5 text-right">
                        <div className="inline-flex justify-end">
                          <ScoreRing
                            score={p.score}
                            size="sm"
                            label={`${p.name} Baron Score ${p.score}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))}
        </div>
      )}

      {tab === "loadout" && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <h2 className="text-[13px] font-bold text-baron-ink">Final Item Build Order</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {[3118, 3020, 4645, 3157, 3089, 3364].map((id, i) => (
                <div key={id} className="flex items-center gap-2">
                  <img
                    src={itemIconUrl(id, ddVersion)}
                    alt={`Item ${id}`}
                    className="h-9 w-9 rounded-md border border-baron-border-strong object-cover"
                  />
                  {i < 5 && <span className="text-xs text-baron-ink-muted">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <h2 className="text-[13px] font-bold text-baron-ink">Runes &amp; Skill Priority</h2>
            <p className="mt-2 text-[12px] text-baron-ink-secondary">
              Domination (Electrocute · Sudden Impact · Eyeball · Ultimate Hunter) + Sorcery
              (Manaflow Band · Transcendence).
            </p>
            <div className="mt-3 flex items-center gap-2">
              {["Q", "W", "E"].map((key, i) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-baron-accent/40 bg-baron-accent/15 text-[12px] font-bold text-baron-accent-soft">
                    {key}
                  </span>
                  {i < 2 && <span className="text-xs text-baron-ink-muted">→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "details" && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="text-[11px] font-bold tracking-wider text-baron-ink-muted uppercase">
              Lane Matchup @14:00
            </div>
            <div className="mt-2 text-[22px] font-extrabold text-baron-emerald tnum">+840 Gold</div>
            <div className="mt-1 text-[12px] text-baron-ink-secondary tnum">
              Ahri vs Orianna · +14 CS · +620 XP
            </div>
          </div>
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="text-[11px] font-bold tracking-wider text-baron-ink-muted uppercase">
              Objective Control
            </div>
            <div className="mt-2 text-[22px] font-extrabold text-baron-ink tnum">
              1 Baron · 2 Drakes
            </div>
            <div className="mt-1 text-[12px] text-baron-ink-secondary">
              3 Voidgrubs + Rift Herald secured
            </div>
          </div>
          <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="text-[11px] font-bold tracking-wider text-baron-ink-muted uppercase">
              Vision Efficiency
            </div>
            <div className="mt-2 text-[22px] font-extrabold text-baron-cyan tnum">25 Score</div>
            <div className="mt-1 text-[12px] text-baron-ink-secondary tnum">
              6 Control Wards · 0.75/min
            </div>
          </div>
        </div>
      )}

      {tab === "advanced" && (
        <div className="p-5">
          <div className="rounded-xl border border-baron-border bg-baron-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-bold text-baron-ink">
                  Team Gold Differential Curve (Sample Match Timeline)
                </h2>
                <p className="text-[12px] text-baron-ink-muted">
                  Blue team cumulative gold lead through 33:07.
                </p>
              </div>
              <span className="rounded bg-baron-victory/15 px-2.5 py-1 text-[12px] font-bold text-baron-victory tnum">
                Peak +5,300g
              </span>
            </div>
            <GoldCurveSvg goldCurve={goldCurve} />
          </div>
        </div>
      )}
    </div>
  );
}
