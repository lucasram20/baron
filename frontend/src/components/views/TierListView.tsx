"use client";

import { useEffect, useState } from "react";
import { BarChart3, Search } from "lucide-react";
import { fetchProviderTierList, type ProviderTierEntry, type TierRole } from "@/lib/tauri";

interface TierListViewProps {
  activeProviderId: string;
  activeProviderLabel: string;
}

const ROLES: { id: TierRole; label: string }[] = [
  { id: "Top", label: "Top" },
  { id: "Jungle", label: "Jungle" },
  { id: "Middle", label: "Mid" },
  { id: "Bottom", label: "Bot" },
  { id: "Utility", label: "Support" },
];

type LoadState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "ready"; rows: ProviderTierEntry[] };

export function TierListView({ activeProviderId, activeProviderLabel }: TierListViewProps) {
  const [role, setRole] = useState<TierRole>("Top");
  const [search, setSearch] = useState("");
  const [state, setState] = useState<LoadState>({ key: "", status: "loading" });
  const key = `${activeProviderId}:${role}`;

  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      fetchProviderTierList(activeProviderId, role).then(
        (rows) => { if (current) setState({ key, status: "ready", rows }); },
        (error: unknown) => { if (current) setState({ key, status: "error", message: String(error) }); },
      );
    }, 300);
    return () => { current = false; clearTimeout(timer); };
  }, [activeProviderId, role, key]);

  const rows = state.key === key && state.status === "ready"
    ? state.rows.filter((row) => row.champion_name.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  return (
    <div className="flex flex-col gap-3">
      <header className="rounded-xl border border-baron-border bg-baron-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-baron-accent-soft" />
          <h1 className="text-2xl font-extrabold tracking-tight">Tierlist</h1>
        </div>
        <p className="mt-2 text-xs text-baron-ink-secondary">
          {activeProviderLabel} · Current provider data. Patch, rank, region and period filters are not available for this feed.
          {activeProviderId === "opgg" && <> Source: <a href="https://op.gg" className="underline">OP.GG</a>.</>}
        </p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-baron-border bg-baron-surface p-1" aria-label="Select lane">
          {ROLES.map((item) => (
            <button key={item.id} type="button" aria-pressed={role === item.id} onClick={() => setRole(item.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${role === item.id ? "bg-baron-accent text-white" : "text-baron-ink-secondary hover:text-baron-ink"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <label className="flex h-8 items-center gap-2 rounded-lg border border-baron-border bg-baron-surface px-2.5">
          <Search className="h-3.5 w-3.5 text-baron-ink-muted" />
          <span className="sr-only">Search champions</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a champion"
            className="bg-transparent text-xs text-baron-ink placeholder:text-baron-ink-muted focus:outline-none" />
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-baron-border bg-baron-surface">
        {state.key !== key || state.status === "loading" ? (
          <p className="p-4 text-sm text-baron-ink-secondary" role="status">Loading provider data…</p>
        ) : state.status === "error" ? (
          <p className="p-4 text-sm text-baron-ink-secondary" role="alert">Provider data unavailable: {state.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-baron-ink-secondary">No champions found.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-xs tabular-nums">
            <thead className="border-b border-baron-border text-[11px] font-bold text-baron-ink-muted">
              <tr>{["RANK", "CHAMPION", "TIER", "WIN RATE", "PICK RATE", "BAN RATE", "GAMES"].map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.role}:${row.champion_name}`} className="border-b border-baron-border-muted">
                  <td className="px-4 py-2">{row.rank}</td>
                  <th scope="row" className="px-4 py-2 font-bold">{row.champion_name}</th>
                  <td className="px-4 py-2">{row.tier}</td>
                  <td className="px-4 py-2">{row.win_rate.toFixed(2)}%</td>
                  <td className="px-4 py-2">{row.pick_rate.toFixed(2)}%</td>
                  <td className="px-4 py-2">{row.ban_rate.toFixed(2)}%</td>
                  <td className="px-4 py-2">{Number(row.matches_label).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
