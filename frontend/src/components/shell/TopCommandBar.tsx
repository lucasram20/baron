"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Database,
  Eye,
  Home,
  Layers,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Swords,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AVAILABLE_PATCHES, AVAILABLE_PERIODS } from "@/lib/ddragon";
import { isProviderAvailable, type ProviderMeta } from "@/lib/tauri";
import { type ThemePreference, useTheme } from "@/lib/theme";
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

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light mode", icon: Sun },
  { id: "dark", label: "Cool-black dark", icon: Moon },
  { id: "system", label: "Use system default", icon: Monitor },
];

const QUICK_ROUTES: { route: BaronRoute; label: string; hint: string }[] = [
  { route: "champselect", label: "Champ Select", hint: "Live 5v5 draft & auto-runes" },
  { route: "postgame", label: "Post-game", hint: "Scoreboard, Baron Score & @14m curve" },
  { route: "tierlist", label: "Tierlist & Builds", hint: "Meta rankings & patch winrates" },
  { route: "spectate", label: "Spectate", hint: "Live high-elo Challenger games" },
  { route: "collections", label: "Collections", hint: "Skin vault & RP portfolio" },
  { route: "dashboard", label: "Dashboard", hint: "Summoner overview & LP delta" },
  { route: "leaderboards", label: "Leaderboards", hint: "Regional Challenger ladder" },
  { route: "datastudio", label: "Data Studio", hint: "Provider routing & LCU diagnostics" },
];

