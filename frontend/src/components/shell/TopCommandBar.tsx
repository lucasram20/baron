"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  { id: "light", label: "Light mode", icon: Sun },
  { id: "dark", label: "Dark mode", icon: Moon },
  { id: "system", label: "System theme", icon: Monitor },
];

const QUICK_ROUTES: { route: BaronRoute; label: string; hint: string }[] = [
  { route: "dashboard", label: "Dashboard", hint: "Live OP.GG summoner profile & matches" },
  { route: "tierlist", label: "Tierlist & Builds", hint: "Live OP.GG lane rankings & champion builds" },
  { route: "leaderboards", label: "Leaderboards", hint: "Live OP.GG Champion Master+ ladders" },
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
  const { preference, resolved, setPreference } = useTheme();
  const isDesktop = useIsDesktopHost();
  const [maximized, setMaximized] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const patchRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<HTMLDivElement>(null);

  const activeProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0];

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    import("@tauri-apps/api/window")
      .then(async ({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        win.setTheme(resolved === "dark" ? "dark" : "light").catch(() => {});
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
  }, [isDesktop, resolved]);

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
      } else if (e.key === "Escape") {
        if (patchPopoverOpen) onTogglePatchPopover();
        if (providerOpen) onToggleProviderOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [patchPopoverOpen, providerOpen, onTogglePatchPopover, onToggleProviderOpen]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (patchPopoverOpen && patchRef.current && !patchRef.current.contains(target)) {
        onTogglePatchPopover();
      }
      if (providerOpen && providerRef.current && !providerRef.current.contains(target)) {
        onToggleProviderOpen();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [patchPopoverOpen, providerOpen, onTogglePatchPopover, onToggleProviderOpen]);

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
            className="h-6 w-6 rounded-md object-contain"
          />
          {!sidebarCollapsed && (
            <div className="flex items-baseline gap-1.5 pr-1">
              <span className="text-[13px] font-extrabold tracking-[-0.02em] text-baron-ink">
                BARON
              </span>
              <span className="text-[9.5px] font-semibold tracking-[0.06em] text-baron-ink-muted uppercase">
                v0.1.0
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
          className="flex h-7 w-7 items-center justify-center rounded-md border border-baron-border bg-baron-surface text-baron-ink-secondary transition-colors hover:border-baron-border-strong hover:text-baron-ink"
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
            className="flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-muted transition-colors hover:bg-baron-surface hover:text-baron-ink"
          >
            <RotateCw className="h-3.5 w-3.5" />
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
        className="flex h-[30px] w-full max-w-[380px] min-w-[200px] items-center justify-between gap-2 rounded-lg border border-baron-border bg-baron-surface px-2.5 text-left text-[12px] text-baron-ink-muted transition-colors hover:border-baron-border-strong hover:text-baron-ink-secondary"
        aria-label="Open global command palette (Ctrl+K)"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 shrink-0 text-baron-ink-muted" />
          <span className="truncate">
            {searchQuery.trim()
              ? `Search: ${searchQuery}`
              : "Search player, champion, or command..."}
          </span>
        </span>
        <KbdGroup className="shrink-0">
          <Kbd className="h-[18px] bg-baron-elevated px-1.5 text-[10px] text-baron-ink-secondary">
            Ctrl
          </Kbd>
          <Kbd className="h-[18px] bg-baron-elevated px-1.5 text-[10px] text-baron-ink-secondary">
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
        {/* Patch & Period Selector */}
        <div className="relative" ref={patchRef}>
          <button
            type="button"
            onClick={() => {
              if (providerOpen) onToggleProviderOpen();
              onTogglePatchPopover();
            }}
            aria-expanded={patchPopoverOpen}
            aria-haspopup="dialog"
            className="flex h-[28px] items-center gap-1.5 rounded-md border border-baron-border bg-baron-surface px-2.5 text-[11.5px] font-medium text-baron-ink transition-colors hover:border-baron-border-strong"
          >
            <span className="text-baron-ink-muted">Patch</span>
            <span className="font-semibold tnum">{patch}</span>
            <span className="text-baron-ink-muted">·</span>
            <span className="text-baron-ink-secondary">{period}</span>
            <ChevronDown className="h-3 w-3 text-baron-ink-muted" />
          </button>

          {patchPopoverOpen && (
            <div
              role="dialog"
              aria-label="Patch and time window selector"
              className="absolute top-9 right-0 z-50 w-[264px] rounded-xl border border-baron-border-strong bg-baron-surface p-3 shadow-2xl"
            >
              <div className="mb-1.5 text-[10px] font-bold tracking-[0.08em] text-baron-ink-muted uppercase">
                Patch Version
              </div>
              <div className="grid grid-cols-4 gap-1">
                {AVAILABLE_PATCHES.slice(0, 8).map((p) => {
                  const selected = patch === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onSelectPatch(p)}
                      className={`rounded-md py-1 text-[11px] font-semibold transition-colors tnum ${
                        selected
                          ? "bg-baron-accent text-white"
                          : "bg-baron-elevated text-baron-ink-secondary hover:text-baron-ink"
                      }`}
                    >
                      {p}
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
                          ? "bg-baron-accent text-white"
                          : "bg-baron-elevated text-baron-ink-secondary hover:text-baron-ink"
                      }`}
                    >
                      {per}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[10.5px] leading-snug text-baron-ink-muted">
                Live OP.GG MCP tier lists and builds always reflect the current patch.
              </p>
            </div>
          )}
        </div>

        {/* Provider API Dropdown */}
        <div className="relative" ref={providerRef}>
          <button
            type="button"
            onClick={() => {
              if (patchPopoverOpen) onTogglePatchPopover();
              onToggleProviderOpen();
            }}
            aria-expanded={providerOpen}
            aria-haspopup="menu"
            className="flex h-[28px] items-center gap-1.5 rounded-md border border-baron-border bg-baron-surface px-2.5 text-[11.5px] font-medium text-baron-ink transition-colors hover:border-baron-border-strong"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-baron-emerald" aria-hidden="true" />
            <span className="text-baron-ink-muted">API:</span>
            <span className="font-semibold text-baron-ink">
              {activeProvider?.label ?? "OP.GG"}
            </span>
            <ChevronDown className="h-3 w-3 text-baron-ink-muted" />
          </button>

          {providerOpen && (
            <div
              role="menu"
              aria-label="Data provider mode"
              className="absolute top-9 right-0 z-50 w-[268px] rounded-xl border border-baron-border-strong bg-baron-surface p-2 shadow-2xl"
            >
              <div className="px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-baron-ink-muted uppercase">
                Data Provider Mode
              </div>

              <div className="mt-1 space-y-0.5">
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
                          ? `${p.label} live tier-list MCP integration`
                          : `${p.label} stays disabled until a verified integration is implemented`
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors ${
                        available
                          ? active
                            ? "bg-baron-accent/15 text-baron-ink"
                            : "text-baron-ink hover:bg-baron-elevated"
                          : "cursor-not-allowed opacity-45"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${
                            available ? "bg-baron-emerald" : "bg-baron-ink-muted"
                          }`}
                        />
                        <span className="font-semibold">{p.label}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        {available ? (
                          <>
                            <span className="rounded bg-baron-emerald/15 px-1.5 py-0.5 text-[10px] font-semibold text-baron-emerald">
                              Tier list
                            </span>
                            {active && <Check className="h-3.5 w-3.5 text-baron-accent-soft" />}
                          </>
                        ) : (
                          <span className="rounded bg-baron-elevated px-1.5 py-0.5 text-[10px] font-medium text-baron-ink-muted">
                            Unavailable
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
            </div>
          )}
        </div>

        {/* 3-State Theme Switcher */}
        <div
          role="group"
          aria-label="Color theme"
          className="flex h-[28px] items-center rounded-md border border-baron-border bg-baron-surface p-0.5"
        >
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = preference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPreference(opt.id)}
                aria-label={opt.label}
                aria-pressed={active}
                title={opt.label}
                className={`flex h-[22px] w-[24px] items-center justify-center rounded-[5px] transition-colors ${
                  active
                    ? "bg-baron-elevated text-baron-ink shadow-xs"
                    : "text-baron-ink-muted hover:text-baron-ink-secondary"
                }`}
              >
                <Icon className="h-3 w-3" />
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
              : "border-baron-border bg-baron-surface text-baron-ink-secondary"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              lcuConnected ? "bg-baron-emerald" : "bg-baron-gold"
            }`}
          />
          <span>{lcuConnected ? "LCU Live" : "LCU Offline"}</span>
        </div>

        {/* Settings shortcut -> Data Studio */}
        <button
          type="button"
          onClick={() => onNavigate("datastudio")}
          aria-label="Open Data Studio settings"
          title="Data Studio settings"
          className="flex h-[28px] w-[28px] items-center justify-center rounded-md border border-baron-border bg-baron-surface text-baron-ink-secondary transition-colors hover:border-baron-border-strong hover:text-baron-ink"
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
