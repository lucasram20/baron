"use client";

import type { ReactNode } from "react";
import { User } from "lucide-react";
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
  { route: "dashboard", label: "Dashboard", icon: <SidebarDashboardIcon className="h-[16px] w-[16px]" /> },
  { route: "tierlist", label: "Tierlist & Builds", icon: <SidebarTierlistIcon className="h-[16px] w-[16px]" /> },
  { route: "leaderboards", label: "Leaderboards", icon: <SidebarLeaderboardIcon className="h-[16px] w-[16px]" /> },
];

const APP_NAV: NavItem[] = [
  { route: "spectate", label: "Spectate", icon: <SidebarSpectateIcon className="h-[16px] w-[16px]" /> },
  { route: "collections", label: "Collections", icon: <SidebarCollectionsIcon className="h-[16px] w-[16px]" /> },
];

const INSIGHTS_NAV: NavItem[] = [
  { route: "datastudio", label: "Data Studio", icon: <SidebarDataStudioIcon className="h-[16px] w-[16px]" /> },
];

const INGAME_NAV: NavItem[] = [
  {
    route: "champselect",
    label: "Champ Select",
    icon: <SidebarChampSelectIcon className="h-[16px] w-[16px]" />,
    isInGame: true,
  },
  {
    route: "postgame",
    label: "Post-game",
    icon: <SidebarPostGameIcon className="h-[16px] w-[16px]" />,
    isInGame: true,
  },
];

function NavSection({
  title,
  items,
  activeRoute,
  onSelectRoute,
  collapsed,
  topSpacing = false,
}: {
  title: string;
  items: NavItem[];
  activeRoute: BaronRoute;
  onSelectRoute: (route: BaronRoute) => void;
  collapsed: boolean;
  topSpacing?: boolean;
}) {
  return (
    <div className={topSpacing ? "mt-3.5" : undefined}>
      {collapsed ? (
        <div className="mx-auto my-2 h-px w-4 bg-baron-border" aria-hidden="true" />
      ) : (
        <div className="mb-1 px-2.5 text-[10px] font-bold tracking-[0.09em] text-baron-ink-muted uppercase">
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
              onClick={() => onSelectRoute(item.route)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex w-full items-center ${
                collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-[7px]"
              } rounded-[7px] text-left text-[13px] transition-colors ${
                isActive
                  ? "bg-baron-surface font-semibold text-baron-ink shadow-[inset_0_0_0_1px_var(--baron-border)]"
                  : item.isInGame
                    ? "font-medium text-baron-accent-soft hover:bg-baron-hover/65 hover:text-baron-ink"
                    : "font-medium text-baron-ink-secondary hover:bg-baron-hover/65 hover:text-baron-ink"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1.5 bottom-1.5 left-0 w-[2.5px] rounded-r-full transition-all duration-150 ${
                  isActive
                    ? "bg-baron-accent opacity-100"
                    : "bg-baron-border-strong opacity-0 group-hover:opacity-70"
                }`}
              />

              <span
                className={`shrink-0 transition-colors ${
                  isActive
                    ? "text-baron-accent-soft"
                    : item.isInGame
                      ? "text-baron-accent-soft"
                      : "text-baron-ink-muted group-hover:text-baron-ink-secondary"
                }`}
              >
                {item.icon}
              </span>

              {!collapsed && (
                <span className="min-w-0 flex-1 truncate transition-transform duration-150 group-hover:translate-x-[2px]">
                  {item.label}
                </span>
              )}

              {item.isInGame && !collapsed && (
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isActive ? "bg-baron-emerald" : "bg-baron-accent-soft/75"
                  }`}
                />
              )}
            </button>
          );

          if (!collapsed) {
            return button;
          }

          return (
            <Tooltip key={item.route} delayDuration={120}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={8}
                showArrow={false}
                className="border border-baron-border-strong bg-baron-elevated px-2.5 py-1 text-[11.5px] font-medium text-baron-ink shadow-lg"
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
  return (
    <TooltipProvider>
      <aside
        aria-label="Primary navigation"
        className={`flex h-full shrink-0 flex-col bg-baron-chrome transition-[width] duration-200 ease-out select-none ${
          collapsed ? "w-[58px]" : "w-[204px]"
        }`}
      >
        <nav className="flex-1 overflow-y-auto px-2 pt-2.5 pb-2">
          <NavSection
            title="Baron Core"
            items={CORE_NAV}
            activeRoute={activeRoute}
            onSelectRoute={onSelectRoute}
            collapsed={collapsed}
          />
          <NavSection
            title="Baron App"
            items={APP_NAV}
            activeRoute={activeRoute}
            onSelectRoute={onSelectRoute}
            collapsed={collapsed}
            topSpacing
          />
          <NavSection
            title="Insights"
            items={INSIGHTS_NAV}
            activeRoute={activeRoute}
            onSelectRoute={onSelectRoute}
            collapsed={collapsed}
            topSpacing
          />
          <NavSection
            title="In Game"
            items={INGAME_NAV}
            activeRoute={activeRoute}
            onSelectRoute={onSelectRoute}
            collapsed={collapsed}
            topSpacing
          />
        </nav>

        {/* Bottom Active Summoner or Search Trigger */}
        <div className="border-t border-baron-border p-2">
          <Tooltip delayDuration={120}>
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
                } rounded-lg transition-colors hover:bg-baron-surface`}
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
                    <span className="absolute -top-1 -left-1 rounded bg-baron-accent px-1 py-[1px] text-[8px] leading-none font-bold text-white uppercase">
                      {activeSummoner.region}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-baron-border bg-baron-surface text-baron-ink-muted">
                    <User className="h-4 w-4" />
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
                className="border border-baron-border-strong bg-baron-elevated px-2.5 py-1 text-[11.5px] font-medium text-baron-ink shadow-lg"
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