function RouteGlyph({ route }: { route: BaronRoute }) {
  switch (route) {
    case "champselect":
      return <Sparkles className="h-4 w-4 text-baron-gold" />;
    case "postgame":
      return <Swords className="h-4 w-4 text-baron-gold" />;
    case "tierlist":
      return <BarChart3 className="h-4 w-4 text-baron-accent-soft" />;
    case "spectate":
      return <Eye className="h-4 w-4 text-baron-cyan" />;
    case "collections":
      return <Layers className="h-4 w-4 text-baron-ace" />;
    case "leaderboards":
      return <Crown className="h-4 w-4 text-baron-gold" />;
    case "datastudio":
      return <Database className="h-4 w-4 text-baron-ink-secondary" />;
    default:
      return <Home className="h-4 w-4 text-baron-ink-secondary" />;
  }
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
  const [commandOpen, setCommandOpen] = useState(false);
  const { preference, setPreference } = useTheme();
  const activeProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0];

  useEffect(() => {
    const handleKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (ev.key === "Escape") {
        if (patchPopoverOpen) onTogglePatchPopover();
        if (providerOpen) onToggleProviderOpen();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [patchPopoverOpen, providerOpen, onTogglePatchPopover, onToggleProviderOpen]);

  return (
    <>
      <header className="relative z-40 flex h-11 shrink-0 items-center justify-between border-b border-baron-border bg-baron-sidebar px-4">
        {/* Left History Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-secondary transition hover:bg-baron-hover hover:text-baron-ink"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Previous view</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onForward}
                aria-label="Forward"
                className="flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-secondary transition hover:bg-baron-hover hover:text-baron-ink"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Next view</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Refresh Data"
                onClick={() => onSelectPatch(patch)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-secondary transition hover:bg-baron-hover hover:text-baron-ink"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Refresh patch &amp; LCU state</TooltipContent>
          </Tooltip>
        </div>

        {/* Centered Ctrl+K Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex h-8 w-[420px] items-center justify-between gap-2 rounded-md border border-baron-border bg-baron-surface px-2.5 text-left transition hover:border-baron-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baron-accent"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-baron-ink-muted" />
            <span className="truncate text-xs text-baron-ink-muted">
              {searchQuery ? searchQuery : "Search a player, a champion, a team, a pro..."}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <kbd className="rounded border border-baron-border-strong bg-baron-elevated px-1.5 py-0.5 text-[10px] font-semibold text-baron-ink-secondary">
              Ctrl
            </kbd>
            <kbd className="rounded border border-baron-border-strong bg-baron-elevated px-1.5 py-0.5 text-[10px] font-semibold text-baron-ink-secondary">
              K
            </kbd>
          </span>
        </button>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1 divide-x divide-baron-border">
          {/* Patch & Period Trigger + Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={onTogglePatchPopover}
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-baron-ink transition hover:bg-baron-hover"
            >
              <span>Patch {patch}</span>
              <span className="text-[10px] text-baron-ink-muted">· {period}</span>
              <ChevronDown className="h-3.5 w-3.5 text-baron-ink-muted" />
            </button>

            {patchPopoverOpen && (
              <div className="absolute right-0 top-9 z-50 w-[280px] rounded-xl border border-baron-border-strong bg-baron-sidebar p-3 shadow-2xl">
                <div className="mb-2 text-[10px] font-bold tracking-wider text-baron-ink-muted">
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
                            ? "bg-baron-accent font-bold text-white"
                            : "bg-baron-elevated text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink",
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-2 text-[10px] font-bold tracking-wider text-baron-ink-muted">
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
                            ? "bg-baron-accent font-bold text-white"
                            : "bg-baron-elevated text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink",
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

          {/* API Provider Mode Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={onToggleProviderOpen}
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-baron-ink-secondary transition hover:bg-baron-hover hover:text-baron-ink"
            >
              <span>API: {activeProvider?.label ?? "OP.GG"}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {providerOpen && (
              <div className="absolute right-0 top-9 z-50 w-[240px] rounded-xl border border-baron-border-strong bg-baron-sidebar p-2 shadow-2xl">
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-baron-ink-muted">
                  API PROVIDER MODE
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {providers.map((prov) => {
                    const active = prov.id === activeProviderId;
                    const available = isProviderAvailable(prov.id);
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        disabled={!available}
                        title={available ? undefined : "Provider integration unavailable"}
                        onClick={() => {
                          onSelectProvider(prov.id);
                          onToggleProviderOpen();
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition",
                          !available
                            ? "cursor-not-allowed text-baron-ink-muted opacity-50"
                            : active
                              ? "bg-baron-accent/18 font-bold text-baron-ink ring-1 ring-baron-accent/50"
                              : "text-baron-ink-secondary hover:bg-baron-hover hover:text-baron-ink",
                        )}
                      >
                        <span>{prov.label}</span>
                        <span className="text-[10px] text-baron-ink-muted">{available ? "Tier list" : "Unavailable"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3-State Theme Switcher: Light / Cool-Black Dark / System */}
          <div
            role="group"
            aria-label="Theme preference"
            className="flex h-7 items-center px-1"
          >
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = preference === opt.id;
              return (
                <Tooltip key={opt.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setPreference(opt.id)}
                      aria-label={opt.label}
                      className={cn(
                        "flex h-5.5 w-6 items-center justify-center rounded transition",
                        active
                          ? "bg-baron-accent text-white"
                          : "text-baron-ink-muted hover:text-baron-ink",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{opt.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* LCU Connection Pill */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold",
                  lcuConnected
                    ? "border-baron-emerald/40 bg-baron-emerald/12 text-baron-emerald"
                    : "border-baron-accent/35 bg-baron-accent/12 text-baron-accent-soft",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    lcuConnected ? "bg-baron-emerald" : "bg-baron-accent-soft",
                  )}
                />
                <span>{lcuConnected ? "LCU Live" : "LCU Ready"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{lcuMessage}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Data Studio & Settings"
                onClick={() => onNavigate("datastudio")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-baron-ink-secondary transition hover:bg-baron-hover hover:text-baron-ink"
              >
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Data Studio &amp; Provider Diagnostics</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput
          value={searchQuery}
          onValueChange={onSearchChange}
          placeholder="Search a player, a champion, a view, or switch theme..."
        />
        <CommandList className="bg-baron-sidebar text-baron-ink">
          <CommandEmpty>No matching player, champion, or action.</CommandEmpty>
          <CommandGroup heading="Views">
            {QUICK_ROUTES.map((item) => (
              <CommandItem
                key={item.route}
                onSelect={() => {
                  onNavigate(item.route);
                  setCommandOpen(false);
                }}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2">
                  <RouteGlyph route={item.route} />
                  <span className="font-semibold">{item.label}</span>
                </span>
                <span className="text-[11px] text-baron-ink-muted">{item.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Pro Players & Summoners">
            {[
              { label: "Faker · T1 · Ahri", target: "spectate" as BaronRoute },
              { label: "Gumayusi · T1 · Jinx / Ashe", target: "champselect" as BaronRoute },
              { label: "Nyx#DPM · Ranked Solo/Duo (Victory +21 LP)", target: "postgame" as BaronRoute },
              { label: "Chovy · GEN · Lucian", target: "spectate" as BaronRoute },
            ].map((p) => (
              <CommandItem
                key={p.label}
                onSelect={() => {
                  onNavigate(p.target);
                  setCommandOpen(false);
                }}
              >
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Appearance Theme">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <CommandItem
                  key={opt.id}
                  onSelect={() => {
                    setPreference(opt.id);
                    setCommandOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{opt.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
