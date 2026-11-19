"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Play, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchLolalyticsChampionBuild,
  fetchLolalyticsTierList,
  fetchMerakiChampionKit,
  fetchProviderDiagnostics,
  fetchUggChampionBuild,
  fetchUggTierList,
  type LolalyticsBuildResponse,
  type MerakiChampionDetail,
  type ProviderDiagnostic,
  type UggBuildResponse,
} from "@/lib/tauri";

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("live")) {
    return "border-baron-emerald/35 bg-baron-emerald/15 text-baron-emerald";
  }
  if (s.includes("not provided")) {
    return "border-baron-border bg-baron-inset text-baron-ink-secondary";
  }
  return "border-baron-gold/30 bg-baron-gold/10 text-baron-gold";
}

export function ProviderDiagnosticsPanel({ patch }: { patch: string }) {
  const [diagnostics, setDiagnostics] = useState<ProviderDiagnostic[]>([]);
  const [uggTest, setUggTest] = useState<{
    loading: boolean;
    data: UggBuildResponse | null;
    tierCount: number;
    error: string | null;
  }>({ loading: false, data: null, tierCount: 0, error: null });
  const [lolaTest, setLolaTest] = useState<{
    loading: boolean;
    data: LolalyticsBuildResponse | null;
    tierCount: number;
    error: string | null;
  }>({ loading: false, data: null, tierCount: 0, error: null });
  const [merakiTest, setMerakiTest] = useState<{
    loading: boolean;
    data: MerakiChampionDetail | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchProviderDiagnostics(patch).then((rows) => {
      if (!cancelled) setDiagnostics(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [patch]);

  const runUggProbe = async () => {
    setUggTest({ loading: true, data: null, tierCount: 0, error: null });
    try {
      const [build, tierRows] = await Promise.all([
        fetchUggChampionBuild("Malphite", patch, "Top", 54),
        fetchUggTierList("ranked", "Top", "emerald_plus", patch).catch(() => []),
      ]);
      setUggTest({ loading: false, data: build, tierCount: tierRows.length, error: null });
    } catch (err: unknown) {
      setUggTest({
        loading: false,
        data: null,
        tierCount: 0,
        error: err instanceof Error ? err.message : "U.GG probe failed",
      });
    }
  };

  const runLolaProbe = async () => {
    setLolaTest({ loading: true, data: null, tierCount: 0, error: null });
    try {
      const [build, tierRows] = await Promise.all([
        fetchLolalyticsChampionBuild("Malphite", "Top", "emerald_plus", patch),
        fetchLolalyticsTierList("Top", "emerald_plus", patch).catch(() => []),
      ]);
      setLolaTest({ loading: false, data: build, tierCount: tierRows.length, error: null });
    } catch (err: unknown) {
      setLolaTest({
        loading: false,
        data: null,
        tierCount: 0,
        error: err instanceof Error ? err.message : "LoLalytics probe failed",
      });
    }
  };

  const runMerakiProbe = async () => {
    setMerakiTest({ loading: true, data: null, error: null });
    try {
      const data = await fetchMerakiChampionKit("Malphite");
      setMerakiTest({ loading: false, data, error: null });
    } catch (err: unknown) {
      setMerakiTest({
        loading: false,
        data: null,
        error:
          err instanceof Error
            ? err.message
            : "Meraki CDN probe requires Tauri desktop IPC (CORS restricted in browser preview).",
      });
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-baron-border bg-baron-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[14.5px] font-bold text-baron-ink">
            <Activity className="h-4 w-4 text-baron-accent-soft" />
            Provider API Investigation &amp; Live Endpoint Matrix
          </h2>
          <p className="mt-0.5 text-[12px] text-baron-ink-muted">
            Empirical transport status across League meta providers. Baron uses verified open
            JSON &amp; official MCP endpoints and never bypasses Cloudflare challenges.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uggTest.loading}
            onClick={runUggProbe}
            className="h-8 border-baron-border bg-baron-inset text-[11.5px] font-semibold"
          >
            <Play className="mr-1.5 h-3 w-3 text-baron-emerald" />
            {uggTest.loading ? "Probing U.GG..." : "Probe Live U.GG"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={lolaTest.loading}
            onClick={runLolaProbe}
            className="h-8 border-baron-border bg-baron-inset text-[11.5px] font-semibold"
          >
            <Play className="mr-1.5 h-3 w-3 text-baron-accent-soft" />
            {lolaTest.loading ? "Probing LoLalytics..." : "Probe Live LoLalytics"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={merakiTest.loading}
            onClick={runMerakiProbe}
            className="h-8 border-baron-border bg-baron-inset text-[11.5px] font-semibold"
          >
            <Play className="mr-1.5 h-3 w-3 text-baron-cyan" />
            {merakiTest.loading ? "Probing Meraki..." : "Probe Live Meraki"}
          </Button>
        </div>
      </div>

      {(uggTest.data ||
        uggTest.error ||
        lolaTest.data ||
        lolaTest.error ||
        merakiTest.data ||
        merakiTest.error) && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {(uggTest.data || uggTest.error) && (
            <div className="rounded-lg border border-baron-border bg-baron-inset p-3 text-[12px]">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-baron-ink">
                <CheckCircle2 className="h-3.5 w-3.5 text-baron-emerald" />
                Live U.GG Probe
              </div>
              {uggTest.error ? (
                <div className="text-baron-gold">{uggTest.error}</div>
              ) : (
                uggTest.data && (
                  <div className="space-y-1 text-baron-ink-secondary tabular-nums">
                    <div>
                      Malphite ({uggTest.data.role}) ·{" "}
                      <strong className="text-baron-victory">
                        {uggTest.data.roleWinRate.toFixed(2)}% WR
                      </strong>{" "}
                      ({uggTest.data.roleGames.toLocaleString()}G)
                    </div>
                    <div className="text-[11px] text-baron-ink-muted">
                      Tier list rows: {uggTest.tierCount || "Desktop"} · Core:{" "}
                      {uggTest.data.coreItems.join(" → ")} · {uggTest.data.skillPriority}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {(lolaTest.data || lolaTest.error) && (
            <div className="rounded-lg border border-baron-border bg-baron-inset p-3 text-[12px]">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-baron-ink">
                <CheckCircle2 className="h-3.5 w-3.5 text-baron-accent-soft" />
                Live LoLalytics Probe
              </div>
              {lolaTest.error ? (
                <div className="text-baron-gold">{lolaTest.error}</div>
              ) : (
                lolaTest.data && (
                  <div className="space-y-1 text-baron-ink-secondary tabular-nums">
                    <div>
                      Malphite ({lolaTest.data.role}) ·{" "}
                      <strong className="text-baron-victory">
                        {lolaTest.data.winRate.toFixed(2)}% WR
                      </strong>{" "}
                      ({lolaTest.data.games.toLocaleString()}G)
                    </div>
                    <div className="text-[11px] text-baron-ink-muted">
                      Tier rows: {lolaTest.tierCount} · Core paths: {lolaTest.data.corePaths.length}{" "}
                      · Counters: {lolaTest.data.weakAgainst.length + lolaTest.data.strongAgainst.length}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {(merakiTest.data || merakiTest.error) && (
            <div className="rounded-lg border border-baron-border bg-baron-inset p-3 text-[12px]">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-baron-ink">
                <CheckCircle2 className="h-3.5 w-3.5 text-baron-cyan" />
                Live Meraki CDN Probe
              </div>
              {merakiTest.error ? (
                <div className="text-baron-ink-secondary">{merakiTest.error}</div>
              ) : (
                merakiTest.data && (
                  <div className="space-y-1 text-baron-ink-secondary">
                    <div>
                      {merakiTest.data.name} ({merakiTest.data.title}) ·{" "}
                      <strong>{merakiTest.data.attackType}</strong> ·{" "}
                      <strong>{merakiTest.data.adaptiveType}</strong>
                    </div>
                    <div className="text-[11px] text-baron-ink-muted">
                      Last Changed: {merakiTest.data.patchLastChanged} · Abilities:{" "}
                      {Object.keys(merakiTest.data.abilities).join(", ")}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {diagnostics.map((d) => {
          const anyLive =
            d.tierListStatus.toLowerCase().includes("live") ||
            d.buildDataStatus.toLowerCase().includes("live");
          return (
            <div
              key={d.id}
              className="rounded-lg border border-baron-border bg-baron-inset p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-[13px] text-baron-ink">
                  {anyLive ? (
                    <CheckCircle2 className="h-4 w-4 text-baron-emerald" />
                  ) : (
                    <ShieldBan className="h-4 w-4 text-baron-ink-muted" />
                  )}
                  <span>{d.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className={`rounded border px-1.5 py-0.5 ${statusTone(d.tierListStatus)}`}>
                    Tier: {d.tierListStatus}
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 ${statusTone(d.buildDataStatus)}`}>
                    Build: {d.buildDataStatus}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-baron-ink-secondary">
                {d.summary}
              </p>
              <div className="mt-2 truncate font-mono text-[10.5px] text-baron-ink-muted">
                {d.sampleEndpoint}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
