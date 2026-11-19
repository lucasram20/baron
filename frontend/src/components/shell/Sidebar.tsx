"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { User } from "lucide-react";
import { ProximityNavList } from "@/components/LineSidebar";
import {
  SidebarChampSelectIcon,
  SidebarCollectionsIcon,
  SidebarDashboardIcon,
  SidebarDataStudioIcon,
  SidebarLeaderboardIcon,
  SidebarPostGameIcon,
  SidebarSpectateIcon,
  SidebarTierlistIcon,
} from "@/components/icons/SidebarIcons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type BaronRoute =
  | "dashboard"
  | "tierlist"
  | "leaderboards"
  | "spectate"
  | "collections"
  | "datastudio"
  | "champselect"
  | "postgame";

export interface SidebarSummonerSummary {
  gameName: string;
  tagLine: string;
  region: string;
  tierLabel: string;
  profileImageUrl?: string;
  isLcuAccount?: boolean;
}

interface SidebarProps {
  activeRoute: BaronRoute;
  onSelectRoute: (route: BaronRoute) => void;
  collapsed: boolean;
  activeSummoner?: SidebarSummonerSummary | null;
  lcuConnected?: boolean;
  onProfileClick?: () => void;
}

interface NavItem {
  route: BaronRoute;
  label: string;
  icon: ReactNode;
  isInGame?: boolean;
}

const CORE_NAV: NavItem[] = [
  { route: "dashboard", label: "Dashboard", icon: <SidebarDashboardIcon className="h-[15.5px] w-[15.5px]" /> },
  { route: "tierlist", label: "Tierlist & Builds", icon: <SidebarTierlistIcon className="h-[15.5px] w-[15.5px]" /> },
  { route: "leaderboards", label: "Leaderboards", icon: <SidebarLeaderboardIcon className="h-[15.5px] w-[15.5px]" /> },
];

const APP_NAV: NavItem[] = [
  { route: "spectate", label: "Spectate", icon: <SidebarSpectateIcon className="h-[15.5px] w-[15.5px]" /> },
  { route: "collections", label: "Collections", icon: <SidebarCollectionsIcon className="h-[15.5px] w-[15.5px]" /> },
];

const INSIGHTS_NAV: NavItem[] = [
  { route: "datastudio", label: "Data Studio", icon: <SidebarDataStudioIcon className="h-[15.5px] w-[15.5px]" /> },
];

const INGAME_NAV: NavItem[] = [
  {
    route: "champselect",
    label: "Champ Select",
    icon: <SidebarChampSelectIcon className="h-[15.5px] w-[15.5px]" />,
    isInGame: true,
  },
  {
    route: "postgame",
    label: "Post-game",
    icon: <SidebarPostGameIcon className="h-[15.5px] w-[15.5px]" />,
    isInGame: true,
  },
];

