"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  Crown,
  Database,
  Eye,
  Home,
  Layers,
  Sparkles,
  Swords,
} from "lucide-react";
import { champSquareUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { BaronRoute } from "@/types/baron";

interface SidebarProps {
  activeRoute: BaronRoute;
  onSelectRoute: (route: BaronRoute) => void;
  ddVersion: string;
}

interface NavItem {
  route: BaronRoute;
  label: string;
  icon: ReactNode;
  isInGame?: boolean;
}

const CORE_NAV: NavItem[] = [
  { route: "dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  { route: "tierlist", label: "Tierlist & Builds", icon: <BarChart3 className="h-4 w-4" /> },
  { route: "leaderboards", label: "Leaderboards", icon: <Crown className="h-4 w-4" /> },
];

const APP_NAV: NavItem[] = [
  { route: "spectate", label: "Spectate", icon: <Eye className="h-4 w-4" /> },
  { route: "collections", label: "Collections", icon: <Layers className="h-4 w-4" /> },
];

const INSIGHTS_NAV: NavItem[] = [
  { route: "datastudio", label: "Data Studio", icon: <Database className="h-4 w-4" /> },
];

const IN_GAME_NAV: NavItem[] = [
  {
    route: "champselect",
    label: "Champ Select",
    icon: <Sparkles className="h-4 w-4" />,
    isInGame: true,
  },
  {
    route: "postgame",
    label: "Post-game",
    icon: <Swords className="h-4 w-4" />,
    isInGame: true,
  },
];

export function Sidebar({ activeRoute, onSelectRoute, ddVersion }: SidebarProps) {
  const renderItem = (item: NavItem) => {
    const active = activeRoute === item.route;
    return (
      <button
        key={item.route}
        type="button"
        onClick={() => onSelectRoute(item.route)}
        className={cn(
          "group relative flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium transition-colors",
          active
            ? item.isInGame
              ? "bg-amber-500/15 text-slate-50"
              : "bg-indigo-500/15 text-slate-50"
            : "text-slate-400 hover:bg-baron-surface hover:text-slate-100",
        )}
      >
        {active && (
          <span
            className={cn(
              "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r",
              item.isInGame ? "bg-baron-gold" : "bg-baron-accent",
            )}
          />
        )}
        <span
          className={cn(
            "shrink-0",
            active
              ? item.isInGame
                ? "text-baron-gold"
                : "text-baron-accent-soft"
              : "text-slate-400 group-hover:text-slate-200",
          )}
        >
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="flex h-full w-[204px] shrink-0 flex-col justify-between border-r border-baron-border bg-baron-sidebar p-3 select-none">
      <div className="flex flex-col gap-5">
        {/* Top Brand Header with Transparent Baron Logo */}
        <div className="flex items-center gap-2.5 px-1 pt-0.5">
          <img
            src="/baron_logo.png"
            alt="Baron"
            className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(99,102,241,0.45)]"
          />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-extrabold tracking-tight text-slate-50">
              BARON
            </span>
            <span className="mt-1 text-[10px] font-semibold tracking-wider text-slate-500">
              APP V0.1.0
            </span>
          </div>
        </div>

        {/* BARON CORE */}
        <div className="flex flex-col gap-1">
          <span className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-500">
            BARON CORE
          </span>
          {renderItem(CORE_NAV[0])}
          <button
            type="button"
            onClick={() => onSelectRoute("dashboard")}
            className="ml-4 flex items-center gap-2 rounded px-2 py-1 text-left text-xs text-slate-300 transition hover:bg-baron-surface"
          >
            <img
              src={champSquareUrl("Ahri", ddVersion)}
              alt="Nyx"
              className="h-4 w-4 rounded-sm object-cover ring-1 ring-baron-border"
            />
            <span className="truncate font-semibold">Nyx</span>
            <span className="text-[10px] text-slate-500">#DPM</span>
          </button>
          {CORE_NAV.slice(1).map(renderItem)}
        </div>

        {/* BARON APP */}
        <div className="flex flex-col gap-1">
          <span className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-500">
            BARON APP
          </span>
          {APP_NAV.map(renderItem)}
        </div>

        {/* BARON INSIGHTS */}
        <div className="flex flex-col gap-1">
          <span className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-500">
            BARON INSIGHTS
          </span>
          {INSIGHTS_NAV.map(renderItem)}
        </div>

        {/* IN GAME */}
        <div className="flex flex-col gap-1">
          <span className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-500">
            IN GAME
          </span>
          {IN_GAME_NAV.map(renderItem)}
        </div>
      </div>

      {/* Bottom Pinned Summoner Profile Card */}
      <button
        type="button"
        onClick={() => onSelectRoute("dashboard")}
        className="flex items-center gap-2.5 rounded-lg border border-baron-border bg-baron-surface p-2 text-left transition hover:border-baron-border-strong"
      >
        <div className="relative shrink-0">
          <img
            src={champSquareUrl("Ahri", ddVersion)}
            alt="Hide on bush"
            className="h-10 w-10 rounded-md object-cover ring-1 ring-amber-500/40"
          />
          <span className="absolute -top-1.5 -left-1.5 rounded bg-indigo-500 px-1 text-[9px] font-bold text-white">
            KR
          </span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-baron-canvas px-1 text-[9px] font-bold text-slate-300 ring-1 ring-baron-border">
            684
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-slate-100">Hide on bush</div>
          <div className="text-[11px] text-slate-400">#KR1</div>
          <div className="mt-0.5 text-[10px] font-bold tracking-wide text-baron-cyan">
            ◆ CHALLENGER
          </div>
        </div>
      </button>
    </aside>
  );
}
