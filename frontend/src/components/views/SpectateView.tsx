"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, Eye, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOpggEsportsResults, type OpggEsportsMatch } from "@/lib/tauri";

export function SpectateView({ lcuConnected = false }: { ddVersion?: string; lcuConnected?: boolean }) {
  const [state, setState] = useState<{
    loaded: boolean;
    matches: OpggEsportsMatch[];
    error: string | null;
  }>({ loaded: false, matches: [], error: null });

  useEffect(() => {
    let cancelled = false;
    fetchOpggEsportsResults()
      .then((matches) => {
        if (!cancelled) setState({ loaded: true, matches, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            loaded: true,
            matches: [],
            error: err instanceof Error ? err.message : "Failed to load OP.GG esports results.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-baron-border bg-baron-surface px-5 py-4 shadow-[inset_0_1px_0_var(--baron-top-sheen)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
              Pro Esports &amp; Client Spectate
            </h1>
            <span className="rounded-md border border-baron-emerald/30 bg-baron-emerald/12 px-2 py-0.5 text-[10.5px] font-semibold text-baron-emerald">
              Live · OP.GG Esports MCP
            </span>
          </div>
          <p className="mt-1 text-[12px] text-baron-ink-muted">
            Verified tournament results fetched via OP.GG MCP. Client replay launching uses your
            local League Client when running.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
            lcuConnected
              ? "border-baron-emerald/35 bg-baron-emerald/12 text-baron-emerald"
              : "border-baron-border bg-baron-elevated text-baron-ink-secondary"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          {lcuConnected ? "LCU Client Ready" : "LCU Client Offline"}
        </span>
      </header>

      {!state.loaded && (
        <div role="status" className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-baron-surface" />
          ))}
        </div>
      )}

      {state.loaded && state.error && (
        <div role="alert" className="m-5 rounded-xl border border-baron-border bg-baron-surface p-5">
          <div className="flex items-start gap-2.5 text-[13px] text-baron-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
            <div>
              <div className="font-bold">Live OP.GG Esports Feed Unavailable</div>
              <p className="mt-1 text-[12px] text-baron-ink-secondary">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {state.loaded && !state.error && (
        <div className="divide-y divide-baron-border">
          {state.matches.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-baron-ink-muted">
              No recent tournament series returned by OP.GG MCP.
            </div>
          ) : (
            state.matches.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-baron-surface/55"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded bg-baron-accent/15 px-2 py-0.5 text-[11px] font-bold text-baron-accent-soft">
                    <Trophy className="h-3 w-3" />
                    {m.league ?? "PRO"}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-bold text-baron-ink">{m.name}</div>
                    <div className="text-[11px] text-baron-ink-muted">
                      {m.homeTeam?.name ?? m.homeTeam?.acronym} vs{" "}
                      {m.awayTeam?.name ?? m.awayTeam?.acronym} · {m.status}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-[15px] font-extrabold text-baron-cyan tnum">
                    {m.homeScore ?? 0} : {m.awayScore ?? 0}
                  </div>
                  {m.details && (
                    <a
                      href={m.details}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-baron-accent-soft hover:underline"
                    >
                      OP.GG
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