function NavSection({
  title,
  items,
  activeRoute,
  onSelectRoute,
  collapsed,
  reducedMotion,
  topSpacing = false,
}: {
  title: string;
  items: NavItem[];
  activeRoute: BaronRoute;
  onSelectRoute: (route: BaronRoute) => void;
  collapsed: boolean;
  reducedMotion: boolean;
  topSpacing?: boolean;
}) {
  return (
    <div className={topSpacing ? "mt-4" : undefined}>
      {collapsed ? (
        <div className="mx-auto my-2 h-px w-4 bg-baron-border/80" aria-hidden="true" />
      ) : (
        <div className="mb-1.5 px-2.5 text-[11px] font-bold tracking-[0.08em] text-baron-ink-muted uppercase">
          {title}
        </div>
      )}

      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = activeRoute === item.route;

          const button = (
            <button
              key={item.route}
              type="button"
              data-proximity-item
              onClick={() => onSelectRoute(item.route)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex w-full items-center ${
                collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-[7px]"
              } rounded-[8px] text-left text-[12.5px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-baron-accent ${
                isActive
                  ? "font-semibold text-baron-ink"
                  : item.isInGame
                    ? "font-medium text-baron-accent-soft hover:bg-baron-hover/55 hover:text-baron-ink"
                    : "font-medium text-baron-ink-secondary hover:bg-baron-hover/55 hover:text-baron-ink"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="baron-sidebar-active-bg"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 40, mass: 0.55 }
                  }
                  className="pointer-events-none absolute inset-0 rounded-[8px] bg-baron-surface shadow-[inset_0_1px_0_var(--baron-top-sheen),inset_0_0_0_1px_var(--baron-border)]"
                />
              )}

              {/* Left proximity edge bar (@react-bits/LineSidebar driven by --effect) */}
              {isActive ? (
                <motion.span
                  layoutId="baron-sidebar-active-rail"
                  aria-hidden="true"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 40, mass: 0.55 }
                  }
                  className={`pointer-events-none absolute top-1.5 bottom-1.5 left-0 z-10 w-[2.5px] rounded-r-full ${
                    item.isInGame ? "bg-baron-gold" : "bg-baron-accent"
                  }`}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2 bottom-2 left-0 z-10 w-[2px] origin-center rounded-r-full bg-baron-accent/70 [opacity:calc(var(--effect,0)*0.75)] [transform:scaleY(calc(0.4+var(--effect,0)*0.6))]"
                />
              )}

              <span
                className={`relative z-10 shrink-0 transition-colors ${
                  isActive
                    ? item.isInGame
                      ? "text-baron-gold"
                      : "text-baron-accent-soft"
                    : item.isInGame
                      ? "text-baron-accent-soft/90"
                      : "text-baron-ink-muted group-hover:text-baron-ink-secondary"
                }`}
              >
                {item.icon}
              </span>

              {!collapsed && (
                <span className="relative z-10 min-w-0 flex-1 truncate [transform:translateX(calc(var(--effect,0)*3px))]">
                  {item.label}
                </span>
              )}

              {item.isInGame && !collapsed && (
                <span
                  aria-hidden="true"
                  className={`relative z-10 h-1.5 w-1.5 shrink-0 rounded-full ${
                    isActive ? "bg-baron-emerald" : "bg-baron-gold/75"
                  }`}
                />
              )}
            </button>
          );

          if (!collapsed) {
            return button;
          }

          return (
            <Tooltip key={item.route} delayDuration={100}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={8}
                showArrow={false}
                className="baron-popover-surface border border-baron-border-strong bg-baron-elevated px-2.5 py-1 text-[11.5px] font-medium text-baron-ink"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({
  activeRoute,
  onSelectRoute,
  collapsed,
  activeSummoner = null,
  lcuConnected = false,
  onProfileClick,
}: SidebarProps) {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <TooltipProvider>
      <aside
        aria-label="Primary navigation"
        className={`flex h-full shrink-0 flex-col bg-baron-chrome transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] select-none ${
          collapsed ? "w-[58px]" : "w-[204px]"
        }`}
      >
        <nav className="flex-1 overflow-y-auto px-2 pt-2.5 pb-2">
          <ProximityNavList disabled={collapsed} proximityRadius={92} smoothing={78}>
            <NavSection
              title="Baron Core"
              items={CORE_NAV}
              activeRoute={activeRoute}
              onSelectRoute={onSelectRoute}
              collapsed={collapsed}
              reducedMotion={reducedMotion}
            />
            <NavSection
              title="Baron App"
              items={APP_NAV}
              activeRoute={activeRoute}
              onSelectRoute={onSelectRoute}
              collapsed={collapsed}
              reducedMotion={reducedMotion}
              topSpacing
            />
            <NavSection
              title="Insights"
              items={INSIGHTS_NAV}
              activeRoute={activeRoute}
              onSelectRoute={onSelectRoute}
              collapsed={collapsed}
              reducedMotion={reducedMotion}
              topSpacing
            />
            <NavSection
              title="In Game"
              items={INGAME_NAV}
              activeRoute={activeRoute}
              onSelectRoute={onSelectRoute}
              collapsed={collapsed}
              reducedMotion={reducedMotion}
              topSpacing
            />
          </ProximityNavList>
        </nav>

        {/* Bottom Active Summoner or Search Trigger */}
        <div className="border-t border-baron-border/75 p-2">
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  if (onProfileClick) {
                    onProfileClick();
                  } else {
                    onSelectRoute("dashboard");
                  }
                }}
                className={`flex w-full items-center ${
                  collapsed ? "justify-center p-1" : "gap-2.5 px-2 py-1.5"
                } rounded-lg border border-transparent transition-all duration-150 hover:border-baron-border hover:bg-baron-surface hover:shadow-[inset_0_1px_0_var(--baron-top-sheen)]`}
                aria-label={
                  activeSummoner
                    ? `Open dashboard for ${activeSummoner.gameName}#${activeSummoner.tagLine}`
                    : "Search Riot ID on Dashboard"
                }
              >
                {activeSummoner?.profileImageUrl ? (
                  <div className="relative h-8 w-8 shrink-0">
                    <img
                      src={activeSummoner.profileImageUrl}
                      alt={activeSummoner.gameName}
                      className="h-8 w-8 rounded-md border border-baron-border-strong object-cover"
                    />
                    <span className="absolute -top-1 -left-1 rounded bg-baron-accent px-1 py-[1px] text-[8px] leading-none font-bold text-white uppercase shadow-xs">
                      {activeSummoner.region}
                    </span>
                  </div>
                ) : (
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-baron-border bg-baron-surface text-baron-ink-muted">
                    <User className="h-4 w-4" />
                    <span
                      aria-hidden="true"
                      className={`absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-baron-chrome ${
                        lcuConnected ? "bg-baron-emerald" : "bg-baron-gold/80"
                      }`}
                    />
                  </div>
                )}

                {!collapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    {activeSummoner ? (
                      <>
                        <div className="truncate text-[12px] font-semibold text-baron-ink">
                          {activeSummoner.gameName}
                        </div>
                        <div className="truncate text-[10.5px] font-medium text-baron-cyan tnum">
                          #{activeSummoner.tagLine} · {activeSummoner.tierLabel}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="truncate text-[12px] font-semibold text-baron-ink-secondary">
                          League Client
                        </div>
                        <div className="truncate text-[10.5px] text-baron-ink-muted">
                          {lcuConnected ? "Syncing account..." : "Offline · Search Riot ID"}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent
                side="right"
                sideOffset={8}
                showArrow={false}
                className="baron-popover-surface border border-baron-border-strong bg-baron-elevated px-2.5 py-1 text-[11.5px] font-medium text-baron-ink"
              >
                {activeSummoner
                  ? `${activeSummoner.gameName} #${activeSummoner.tagLine}`
                  : "Search Riot ID"}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
