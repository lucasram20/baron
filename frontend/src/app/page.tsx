"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Sidebar, type BaronRoute } from "@/components/shell/Sidebar";
import { TopCommandBar } from "@/components/shell/TopCommandBar";
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
import { LATEST_DDRAGON, LATEST_PATCH } from "@/lib/ddragon";
import {
  DEFAULT_PROVIDERS,
  fetchBootstrapData,
  type BaronBootstrapPayload,
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

const DEFAULT_GOLD_CURVE: [number, number][] = [
  [0, 0],
  [5, 420],
  [10, 1180],
  [14, 1850],
  [20, 3120],
  [26, 4640],
  [33, 5300],
];

export default function BaronAppPage() {
  const [history, setHistory] = useState<BaronRoute[]>(["dashboard"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const route = history[historyIndex] ?? "dashboard";

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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedStorage(!readSidebarSnapshot());
  }, []);

  const navigateTo = useCallback((nextRoute: BaronRoute) => {
    setHistory((prev) => {
      const current = prev[historyIndex];
      if (current === nextRoute) return prev;
      const truncated = prev.slice(0, historyIndex + 1);
      const updated = [...truncated, nextRoute];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [historyIndex]);

  const handleBack = useCallback(() => {
    setHistoryIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const handleForward = useCallback(() => {
    setHistoryIndex((idx) => Math.min(history.length - 1, idx + 1));
  }, [history.length]);

  useEffect(() => {
    let cancelled = false;
    fetchBootstrapData(patch).then((payload) => {
      if (!cancelled) {
        setBootstrap(payload);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [patch]);

  const handleRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
    fetchBootstrapData(patch).then((payload) => {
      setBootstrap(payload);
    });
  }, [patch]);

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

  const ddVersion = bootstrap?.ddragonVersion || LATEST_DDRAGON;
  const providers = bootstrap?.providers || DEFAULT_PROVIDERS;
  const activeProvider = providers.find((p) => p.id === activeProviderId) ?? providers[0];
  const lcuConnected = bootstrap?.lcuStatus.connected ?? false;
  const lcuMessage =
    bootstrap?.lcuStatus.message ??
    "Waiting for League client lockfile. Start League of Legends for live draft & rune injection.";
  const goldCurve = bootstrap?.goldCurve ?? DEFAULT_GOLD_CURVE;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-baron-chrome text-baron-ink">
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
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          activeRoute={route}
          onSelectRoute={navigateTo}
          ddVersion={ddVersion}
          collapsed={sidebarCollapsed}
        />

        <main className="min-w-0 flex-1 overflow-y-auto rounded-tl-[14px] border-t border-l border-baron-border bg-baron-inset">
          {route === "dashboard" && (
            <DashboardView
              ddVersion={ddVersion}
              patch={patch}
              onNavigate={navigateTo}
            />
          )}
          {route === "tierlist" && (
            <TierListView
              activeProviderId={activeProviderId}
              activeProviderLabel={activeProvider?.label ?? "OP.GG"}
              refreshNonce={refreshNonce}
              searchFilter={searchQuery}
            />
          )}
          {route === "leaderboards" && <LeaderboardsView ddVersion={ddVersion} />}
          {route === "spectate" && <SpectateView ddVersion={ddVersion} />}
          {route === "collections" && <CollectionView ddVersion={ddVersion} />}
          {route === "datastudio" && (
            <DataStudioView
              patch={patch}
              period={period}
              providers={providers}
              activeProviderId={activeProviderId}
              onSelectProvider={setActiveProviderId}
            />
          )}
          {route === "champselect" && <ChampSelectView ddVersion={ddVersion} />}
          {route === "postgame" && (
            <PostGameView ddVersion={ddVersion} goldCurve={goldCurve} />
          )}
        </main>
      </div>
    </div>
  );
}
