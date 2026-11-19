"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sidebar, type BaronRoute, type SidebarSummonerSummary } from "@/components/shell/Sidebar";
import { TopCommandBar } from "@/components/shell/TopCommandBar";
import { BlurFade } from "@/components/ui/blur-fade";
import { ChampSelectView } from "@/components/views/ChampSelectView";
import { CollectionView } from "@/components/views/CollectionView";
import { PostGameView } from "@/components/views/PostGameView";
import {
  DashboardView,
  DataStudioView,
  LeaderboardsView,
} from "@/components/views/SecondaryViews";
import { SpectateView } from "@/components/views/SpectateView";
import { TierListView } from "@/components/views/TierListView";
import { LATEST_DDRAGON, LATEST_PATCH, profileIconUrl } from "@/lib/ddragon";
import {
  DEFAULT_PROVIDERS,
  fetchBootstrapData,
  fetchLcuPlayerContext,
  fetchOpggGameDetail,
  fetchOpggRegions,
  fetchOpggSummonerOverview,
  isTauriRuntime,
  type BaronBootstrapPayload,
  type LcuPlayerContext,
  type OpggGameDetailResponse,
  type OpggRegionOption,
  type OpggSummonerOverview,
  type TierRole,
} from "@/lib/tauri";

const SIDEBAR_STORAGE_KEY = "baron-sidebar-collapsed";
const sidebarListeners = new Set<() => void>();

function readSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSidebar(listener: () => void): () => void {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

function setSidebarCollapsedStorage(next: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Ignore storage quota or private browsing errors cleanly.
  }
  for (const listener of sidebarListeners) {
    listener();
  }
}

