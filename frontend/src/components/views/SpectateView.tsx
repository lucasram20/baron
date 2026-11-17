"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { LaneIcon, RankCrest } from "@/components/icons/LolIcons";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { SPECTATE_MATCHES } from "@/data/mockDpm";
import { champSquareUrl, LATEST_DDRAGON } from "@/lib/ddragon";

type RegionFilter = "ALL" | "KR" | "EUW" | "NA";

export function SpectateView({ ddVersion = LATEST_DDRAGON }: { ddVersion?: string }) {
  const [region, setRegion] = useState<RegionFilter>("ALL");

  const filtered =
    region === "ALL"
      ? SPECTATE_MATCHES
      : SPECTATE_MATCHES.filter((m) => m.region.toUpperCase() === region);

  return (
    <div className="min-h-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
              Spectate Live Feeds
            </h1>
            <span className="rounded bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary ring-1 ring-baron-border">
              Sample lobby feed
            </span>
          </div>
          <p className="mt-1 text-[12px] text-baron-ink-muted">
            Illustrative Challenger matches across KR, EUW, and NA. Launching an active spectator
            replay requires a running League Client.
          </p>
        </div>

        <AnimatedTabs
          layoutId="spectate-region-tabs"
          ariaLabel="Filter spectate matches by region"
          value={region}
          onChange={setRegion}
          items={[
            { id: "ALL", label: "All Regions" },
            { id: "KR", label: "KR" },
            { id: "EUW", label: "EUW" },
            { id: "NA", label: "NA" },
          ]}
        />
      </header>

      <div className="divide-y divide-baron-border">
        {filtered.map((match) => (
          <article key={match.id} className="px-5 py-4 transition-colors hover:bg-baron-surface/55">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded bg-baron-accent/15 px-2 py-0.5 text-[11px] font-bold text-baron-accent-soft">
                  {match.region}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-baron-cyan tnum">
                  <RankCrest tier={match.avgTier} className="h-3.5 w-3.5" />
                  {match.avgTier} · {match.avgLp}
                </span>
                <span className="text-[11.5px] text-baron-ink-muted tnum">
                  In game · {match.duration}
                </span>
                {match.knownPlayers && (
                  <span className="rounded bg-baron-gold/15 px-2 py-0.5 text-[10.5px] font-semibold text-baron-gold">
                    {match.knownPlayers}
                  </span>
                )}
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-md border border-baron-border bg-baron-elevated px-2.5 py-1 text-[11px] font-semibold text-baron-ink-secondary">
                <Eye className="h-3.5 w-3.5" />
                Client Spectate Required
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { side: "Blue Side", players: match.blue, accent: "border-l-baron-victory" },
                { side: "Red Side", players: match.red, accent: "border-l-baron-defeat" },
              ].map((team) => (
                <div
                  key={`${match.id}-${team.side}`}
                  className={`divide-y divide-baron-border overflow-hidden rounded-lg border border-baron-border border-l-[3px] ${team.accent} bg-baron-surface`}
                >
                  {team.players.map((p, idx) => (
                    <div
                      key={`${match.id}-${team.side}-${p.champion}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-1.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <img
                          src={champSquareUrl(p.champion, ddVersion)}
                          alt={p.champion}
                          className="h-7 w-7 shrink-0 rounded border border-baron-border object-cover"
                        />
                        <span className="truncate text-[12.5px] font-semibold text-baron-ink">
                          {p.playerName}
                        </span>
                        {p.teamTag && (
                          <span className="rounded bg-baron-elevated px-1.5 py-[1px] text-[10px] font-bold text-baron-gold">
                            {p.teamTag}
                          </span>
                        )}
                        {p.isPro && (
                          <span className="rounded bg-baron-cyan/15 px-1.5 py-[1px] text-[9.5px] font-bold text-baron-cyan">
                            PRO
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1.5 text-[11px] text-baron-ink-muted">
                        <LaneIcon role={p.role} className="h-3 w-3" />
                        <span>{p.champion}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
