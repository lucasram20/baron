"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
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
  type BaronBootstrapPayload,
  DEFAULT_PROVIDERS,
  fetchBootstrapData,
} from "@/lib/tauri";
import type { BaronRoute } from "@/types/baron";

const ROUTE_ORDER: BaronRoute[] = [
  "dashboard",
  "tierlist",
  "leaderboards",
  "spectate",
  "collections",
  "datastudio",
  "champselect",
  "postgame",
];

export default function BaronAppPage() {
  const [route, setRoute] = useState<BaronRoute>("champselect");
  const [searchQuery, setSearchQuery] = useState("");
  const [patch, setPatch] = useState(LATEST_PATCH);
  const [period, setPeriod] = useState("7 days");
  const [patchPopoverOpen, setPatchPopoverOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState("opgg");
  const [providerOpen, setProviderOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<BaronBootstrapPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetchBootstrapData(patch).then((data) => {
      if (active) setBootstrap(data);
    });
    return () => {
      active = false;
    };
  }, [patch]);

  const ddVersion = bootstrap?.ddragonVersion ?? LATEST_DDRAGON;
  const providers = bootstrap?.providers ?? DEFAULT_PROVIDERS;
  const activeProviderLabel =
    providers.find((p) => p.id === activeProviderId)?.label ?? "OP.GG";

  const stepRoute = (delta: number) => {
    const idx = ROUTE_ORDER.indexOf(route);
    const nextIdx = (idx + delta + ROUTE_ORDER.length) % ROUTE_ORDER.length;
    setRoute(ROUTE_ORDER[nextIdx]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-baron-canvas text-baron-ink">
      <Sidebar activeRoute={route} onSelectRoute={setRoute} ddVersion={ddVersion} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopCommandBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          patch={patch}
          onSelectPatch={setPatch}
          period={period}
          onSelectPeriod={setPeriod}
          patchPopoverOpen={patchPopoverOpen}
          onTogglePatchPopover={() => {
            setPatchPopoverOpen((v) => !v);
            setProviderOpen(false);
          }}
          providers={providers}
          activeProviderId={activeProviderId}
          onSelectProvider={setActiveProviderId}
          providerOpen={providerOpen}
          onToggleProviderOpen={() => {
            setProviderOpen((v) => !v);
            setPatchPopoverOpen(false);
          }}
          lcuMessage={bootstrap?.lcuStatus.message ?? "LCU Ready"}
          lcuConnected={bootstrap?.lcuStatus.connected ?? false}
          onBack={() => stepRoute(-1)}
          onForward={() => stepRoute(1)}
          onNavigate={setRoute}
        />

        <main className="flex-1 overflow-y-auto p-4">
          {route === "champselect" && <ChampSelectView ddVersion={ddVersion} />}
          {route === "spectate" && <SpectateView />}
          {route === "postgame" && (
            <PostGameView
              ddVersion={ddVersion}
              goldCurve={
                bootstrap?.goldCurve ?? [
                  [0, 0],
                  [14, 1850],
                  [33, 5300],
                ]
              }
            />
          )}
          {route === "tierlist" && (
            <TierListView
              activeProviderId={activeProviderId}
              activeProviderLabel={activeProviderLabel}
            />
          )}
          {route === "collections" && <CollectionView />}
          {route === "dashboard" && (
            <DashboardView ddVersion={ddVersion} patch={patch} onNavigate={setRoute} />
          )}
          {route === "leaderboards" && <LeaderboardsView ddVersion={ddVersion} />}
          {route === "datastudio" && (
            <DataStudioView
              patch={patch}
              period={period}
              providers={providers}
              activeProviderId={activeProviderId}
              onSelectProvider={setActiveProviderId}
            />
          )}
        </main>
      </div>
    </div>
  );
}
