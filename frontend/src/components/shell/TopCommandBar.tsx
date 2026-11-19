"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCw,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import type { BaronRoute } from "@/components/shell/Sidebar";
import { AVAILABLE_PATCHES, AVAILABLE_PERIODS } from "@/lib/ddragon";
import {
  isProviderAvailable,
  isTauriRuntime,
  type OpggRegionOption,
  type ProviderMeta,
} from "@/lib/tauri";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface TopCommandBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  patch: string;
  availablePatches?: string[];
  opggPatches?: string[];
  patchSyncedLive?: boolean;
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
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onRefresh?: () => void;
  onBack: () => void;
  onForward: () => void;
  onNavigate: (route: BaronRoute) => void;
  onLookupSummoner?: (gameName: string, tagLine: string, region: string) => void;
  regions?: OpggRegionOption[];
}

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Warm Light mode", icon: Sun },
  { id: "dark", label: "Dark Warm mode", icon: Moon },
  { id: "system", label: "Match OS theme", icon: Monitor },
];

const QUICK_ROUTES: { route: BaronRoute; label: string; hint: string }[] = [
  { route: "dashboard", label: "Dashboard", hint: "Live OP.GG summoner profile & matches" },
  { route: "tierlist", label: "Tierlist & Builds", hint: "Live OP.GG lane rankings & champion builds" },
  {
    route: "leaderboards",
    label: "Champion Master+",
    hint: "OP.GG Champion Master+ specialists across all 15 regions",
  },
  { route: "champselect", label: "Champ Select", hint: "Live OP.GG matchup builds & LCU rune push" },
  { route: "postgame", label: "Post-game", hint: "Live OP.GG match scoreboard & analysis" },
  { route: "spectate", label: "Spectate", hint: "OP.GG esports results & LCU spectate" },
  { route: "collections", label: "Collections", hint: "Live OP.GG skin sales & LCU inventory" },
  { route: "datastudio", label: "Data Studio", hint: "Providers, appearance & cache" },
];

const emptySubscribe = () => () => {};

function useIsDesktopHost(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => isTauriRuntime(),
    () => false,
  );
}