export default function BaronAppPage() {
  const [nav, setNav] = useState<{ stack: BaronRoute[]; index: number }>({
    stack: ["dashboard"],
    index: 0,
  });
  const route = nav.stack[nav.index] ?? "dashboard";

  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebar,
    readSidebarSnapshot,
    () => false,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [patch, setPatch] = useState(LATEST_PATCH);
  const [period, setPeriod] = useState("7 days");
  const [patchPopoverOpen, setPatchPopoverOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState("opgg");
  const [providerOpen, setProviderOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [bootstrap, setBootstrap] = useState<BaronBootstrapPayload | null>(null);
  const [lcuPlayer, setLcuPlayer] = useState<LcuPlayerContext | null>(null);
  const [supportedRegions, setSupportedRegions] = useState<OpggRegionOption[]>([]);

  const [summonerRegion, setSummonerRegion] = useState("KR");
  const [activeQuery, setActiveQuery] = useState<{
    gameName: string;
    tagLine: string;
    region: string;
  } | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [summonerData, setSummonerData] = useState<OpggSummonerOverview | null>(null);
  const [summonerLoading, setSummonerLoading] = useState(false);
  const [summonerError, setSummonerError] = useState<string | null>(null);

  const [gameDetail, setGameDetail] = useState<OpggGameDetailResponse | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);

  const [buildTarget, setBuildTarget] = useState<{ champion: string; role: TierRole } | null>(null);
  const autoSyncedKeyRef = useRef<string | null>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedStorage(!readSidebarSnapshot());
  }, []);

  const navigateTo = useCallback((nextRoute: BaronRoute) => {
    setNav((prev) => {
      const current = prev.stack[prev.index];
      if (current === nextRoute) return prev;
      const truncated = prev.stack.slice(0, prev.index + 1);
      const stack = [...truncated, nextRoute];
      return { stack, index: stack.length - 1 };
    });
  }, []);

  const handleBack = useCallback(() => {
    setNav((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
  }, []);

  const handleForward = useCallback(() => {
    setNav((prev) => ({ ...prev, index: Math.min(prev.stack.length - 1, prev.index + 1) }));
  }, []);

  const loadSummonerFromOpgg = useCallback(
    (gameName: string, tagLine: string, region: string) => {
      setSummonerRegion(region);
      setActiveQuery({ gameName, tagLine, region });
      setSummonerLoading(true);
      setSummonerError(null);
      fetchOpggSummonerOverview(gameName, tagLine, region)
        .then((res) => {
          setSummonerData(res);
          setSummonerLoading(false);
        })
        .catch((err: unknown) => {
          setSummonerData(null);
          setSummonerError(
            err instanceof Error ? err.message : "Failed to load summoner from OP.GG MCP.",
          );
          setSummonerLoading(false);
        });
    },
    [],
  );

  const handleLookupSummoner = useCallback(
    (gameName: string, tagLine: string, region: string) => {
      setManualOverride(true);
      navigateTo("dashboard");
      loadSummonerFromOpgg(gameName, tagLine, region);
    },
    [loadSummonerFromOpgg, navigateTo],
  );

  const handleSwitchToMyLcuAccount = useCallback(() => {
    if (!lcuPlayer?.connected || !lcuPlayer.gameName) return;
    setManualOverride(false);
    navigateTo("dashboard");
    loadSummonerFromOpgg(lcuPlayer.gameName, lcuPlayer.tagLine, lcuPlayer.opggRegion);
  }, [lcuPlayer, loadSummonerFromOpgg, navigateTo]);

  useEffect(() => {
    let cancelled = false;
    fetchBootstrapData(patch).then((payload) => {
      if (!cancelled) {
        setBootstrap(payload);
        if (payload.lcuPlayer) {
          setLcuPlayer(payload.lcuPlayer);
        }
      }
    });
    fetchOpggRegions()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setSupportedRegions(list);
        }
      })
      .catch(() => {
        // Non-Tauri web preview omits live IPC; desktop runtime loads regions via OP.GG MCP.
      });
    return () => {
      cancelled = true;
    };
  }, [patch]);

  // Poll LCU every 10 seconds in desktop mode so logging into League or entering Champ Select auto-syncs.
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let cancelled = false;
    const id = window.setInterval(() => {
      fetchLcuPlayerContext()
        .then((ctx) => {
          if (!cancelled) setLcuPlayer(ctx);
        })
        .catch(() => {
          // Ignore transient lockfile read errors while client starts up.
        });
    }, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Automatically sync the active League Client player's profile from OP.GG MCP (no login required).
  useEffect(() => {
    if (!lcuPlayer?.connected || !lcuPlayer.gameName || manualOverride) return;
    const key = `${lcuPlayer.gameName}#${lcuPlayer.tagLine}@${lcuPlayer.opggRegion}`;
    if (autoSyncedKeyRef.current === key) return;
    autoSyncedKeyRef.current = key;
    const t = window.setTimeout(() => {
      loadSummonerFromOpgg(lcuPlayer.gameName, lcuPlayer.tagLine, lcuPlayer.opggRegion);
    }, 0);
    return () => window.clearTimeout(t);
  }, [lcuPlayer, manualOverride, loadSummonerFromOpgg]);

  const handleRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
    fetchBootstrapData(patch).then((payload) => {
      setBootstrap(payload);
      setLcuPlayer(payload.lcuPlayer ?? null);
    });
    fetchOpggRegions()
      .then((list) => {
        if (Array.isArray(list)) setSupportedRegions(list);
      })
      .catch(() => {});
    if (activeQuery) {
      loadSummonerFromOpgg(activeQuery.gameName, activeQuery.tagLine, activeQuery.region);
    }
  }, [patch, activeQuery, loadSummonerFromOpgg]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const handleOpenMatch = useCallback(
    (gameId: string, createdAt: string) => {
      if (!activeQuery) return;
      setGameLoading(true);
      setGameError(null);
      navigateTo("postgame");
      fetchOpggGameDetail(
        activeQuery.gameName,
        activeQuery.tagLine,
        activeQuery.region,
        gameId,
        createdAt,
      )
        .then((res) => {
          setGameDetail(res);
          setGameLoading(false);
        })
        .catch((err: unknown) => {
          setGameDetail(null);
          setGameError(err instanceof Error ? err.message : "Failed to load OP.GG match detail.");
          setGameLoading(false);
        });
    },
    [activeQuery, navigateTo],
  );

  const ddVersion = bootstrap?.ddragonVersion || LATEST_DDRAGON;
  const providers = bootstrap?.providers || DEFAULT_PROVIDERS;
  const activeProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0];
  const lcuConnected = lcuPlayer?.connected ?? bootstrap?.lcuStatus.connected ?? false;
  const lcuMessage = lcuPlayer?.connected
    ? `LCU Connected (${lcuPlayer.gameName}${lcuPlayer.tagLine ? `#${lcuPlayer.tagLine}` : ""} · ${lcuPlayer.opggRegion})`
    : bootstrap?.lcuStatus.message ??
      "LCU Offline (Start League Client to auto-sync your Riot account)";

  const loadedSummoner = summonerData?.profile?.data?.summoner;
  const isViewingLcuAccount = Boolean(
    lcuPlayer?.connected &&
      (!activeQuery ||
        (activeQuery.gameName.toLowerCase() === lcuPlayer.gameName.toLowerCase() &&
          activeQuery.region.toUpperCase() === lcuPlayer.opggRegion.toUpperCase())),
  );

  const soloStat = loadedSummoner?.league_stats?.find((s) => s.game_type === "SOLORANKED");
  const lcuSolo = lcuPlayer?.soloRanked;

  const sidebarSummoner: SidebarSummonerSummary | null = lcuPlayer?.connected
    ? {
        gameName: lcuPlayer.gameName,
        tagLine: lcuPlayer.tagLine,
        region: lcuPlayer.opggRegion,
        tierLabel: lcuSolo?.tier
          ? `${lcuSolo.tier} ${lcuSolo.leaguePoints} LP`
          : soloStat?.tier_info?.tier
            ? `${soloStat.tier_info.tier} ${soloStat.tier_info.lp ?? 0} LP`
            : "Unranked",
        profileImageUrl: profileIconUrl(lcuPlayer.profileIconId || 1, ddVersion),
        isLcuAccount: true,
      }
    : loadedSummoner?.game_name
      ? {
          gameName: loadedSummoner.game_name,
          tagLine: loadedSummoner.tagline ?? "",
          region: loadedSummoner.region ?? summonerRegion,
          tierLabel: soloStat?.tier_info?.tier
            ? `${soloStat.tier_info.tier} ${soloStat.tier_info.lp ?? 0} LP`
            : "Unranked",
          profileImageUrl: loadedSummoner.profile_image_url,
          isLcuAccount: false,
        }
      : null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-baron-chrome text-baron-ink ring-1 ring-inset ring-baron-border/75">
      <TopCommandBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        patch={patch}
        onSelectPatch={setPatch}
        period={period}
        onSelectPeriod={setPeriod}
        patchPopoverOpen={patchPopoverOpen}
        onTogglePatchPopover={() => setPatchPopoverOpen((v) => !v)}
        providers={providers}
        activeProviderId={activeProviderId}
        onSelectProvider={setActiveProviderId}
        providerOpen={providerOpen}
        onToggleProviderOpen={() => setProviderOpen((v) => !v)}
        lcuMessage={lcuMessage}
        lcuConnected={lcuConnected}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onRefresh={handleRefresh}
        onBack={handleBack}
        onForward={handleForward}
        onNavigate={navigateTo}
        onLookupSummoner={handleLookupSummoner}
        regions={supportedRegions}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          activeRoute={route}
          onSelectRoute={(next) => {
            if (next === "tierlist") setBuildTarget(null);
            navigateTo(next);
          }}
          collapsed={sidebarCollapsed}
          activeSummoner={sidebarSummoner}
          lcuConnected={lcuConnected}
          onProfileClick={() => {
            if (lcuPlayer?.connected) {
              handleSwitchToMyLcuAccount();
            } else {
              navigateTo("dashboard");
            }
          }}
        />

        <main className="baron-inset-shell min-w-0 flex-1 overflow-y-auto rounded-tl-[14px] border-t border-l border-baron-border bg-baron-inset">
          <BlurFade
            key={route}
            duration={0.18}
            delay={0}
            offset={4}
            blur="3px"
            direction="up"
            className="min-h-full"
          >
            {route === "dashboard" && (
              <DashboardView
                ddVersion={ddVersion}
                patch={patch}
                onNavigate={navigateTo}
                lcuPlayer={lcuPlayer}
                isViewingLcuAccount={isViewingLcuAccount}
                onSwitchToMyLcuAccount={handleSwitchToMyLcuAccount}
                summonerData={summonerData}
                summonerLoading={summonerLoading}
                summonerError={summonerError}
                activeRegion={lcuPlayer?.opggRegion ?? summonerRegion}
                regions={supportedRegions}
                onLookupSummoner={handleLookupSummoner}
                onOpenMatch={handleOpenMatch}
                onOpenBuild={(champion, role) => {
                  setBuildTarget({ champion, role });
                  navigateTo("tierlist");
                }}
              />
            )}
            {route === "tierlist" && (
              <TierListView
                key={buildTarget ? `${buildTarget.champion}:${buildTarget.role}` : "tierlist-root"}
                activeProviderId={activeProviderId}
                activeProviderLabel={activeProvider?.label ?? "OP.GG"}
                refreshNonce={refreshNonce}
                searchFilter={searchQuery}
                initialSelectedChampion={buildTarget}
                patch={patch}
                ddVersion={ddVersion}
                defaultRegion={lcuPlayer?.opggRegion ?? "NA"}
              />
            )}
            {route === "leaderboards" && (
              <LeaderboardsView
                ddVersion={ddVersion}
                regions={supportedRegions}
                defaultRegion={lcuPlayer?.opggRegion ?? "KR"}
                onLookupSummoner={handleLookupSummoner}
              />
            )}
            {route === "spectate" && (
              <SpectateView ddVersion={ddVersion} lcuConnected={lcuConnected} />
            )}
            {route === "collections" && (
              <CollectionView ddVersion={ddVersion} lcuConnected={lcuConnected} />
            )}
            {route === "datastudio" && (
              <DataStudioView
                patch={patch}
                period={period}
                providers={providers}
                activeProviderId={activeProviderId}
                onSelectProvider={setActiveProviderId}
              />
            )}
            {route === "champselect" && (
              <ChampSelectView
                ddVersion={ddVersion}
                lcuConnected={lcuConnected}
                lcuPlayer={lcuPlayer}
              />
            )}
            {route === "postgame" && (
              <PostGameView
                ddVersion={ddVersion}
                gameDetail={gameDetail}
                loading={gameLoading}
                error={gameError}
                onNavigate={navigateTo}
              />
            )}
          </BlurFade>
        </main>
      </div>
    </div>
  );
}
