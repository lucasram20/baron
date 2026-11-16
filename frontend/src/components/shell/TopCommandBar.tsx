"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Search, Settings } from "lucide-react";
import { AVAILABLE_PATCHES, AVAILABLE_PERIODS } from "@/lib/ddragon";
import type { ProviderMeta } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type { BaronRoute } from "@/types/baron";

interface TopCommandBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  patch: string;
  onSelectPatch: (patch: string) => void;
  period: string;
  onSelectPeriod: (period: string) => void;
  patchPopoverOpen: boolean;
  onTogglePatchPopover: () => void;
  providers: ProviderMeta[];
  activeProviderId: string;
  onSelectProvider: (id: string) => void;
  providerOpen: boolean;
  onToggleProviderOpen: () => void;
  lcuMessage: string;
  lcuConnected: boolean;
  onBack: () => void;
  onForward: () => void;
  onNavigate: (route: BaronRoute) => void;
}

export function TopCommandBar({
  searchQuery,
  onSearchChange,
  patch,
  onSelectPatch,
  period,
  onSelectPeriod,
  patchPopoverOpen,
  onTogglePatchPopover,
  providers,
  activeProviderId,
  onSelectProvider,
  providerOpen,
  onToggleProviderOpen,
  lcuMessage,
  lcuConnected,
  onBack,
  onForward,
  onNavigate,
}: TopCommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0];

  useEffect(() => {
    const handleKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <header className="relative z-40 flex h-11 shrink-0 items-center justify-between border-b border-baron-border bg-baron-sidebar px-4">
      {/* Left History Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          title="Back"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-baron-surface hover:text-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onForward}
          title="Forward"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-baron-surface hover:text-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Refresh Data"
          onClick={() => onSelectPatch(patch)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-baron-surface hover:text-slate-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Centered Ctrl+K Command Search Bar */}
      <div className="flex h-8 w-[440px] items-center gap-2 rounded-md border border-baron-border bg-baron-surface px-2.5 focus-within:border-baron-accent">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search a player, a champion, a team, a pro..."
          className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-1">
          <kbd className="rounded border border-baron-border-strong bg-baron-elevated px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            Ctrl
          </kbd>
          <kbd className="rounded border border-baron-border-strong bg-baron-elevated px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            K
          </kbd>
        </div>
      </div>

      {/* Right Action Pills: Patch/Period Popover, API Provider Mode Dropdown, LCU Status */}
      <div className="flex items-center gap-2">
        {/* Patch & Period Trigger + Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={onTogglePatchPopover}
            className="flex h-7 items-center gap-1.5 rounded-md border border-baron-border bg-baron-surface px-2.5 text-xs font-semibold text-slate-200 transition hover:border-baron-border-strong"
          >
            <span>Patch {patch}</span>
            <span className="text-[10px] text-slate-400">· {period}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {patchPopoverOpen && (
            <div className="absolute right-0 top-9 z-50 w-[280px] rounded-xl border border-baron-border-strong bg-[#0D1017] p-3 shadow-2xl">
              <div className="mb-2 text-[10px] font-bold tracking-wider text-slate-400">
                PERIOD
              </div>
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {AVAILABLE_PERIODS.map((p) => {
                  const active = period === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onSelectPeriod(p)}
                      className={cn(
                        "h-8 rounded-md text-xs font-medium transition",
                        active
                          ? "bg-[#3A3D4B] font-bold text-white ring-1 ring-slate-500/50"
                          : "bg-[#1A1D26] text-slate-300 hover:bg-[#232735]",
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <div className="mb-2 text-[10px] font-bold tracking-wider text-slate-400">
                PATCH
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {AVAILABLE_PATCHES.map((ver) => {
                  const active = patch === ver;
                  return (
                    <button
                      key={ver}
                      type="button"
                      onClick={() => {
                        onSelectPatch(ver);
                        onTogglePatchPopover();
                      }}
                      className={cn(
                        "h-8 rounded-md text-xs font-medium transition",
                        active
                          ? "bg-[#3A3D4B] font-bold text-white ring-1 ring-slate-500/50"
                          : "bg-[#1A1D26] text-slate-300 hover:bg-[#232735]",
                      )}
                    >
                      {ver}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* API Provider Mode Dropdown (OP.GG #1 -> U.GG #2 -> ...) */}
        <div className="relative">
          <button
            type="button"
            onClick={onToggleProviderOpen}
            className="flex h-7 items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/15 px-2.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <span>API: {activeProvider?.label ?? "OP.GG"}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {providerOpen && (
            <div className="absolute right-0 top-9 z-50 w-[240px] rounded-xl border border-baron-border-strong bg-[#0D1017] p-2 shadow-2xl">
              <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400">
                API PROVIDER MODE
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {providers.map((prov) => {
                  const active = prov.id === activeProviderId;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => {
                        onSelectProvider(prov.id);
                        onToggleProviderOpen();
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition",
                        active
                          ? "bg-indigo-500/20 font-bold text-white ring-1 ring-indigo-500/50"
                          : "text-slate-300 hover:bg-baron-elevated",
                      )}
                    >
                      <span>{prov.label}</span>
                      <span className="text-[10px] text-slate-400">{prov.roleTag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* LCU Connection Pill */}
        <div
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold",
            lcuConnected
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
              : "border-indigo-500/35 bg-indigo-500/15 text-indigo-300",
          )}
          title={lcuMessage}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              lcuConnected ? "bg-emerald-400" : "bg-indigo-400",
            )}
          />
          <span>{lcuConnected ? "LCU Live" : "LCU Ready"}</span>
        </div>

        <button
          type="button"
          title="Data Studio & API Settings"
          onClick={() => onNavigate("datastudio")}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-baron-surface hover:text-slate-100"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