export function TopCommandBar({
  searchQuery,
  onSearchChange,
  patch,
  availablePatches,
  opggPatches = [],
  patchSyncedLive = false,
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
  sidebarCollapsed,
  onToggleSidebar,
  onRefresh,
  onBack,
  onForward,
  onNavigate,
  onLookupSummoner,
  regions = [],
}: TopCommandBarProps) {
  const { preference, osTheme, setPreference } = useTheme();
  const reducedMotion = Boolean(useReducedMotion());
  const isDesktop = useIsDesktopHost();
  const [maximized, setMaximized] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const activeProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0];
  const patchChoices =
    availablePatches && availablePatches.length > 0 ? availablePatches : [...AVAILABLE_PATCHES];

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    import("@tauri-apps/api/window")
      .then(async ({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        const max = await win.isMaximized().catch(() => false);
        if (!cancelled) setMaximized(max);
        unlisten = await win
          .onResized(async () => {
            const nextMax = await win.isMaximized().catch(() => false);
            if (!cancelled) setMaximized(nextMax);
          })
          .catch(() => undefined);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [isDesktop]);

  const handleMinimize = () => {
    if (!isDesktop) return;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().minimize())
      .catch(() => {});
  };

  const handleToggleMaximize = () => {
    if (!isDesktop) return;
    import("@tauri-apps/api/window")
      .then(async ({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        await win.toggleMaximize();
        const nextMax = await win.isMaximized().catch(() => false);
        setMaximized(nextMax);
      })
      .catch(() => {});
  };

  const handleClose = () => {
    if (!isDesktop) return;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().close())
      .catch(() => {});
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) handleToggleMaximize();
      }}
      className="relative z-40 flex h-[44px] w-full shrink-0 items-center justify-between gap-2 bg-baron-chrome px-2.5 select-none"
    >
      {/* Left Brand + Sidebar Toggle + History Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-baron-hover/60"
          aria-label="Go to Baron Dashboard"
        >
          <img
            src="/baron_logo.png"
            alt="Baron mascot"
            className="h-6 w-6 object-contain"
          />
          {!sidebarCollapsed && (
            <div className="flex items-baseline gap-1.5 pr-1">
              <span className="text-[13px] font-extrabold tracking-[-0.02em] text-baron-ink">
                BARON
              </span>
              <span className="text-[9.5px] font-semibold tracking-[0.06em] text-baron-ink-muted uppercase">
                v0.2.0
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-baron-border bg-baron-surface text-baron-ink-secondary shadow-[inset_0_1px_0_var(--baron-top-sheen)] transition-colors hover:border-baron-border-strong hover:text-baron-ink"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="ml-0.5 flex items-center gap-0.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Navigate back"
            className="flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-muted transition-colors hover:bg-baron-surface hover:text-baron-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onForward}
            aria-label="Navigate forward"
            className="flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-muted transition-colors hover:bg-baron-surface hover:text-baron-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh active view"
            className="group flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-muted transition-colors hover:bg-baron-surface hover:text-baron-ink"
          >
            <RotateCw className="h-3.5 w-3.5 transition-transform duration-300 group-active:rotate-180" />
          </button>
        </div>
      </div>

      {/* Draggable Titlebar Spacer (Left) */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="h-full min-w-[8px] flex-1"
      />

      {/* Center Command Search Trigger */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="group flex h-[30px] w-full max-w-[390px] min-w-[200px] items-center justify-between gap-2 rounded-lg border border-baron-border bg-baron-surface/95 px-2.5 text-left text-[12px] text-baron-ink-muted shadow-[inset_0_1px_0_var(--baron-top-sheen)] transition-all duration-150 hover:border-baron-border-strong hover:bg-baron-surface hover:text-baron-ink-secondary"
        aria-label="Open global command palette (Ctrl+K)"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 shrink-0 text-baron-ink-muted transition-colors group-hover:text-baron-accent-soft" />
          <span className="truncate">
            {searchQuery.trim()
              ? `Search: ${searchQuery}`
              : "Search player, champion, or command..."}
          </span>
        </span>
        <KbdGroup className="shrink-0">
          <Kbd className="h-[18px] border border-baron-border-strong/70 bg-baron-elevated px-1.5 text-[10px] text-baron-ink-secondary">
            Ctrl
          </Kbd>
          <Kbd className="h-[18px] border border-baron-border-strong/70 bg-baron-elevated px-1.5 text-[10px] text-baron-ink-secondary">
            K
          </Kbd>
        </KbdGroup>
      </button>

      {/* Draggable Titlebar Spacer (Right) */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="h-full min-w-[8px] flex-1"
      />

      {/* Right Utility Cluster */}
      <div className="flex items-center gap-1.5">
        {/* Patch & Period Selector (@shadcn/popover) */}
        <Popover
          open={patchPopoverOpen}
          onOpenChange={(open) => {
            if (open && providerOpen) onToggleProviderOpen();
            if (open !== patchPopoverOpen) onTogglePatchPopover();
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-expanded={patchPopoverOpen}
              className="flex h-[28px] items-center gap-1.5 rounded-md border border-baron-border bg-baron-surface px-2.5 text-[11.5px] font-medium text-baron-ink shadow-[inset_0_1px_0_var(--baron-top-sheen)] transition-colors hover:border-baron-border-strong"
            >
              <span className="text-baron-ink-muted">Patch</span>
              <span className="font-semibold tnum">{patch}</span>
              <span className="text-baron-ink-muted">·</span>
              <span className="text-baron-ink-secondary">{period}</span>
              <ChevronDown
                className={`h-3 w-3 text-baron-ink-muted transition-transform duration-150 ${
                  patchPopoverOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="baron-popover-surface w-[280px] rounded-xl border border-baron-border-strong bg-baron-surface/95 p-3 backdrop-blur-md"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-[0.08em] text-baron-ink-muted uppercase">
                Patch Version
              </span>
              {patchSyncedLive && (
                <span className="inline-flex items-center gap-1 rounded bg-baron-emerald/15 px-1.5 py-0.5 text-[9.5px] font-semibold text-baron-emerald">
                  <span className="h-1.5 w-1.5 rounded-full bg-baron-emerald" aria-hidden="true" />
                  Auto-synced
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {patchChoices.slice(0, 8).map((p) => {
                const selected = patch === p;
                const opggLive = opggPatches.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSelectPatch(p)}
                    title={
                      opggLive
                        ? `Patch ${p} — Live OP.GG & Data Dragon data`
                        : `Patch ${p} — Historical Data Dragon patch`
                    }
                    className={`relative flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold transition-colors tnum ${
                      selected
                        ? "bg-baron-accent text-white shadow-xs"
                        : "bg-baron-elevated text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink"
                    }`}
                  >
                    <span>{p}</span>
                    {opggLive && (
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${
                          selected ? "bg-white/90" : "bg-baron-emerald"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 mb-1.5 text-[10px] font-bold tracking-[0.08em] text-baron-ink-muted uppercase">
              Sample Window
            </div>
            <div className="grid grid-cols-3 gap-1">
              {AVAILABLE_PERIODS.map((per) => {
                const selected = period === per;
                return (
                  <button
                    key={per}
                    type="button"
                    onClick={() => onSelectPeriod(per)}
                    className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${
                      selected
                        ? "bg-baron-accent text-white shadow-xs"
                        : "bg-baron-elevated text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink"
                    }`}
                  >
                    {per}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10.5px] leading-snug text-baron-ink-muted">
              Auto-discovers the newest Riot &amp; OP.GG patch ({patchChoices[0]}). Green dot marks
              patches with live OP.GG analytics.
            </p>
          </PopoverContent>
        </Popover>

        {/* Provider API Dropdown (@shadcn/popover) */}
        <Popover
          open={providerOpen}
          onOpenChange={(open) => {
            if (open && patchPopoverOpen) onTogglePatchPopover();
            if (open !== providerOpen) onToggleProviderOpen();
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-expanded={providerOpen}
              className="flex h-[28px] items-center gap-1.5 rounded-md border border-baron-border bg-baron-surface px-2.5 text-[11.5px] font-medium text-baron-ink shadow-[inset_0_1px_0_var(--baron-top-sheen)] transition-colors hover:border-baron-border-strong"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-baron-emerald" aria-hidden="true" />
              <span className="text-baron-ink-muted">API:</span>
              <span className="font-semibold text-baron-ink">
                {activeProvider?.label ?? "OP.GG"}
              </span>
              <ChevronDown
                className={`h-3 w-3 text-baron-ink-muted transition-transform duration-150 ${
                  providerOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="baron-popover-surface w-[274px] rounded-xl border border-baron-border-strong bg-baron-surface/95 p-2 backdrop-blur-md"
          >
            <div className="px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-baron-ink-muted uppercase">
              Data Provider Mode
            </div>

            <div className="mt-1 space-y-0.5" role="menu" aria-label="Data provider mode">
              {providers.map((p) => {
                const available = isProviderAvailable(p.id);
                const active = p.id === activeProviderId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={!available}
                    onClick={() => {
                      if (!available) return;
                      onSelectProvider(p.id);
                      onToggleProviderOpen();
                    }}
                    title={
                      available
                        ? `${p.label} live tier-list & builds integration`
                        : p.id === "merakicdn"
                          ? "Meraki CDN champion kit & ability data is live inside Champion Builds (does not publish winrate tier lists)"
                          : `${p.label} is gated behind Cloudflare Managed Challenge (HTTP 403) — Baron never bypasses challenges`
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors ${
                      available
                        ? active
                          ? "bg-baron-accent/15 text-baron-ink shadow-[inset_0_0_0_1px_rgba(242,149,96,0.42)]"
                          : "text-baron-ink hover:bg-baron-elevated"
                        : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${
                          available
                            ? "bg-baron-emerald"
                            : p.id === "merakicdn"
                              ? "bg-baron-cyan"
                              : "bg-baron-ink-muted"
                        }`}
                      />
                      <span className="font-semibold">{p.label}</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      {available ? (
                        <>
                          <span className="rounded bg-baron-emerald/15 px-1.5 py-0.5 text-[10px] font-semibold text-baron-emerald">
                            Available
                          </span>
                          {active && <Check className="h-3.5 w-3.5 text-baron-accent-soft" />}
                        </>
                      ) : p.id === "merakicdn" ? (
                        <span className="rounded bg-baron-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-baron-cyan">
                          Kit Available
                        </span>
                      ) : (
                        <span className="rounded bg-baron-elevated px-1.5 py-0.5 text-[10px] font-medium text-baron-ink-muted">
                          CF Gated
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 border-t border-baron-border pt-2">
              <button
                type="button"
                onClick={() => {
                  onToggleProviderOpen();
                  onNavigate("datastudio");
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] font-semibold text-baron-accent-soft transition-colors hover:bg-baron-elevated"
              >
                <span>Inspect endpoints in Data Studio</span>
                <span>→</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 3-State Theme Switcher with MagicUI View Transition circular wipe */}
        <div
          role="group"
          aria-label="Color theme"
          className="flex h-[28px] items-center rounded-md border border-baron-border bg-baron-surface p-0.5 shadow-[inset_0_1px_0_var(--baron-top-sheen)]"
        >
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = preference === opt.id;
            const tooltipLabel =
              opt.id === "system"
                ? `Match OS theme (OS: ${osTheme === "light" ? "Warm Light" : "Dark Warm"})`
                : opt.label;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => setPreference(opt.id, e.currentTarget)}
                aria-label={tooltipLabel}
                aria-pressed={active}
                title={tooltipLabel}
                className={`relative flex h-[22px] w-[24px] items-center justify-center rounded-[5px] transition-colors ${
                  active ? "text-white" : "text-baron-ink-muted hover:text-baron-ink-secondary"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="topbar-theme-pill"
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 520, damping: 38, mass: 0.55 }
                    }
                    className="absolute inset-0 rounded-[5px] bg-baron-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                  />
                )}
                <Icon className="relative z-10 h-3 w-3" />
              </button>
            );
          })}
        </div>

        {/* LCU Status Pill */}
        <div
          title={lcuMessage}
          className={`hidden h-[28px] items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold lg:flex ${
            lcuConnected
              ? "border-baron-emerald/35 bg-baron-emerald/12 text-baron-emerald"
              : "border-baron-border bg-baron-surface text-baron-ink-secondary shadow-[inset_0_1px_0_var(--baron-top-sheen)]"
          }`}
        >
          <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden="true">
            {lcuConnected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-baron-emerald/60" />
            )}
            <span
              className={`relative h-1.5 w-1.5 rounded-full ${
                lcuConnected ? "bg-baron-emerald" : "bg-baron-gold"
              }`}
            />
          </span>
          <span>{lcuConnected ? "LCU Live" : "LCU Offline"}</span>
        </div>

        {/* Settings shortcut -> Data Studio */}
        <button
          type="button"
          onClick={() => onNavigate("datastudio")}
          aria-label="Open Data Studio settings"
          title="Data Studio settings"
          className="flex h-[28px] w-[28px] items-center justify-center rounded-md border border-baron-border bg-baron-surface text-baron-ink-secondary shadow-[inset_0_1px_0_var(--baron-top-sheen)] transition-colors hover:border-baron-border-strong hover:text-baron-ink"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        {/* Native-Matched Window Controls inside Tauri Desktop Host */}
        {isDesktop && (
          <div className="-mr-2.5 ml-1 flex h-[44px] items-center">
            <div className="mr-0.5 h-4 w-px bg-baron-border" aria-hidden="true" />
            <button
              type="button"
              onClick={handleMinimize}
              aria-label="Minimize window"
              title="Minimize"
              className="flex h-full w-[38px] items-center justify-center text-baron-ink-secondary transition-colors hover:bg-baron-hover hover:text-baron-ink"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleToggleMaximize}
              aria-label={maximized ? "Restore window" : "Maximize window"}
              title={maximized ? "Restore" : "Maximize"}
              className="flex h-full w-[38px] items-center justify-center text-baron-ink-secondary transition-colors hover:bg-baron-hover hover:text-baron-ink"
            >
              {maximized ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <rect
                    x="1.5"
                    y="3"
                    width="5.5"
                    height="5.5"
                    stroke="currentColor"
                    strokeWidth="1.15"
                  />
                  <path d="M3.2 3V1.5H8.5V6.8H7" stroke="currentColor" strokeWidth="1.15" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <rect
                    x="1.5"
                    y="1.5"
                    width="7"
                    height="7"
                    stroke="currentColor"
                    strokeWidth="1.15"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close window"
              title="Close"
              className="flex h-full w-[40px] items-center justify-center text-baron-ink-secondary transition-colors hover:bg-[#E11D48] hover:text-white"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path
                  d="M2 2L8 8M8 2L2 8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Ctrl+K Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput
          placeholder="Search Riot ID (Name#TAG), jump to view, or toggle sidebar..."
          value={searchQuery}
          onValueChange={onSearchChange}
        />
        <CommandList>
          <CommandEmpty>No matching commands or views.</CommandEmpty>
          {searchQuery.includes("#") && onLookupSummoner && (() => {
            const [namePart, tagPart] = searchQuery.split("#", 2);
            const gName = namePart.trim();
            const tLine = tagPart.trim();
            if (!gName || !tLine) return null;
            return (
              <CommandGroup heading={`Look up "${gName}#${tLine}" on OP.GG`}>
                {(regions.length > 0 ? regions : [{ code: "KR", label: "Korea (KR)" }]).map(
                  (reg) => (
                    <CommandItem
                      key={reg.code}
                      value={`${gName}#${tLine} ${reg.code} ${reg.label} lookup summoner`}
                      onSelect={() => {
                        onLookupSummoner(gName, tLine, reg.code);
                        onNavigate("dashboard");
                        setCommandOpen(false);
                      }}
                    >
                      <span className="font-semibold text-baron-ink">
                        Search {gName}#{tLine}
                      </span>
                      <span className="ml-auto rounded bg-baron-accent/15 px-1.5 py-0.5 text-[11px] font-bold text-baron-accent-soft">
                        {reg.label}
                      </span>
                    </CommandItem>
                  ),
                )}
              </CommandGroup>
            );
          })()}
          <CommandGroup heading="Views">
            {QUICK_ROUTES.map((item) => (
              <CommandItem
                key={item.route}
                value={`${item.label} ${item.hint}`}
                onSelect={() => {
                  onNavigate(item.route);
                  setCommandOpen(false);
                }}
              >
                <span className="font-semibold text-baron-ink">{item.label}</span>
                <span className="ml-auto text-[11px] text-baron-ink-muted">{item.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Workspace Actions">
            <CommandItem
              value="Toggle Sidebar Rail Collapse Expand"
              onSelect={() => {
                onToggleSidebar();
                setCommandOpen(false);
              }}
            >
              <span>{sidebarCollapsed ? "Expand Navigation Rail" : "Collapse Navigation Rail"}</span>
              <span className="ml-auto text-[11px] text-baron-ink-muted">Ctrl+B</span>
            </CommandItem>
            <CommandItem
              value="Switch Theme Dark Light System"
              onSelect={() => {
                setPreference(preference === "dark" ? "light" : "dark");
                setCommandOpen(false);
              }}
            >
              <span>Toggle Light / Dark Theme</span>
              <span className="ml-auto text-[11px] text-baron-ink-muted">
                Current: {preference}
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
