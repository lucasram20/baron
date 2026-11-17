"use client";

import { useState } from "react";
import { Check, Download, Sparkles } from "lucide-react";
import { LaneIcon, ShardIcon } from "@/components/icons/LolIcons";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Button } from "@/components/ui/button";
import {
  ASHE_BUILDS,
  BLUE_DRAFT,
  DOMINATION_SECONDARY_ROWS,
  PRECISION_ROWS,
  PRO_BUILDS,
  RED_DRAFT,
  RUNE_STYLES_PRIMARY,
  RUNE_STYLES_SECONDARY,
} from "@/data/mockDpm";
import {
  champSplashUrl,
  champSquareUrl,
  itemIconUrl,
  runeIconUrl,
} from "@/lib/ddragon";
import { buildBaronRunePayload } from "@/lib/tauri";

const RADAR_AXES = [
  { label: "DAMAGE", val: 0.85, angleDeg: -90 },
  { label: "SCALING", val: 0.72, angleDeg: -18 },
  { label: "CROWD CTRL", val: 0.78, angleDeg: 54 },
  { label: "TANKINESS", val: 0.42, angleDeg: 126 },
  { label: "SYNERGY", val: 0.88, angleDeg: 198 },
];

function DraftRadarSvg() {
  const cx = 90;
  const cy = 80;
  const maxR = 54;

  const polyPoints = (scale: number) =>
    RADAR_AXES.map((a) => {
      const rad = (a.angleDeg * Math.PI) / 180;
      return `${cx + Math.cos(rad) * maxR * scale},${cy + Math.sin(rad) * maxR * scale}`;
    }).join(" ");

  const bluePoints = RADAR_AXES.map((a) => {
    const rad = (a.angleDeg * Math.PI) / 180;
    return `${cx + Math.cos(rad) * maxR * a.val},${cy + Math.sin(rad) * maxR * a.val}`;
  }).join(" ");

  return (
    <svg viewBox="-28 -10 236 180" className="mx-auto h-[170px] w-full max-w-[236px]">
      {[0.33, 0.66, 1].map((scale) => (
        <polygon
          key={scale}
          points={polyPoints(scale)}
          fill="none"
          stroke="var(--baron-border)"
          strokeWidth="1"
        />
      ))}
      {RADAR_AXES.map((a) => {
        const rad = (a.angleDeg * Math.PI) / 180;
        const x2 = cx + Math.cos(rad) * maxR;
        const y2 = cy + Math.sin(rad) * maxR;
        const lx = cx + Math.cos(rad) * (maxR + 18);
        const ly = cy + Math.sin(rad) * (maxR + 15);
        return (
          <g key={a.label}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--baron-border)" strokeWidth="1" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8.5"
              fontWeight="700"
              fill="var(--baron-ink-muted)"
            >
              {a.label}
            </text>
          </g>
        );
      })}
      <polygon
        points={bluePoints}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="var(--baron-victory)"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ChampSelectView({ ddVersion }: { ddVersion: string }) {
  const [buildId, setBuildId] = useState(ASHE_BUILDS[0].id);
  const [modeTab, setModeTab] = useState<"builds" | "runes">("builds");
  const [runeImportMsg, setRuneImportMsg] = useState<string | null>(null);
  const [itemImported, setItemImported] = useState(false);

  const activeBuild = ASHE_BUILDS.find((b) => b.id === buildId) ?? ASHE_BUILDS[0];

  const handleImportRunes = async () => {
    const payload = await buildBaronRunePayload("Ashe", 8000, 8100, [
      8008, 9111, 9104, 8014, 8126, 8135,
    ]);
    setRuneImportMsg(`Prepared LCU page "${payload.name}" (offline preview)`);
  };

  return (
    <div className="min-h-full">
      {/* Lobby Header */}
      <header className="relative overflow-hidden border-b border-baron-border bg-baron-surface px-5 py-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-cover bg-center opacity-[0.18]"
          style={{
            backgroundImage: `url('${champSplashUrl("Ashe", 0)}')`,
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.85) 20%, transparent 95%)",
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={champSquareUrl("Ashe", ddVersion)}
              alt="Ashe"
              className="h-12 w-12 rounded-xl border-2 border-baron-accent object-cover"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-baron-accent/15 px-2 py-0.5 text-[10.5px] font-bold text-baron-accent-soft">
                  <Sparkles className="h-3 w-3" />
                  CHAMP SELECT
                </span>
                <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
                  Ashe
                </h1>
                <span className="inline-flex items-center gap-1 rounded bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary">
                  <LaneIcon role="Bot" className="h-3 w-3" />
                  Bot · Sample LCU Lobby
                </span>
              </div>
              <p className="mt-1 text-[12px] text-baron-ink-muted">
                Ranked anonymity respected: zero lobby reveal bypasses. Hover allies/enemies to
                evaluate comp synergy.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleImportRunes}
              className="h-8 bg-baron-accent px-3 text-[12px] font-semibold text-white hover:opacity-90"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Import Runes
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItemImported(true)}
              className="h-8 border-baron-border bg-baron-elevated px-3 text-[12px] text-baron-ink hover:border-baron-border-strong"
            >
              {itemImported ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-baron-emerald" />
                  Item Set Ready
                </>
              ) : (
                "Import Item Set"
              )}
            </Button>
          </div>
        </div>

        {runeImportMsg && (
          <div className="relative z-10 mt-2.5 text-[11.5px] font-semibold text-baron-emerald">
            {runeImportMsg}
          </div>
        )}
      </header>

      {/* Main 3-Column Draft Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_270px]">
        {/* Blue Side Draft */}
        <section className="border-b border-baron-border lg:border-r lg:border-b-0">
          <div className="border-b border-baron-border px-4 py-2.5 text-[11px] font-bold tracking-[0.07em] text-baron-victory uppercase">
            Blue Side Draft (You)
          </div>
          <div className="divide-y divide-baron-border">
            {BLUE_DRAFT.map((slot, i) => (
              <div
                key={`blue-${slot.champion}-${i}`}
                className={`flex items-center justify-between px-4 py-2.5 ${
                  slot.champion === "Ashe" ? "bg-baron-accent/10" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={champSquareUrl(slot.champion, ddVersion)}
                    alt={slot.champion}
                    className="h-9 w-9 rounded-md border border-baron-border object-cover"
                  />
                  <div>
                    <div className="text-[13px] font-bold text-baron-ink">{slot.champion}</div>
                    <div className="flex items-center gap-1 text-[10.5px] text-baron-ink-muted">
                      <LaneIcon role={slot.role} className="h-3 w-3" />
                      <span>{slot.role}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-black text-baron-gold">{slot.tier}</div>
                  <div
                    className={`text-[10.5px] font-semibold tnum ${
                      slot.deltaPositive ? "text-baron-emerald" : "text-baron-defeat"
                    }`}
                  >
                    {slot.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-baron-border p-4">
            <div className="mb-1 text-center text-[10.5px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
              Team Comp Radar (Sample)
            </div>
            <DraftRadarSvg />
          </div>
        </section>

        {/* Center Build & Rune Matrix */}
        <section className="min-w-0 divide-y divide-baron-border">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
            <AnimatedTabs
              layoutId="champselect-center-tab"
              ariaLabel="Build or rune detail"
              value={modeTab}
              onChange={setModeTab}
              items={[
                { id: "builds", label: "Recommended Builds" },
                { id: "runes", label: "Rune Matrix" },
              ]}
            />
            <div className="flex items-center gap-1.5">
              {ASHE_BUILDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBuildId(b.id)}
                  className={`rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition-colors tnum ${
                    b.id === buildId
                      ? "border-baron-accent bg-baron-accent/15 text-baron-ink"
                      : "border-baron-border bg-baron-surface text-baron-ink-secondary hover:text-baron-ink"
                  }`}
                >
                  {b.name} · {b.winRate}
                </button>
              ))}
            </div>
          </div>

          {modeTab === "builds" ? (
            <div className="space-y-4 p-5">
              {/* Core Path */}
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                  <span>Core Build · {activeBuild.games}</span>
                  <span className="text-baron-emerald">{activeBuild.winRate} WR</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {activeBuild.coreItems.map((id, idx) => (
                    <div key={`${activeBuild.id}-core-${id}`} className="flex items-center gap-2">
                      <img
                        src={itemIconUrl(id, ddVersion)}
                        alt={`Core item ${id}`}
                        className="h-10 w-10 rounded-md border border-baron-border-strong object-cover"
                      />
                      {idx < activeBuild.coreItems.length - 1 && (
                        <span className="text-xs text-baron-ink-muted">→</span>
                      )}
                    </div>
                  ))}
                  <div className="ml-auto flex items-center gap-1.5">
                    {activeBuild.skillOrder.map((key) => (
                      <span
                        key={key}
                        className="flex h-7 w-7 items-center justify-center rounded border border-baron-accent/40 bg-baron-accent/15 text-[11.5px] font-bold text-baron-accent-soft"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Completed & Situational */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-baron-border bg-baron-surface p-3.5">
                  <div className="mb-2 text-[10.5px] font-bold tracking-wider text-baron-ink-muted uppercase">
                    Completed Items
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeBuild.completedItems.map((it) => (
                      <div key={it.id} className="text-center">
                        <img
                          src={itemIconUrl(it.id, ddVersion)}
                          alt={`Item ${it.id}`}
                          className="h-9 w-9 rounded border border-baron-border object-cover"
                        />
                        <div className="mt-1 text-[10px] font-semibold text-baron-emerald tnum">
                          {it.winRate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-baron-border bg-baron-surface p-3.5">
                  <div className="mb-2 text-[10.5px] font-bold tracking-wider text-baron-ink-muted uppercase">
                    Situational Options
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeBuild.situationalItems.map((it) => (
                      <div key={it.id} className="text-center">
                        <img
                          src={itemIconUrl(it.id, ddVersion)}
                          alt={`Item ${it.id}`}
                          className="h-9 w-9 rounded border border-baron-border object-cover"
                        />
                        <div className="mt-1 text-[10px] font-semibold text-baron-cyan tnum">
                          {it.winRate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pro Benchmarks */}
              <div>
                <div className="mb-2 text-[11px] font-bold tracking-[0.06em] text-baron-ink-muted uppercase">
                  Recent Pro Reference (Sample)
                </div>
                <div className="divide-y divide-baron-border rounded-lg border border-baron-border bg-baron-surface">
                  {PRO_BUILDS.map((pro) => (
                    <div
                      key={`${pro.team}-${pro.player}`}
                      className="flex items-center justify-between gap-2 px-3.5 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={runeIconUrl(pro.keystoneIcon)}
                          alt={pro.player}
                          className="h-6 w-6 rounded-full bg-baron-inset object-cover"
                        />
                        <div>
                          <div className="text-[12px] font-bold text-baron-ink">
                            {pro.team} {pro.player}
                          </div>
                          <div className="text-[10.5px] text-baron-ink-muted">{pro.when}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {pro.items.map((id) => (
                          <img
                            key={`${pro.player}-${id}`}
                            src={itemIconUrl(id, ddVersion)}
                            alt={`Item ${id}`}
                            className="h-6 w-6 rounded border border-baron-border object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  {RUNE_STYLES_PRIMARY.map((style) => (
                    <img
                      key={style.id}
                      src={runeIconUrl(style.icon)}
                      alt={style.name}
                      className={`h-7 w-7 rounded-full border p-1 ${
                        style.active
                          ? "border-baron-gold bg-baron-gold/15"
                          : "border-baron-border opacity-40"
                      }`}
                    />
                  ))}
                </div>
                <div className="space-y-2.5">
                  {PRECISION_ROWS.map((row, idx) => (
                    <div key={idx} className="flex justify-center gap-3">
                      {row.map((node) => (
                        <img
                          key={node.id}
                          src={runeIconUrl(node.icon)}
                          alt={node.name}
                          title={node.name}
                          className={`h-9 w-9 rounded-full border p-0.5 ${
                            node.active
                              ? "border-baron-gold bg-baron-gold/15"
                              : "border-baron-border opacity-30 grayscale"
                          }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-baron-border bg-baron-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  {RUNE_STYLES_SECONDARY.map((style) => (
                    <img
                      key={style.id}
                      src={runeIconUrl(style.icon)}
                      alt={style.name}
                      className={`h-7 w-7 rounded-full border p-1 ${
                        style.active
                          ? "border-baron-defeat bg-baron-defeat/15"
                          : "border-baron-border opacity-40"
                      }`}
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  {DOMINATION_SECONDARY_ROWS.map((row, idx) => (
                    <div key={idx} className="flex justify-center gap-3">
                      {row.map((node) => (
                        <img
                          key={node.id}
                          src={runeIconUrl(node.icon)}
                          alt={node.name}
                          title={node.name}
                          className={`h-8 w-8 rounded-full border p-0.5 ${
                            node.active
                              ? "border-baron-defeat bg-baron-defeat/15"
                              : "border-baron-border opacity-30 grayscale"
                          }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-3 border-t border-baron-border pt-3 text-baron-ink-secondary">
                  <ShardIcon kind="attack" />
                  <ShardIcon kind="adaptive" />
                  <ShardIcon kind="health" />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Red Side Draft */}
        <section className="border-t border-baron-border lg:border-t-0 lg:border-l">
          <div className="border-b border-baron-border px-4 py-2.5 text-[11px] font-bold tracking-[0.07em] text-baron-defeat uppercase">
            Red Side Draft
          </div>
          <div className="divide-y divide-baron-border">
            {RED_DRAFT.map((slot, i) => (
              <div
                key={`red-${slot.champion}-${i}`}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={champSquareUrl(slot.champion, ddVersion)}
                    alt={slot.champion}
                    className="h-9 w-9 rounded-md border border-baron-border object-cover"
                  />
                  <div>
                    <div className="text-[13px] font-bold text-baron-ink">{slot.champion}</div>
                    <div className="flex items-center gap-1 text-[10.5px] text-baron-ink-muted">
                      <LaneIcon role={slot.role} className="h-3 w-3" />
                      <span>{slot.role}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-black text-baron-ace">{slot.tier}</div>
                  <div
                    className={`text-[10.5px] font-semibold tnum ${
                      slot.deltaPositive ? "text-baron-emerald" : "text-baron-defeat"
                    }`}
                  >
                    {slot.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
