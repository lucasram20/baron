"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import GlareHover from "@/components/GlareHover";
import SpotlightCard from "@/components/SpotlightCard";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Input } from "@/components/ui/input";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Skeleton } from "@/components/ui/skeleton";
import { champLoadingUrl, champSquareUrl, LATEST_DDRAGON } from "@/lib/ddragon";
import {
  fetchLcuOwnedSkins,
  fetchOpggDiscountedSkins,
  type LcuOwnedSkinDto,
  type OpggDiscountedSkinsResponse,
} from "@/lib/tauri";
import { useTheme } from "@/lib/theme";

type CollectionTab = "sales" | "owned";

export function CollectionView({
  ddVersion = LATEST_DDRAGON,
  lcuConnected = false,
}: {
  ddVersion?: string;
  lcuConnected?: boolean;
}) {
  const { resolved } = useTheme();
  const [tab, setTab] = useState<CollectionTab>("sales");
  const [query, setQuery] = useState("");
  const [salesState, setSalesState] = useState<{
    loaded: boolean;
    data: OpggDiscountedSkinsResponse | null;
    error: string | null;
  }>({ loaded: false, data: null, error: null });
  const [ownedState, setOwnedState] = useState<{
    loaded: boolean;
    skins: LcuOwnedSkinDto[];
    error: string | null;
  }>({ loaded: false, skins: [], error: null });

  useEffect(() => {
    let cancelled = false;
    fetchOpggDiscountedSkins()
      .then((data) => {
        if (!cancelled) setSalesState({ loaded: true, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSalesState({
            loaded: true,
            data: null,
            error: err instanceof Error ? err.message : "Failed to load OP.GG skin sales.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!lcuConnected) return;
    let cancelled = false;
    fetchLcuOwnedSkins()
      .then((skins) => {
        if (!cancelled) setOwnedState({ loaded: true, skins, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOwnedState({
            loaded: true,
            skins: [],
            error: err instanceof Error ? err.message : "Failed to sync LCU skin inventory.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lcuConnected]);

  const skins = salesState.data?.data ?? [];
  const filteredSales = skins.filter((s) =>
    `${s.skin_name} ${s.champion_name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const ownedSkins = ownedState.skins;
  const filteredOwned = ownedSkins.filter((s) =>
    `${s.name} ${s.champion_name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="min-h-full">
      <header className="border-b border-baron-border bg-baron-surface px-5 py-4 shadow-[inset_0_1px_0_var(--baron-top-sheen)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
                Collections &amp; Shop Discounts
              </h1>
              <span className="rounded-md border border-baron-emerald/30 bg-baron-emerald/12 px-2 py-0.5 text-[10.5px] font-semibold text-baron-emerald">
                Live · OP.GG Shop Sales
              </span>
              <span className="rounded-md bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary">
                {lcuConnected ? "LCU Inventory Synced" : "LCU Offline (Vault requires Client)"}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-baron-ink-muted">
              Live League store skin discounts from OP.GG MCP plus your personal owned skin vault
              when League Client is open.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[20px] leading-none font-extrabold text-baron-ink tnum">
                <NumberTicker
                  value={tab === "sales" ? skins.length : ownedSkins.length}
                  className="text-baron-ink"
                />
              </div>
              <div className="mt-1 text-[10.5px] font-semibold tracking-wider text-baron-ink-muted uppercase">
                {tab === "sales" ? "Live Deals" : "Owned Skins"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <AnimatedTabs
            layoutId="collections-tabs"
            ariaLabel="Collections source"
            value={tab}
            onChange={setTab}
            items={[
              { id: "sales", label: "OP.GG Store Sales" },
              { id: "owned", label: `My LCU Vault (${ownedSkins.length})` },
            ]}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-baron-ink-muted" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter skins..."
              aria-label="Filter skins"
              className="h-8 w-64 border-baron-border bg-baron-inset pr-3 pl-8 text-[12px] text-baron-ink placeholder:text-baron-ink-muted"
            />
          </div>
        </div>
      </header>

      {tab === "sales" && (
        <>
          {!salesState.loaded && (
            <div
              role="status"
              className="grid grid-cols-2 gap-3.5 p-5 sm:grid-cols-4 xl:grid-cols-5"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl bg-baron-surface" />
              ))}
            </div>
          )}

          {salesState.loaded && salesState.error && (
            <div
              role="alert"
              className="baron-surface-card m-5 rounded-xl border border-baron-border bg-baron-surface p-5"
            >
              <div className="flex items-start gap-2.5 text-[13px] text-baron-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-baron-gold" />
                <div>
                  <div className="font-bold">Live OP.GG Skin Discounts Unavailable</div>
                  <p className="mt-1 text-[12px] text-baron-ink-secondary">{salesState.error}</p>
                </div>
              </div>
            </div>
          )}

          {salesState.loaded && !salesState.error && (
            <div className="p-5">
              {filteredSales.length === 0 ? (
                <div className="baron-surface-card rounded-xl border border-baron-border bg-baron-surface px-5 py-10 text-center text-[13px] text-baron-ink-muted">
                  No live discounted skins match &ldquo;{query}&rdquo;.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {filteredSales.map((skin) => {
                    const skinNum = skin.skin_id % 1000;
                    const discountPct = Math.round((skin.discount_rate ?? 0) * 100);
                    return (
                      <SpotlightCard
                        key={skin.skin_id}
                        theme={resolved}
                        intensity={0.09}
                        borderGlow={0.48}
                        style={{ borderRadius: "10px" }}
                        className="group overflow-hidden rounded-[10px] border border-baron-border bg-baron-surface p-0"
                      >
                        <GlareHover
                          width="100%"
                          height="auto"
                          borderRadius="0px"
                          glareColor="#ffe8cc"
                          glareOpacity={0.22}
                          glareSize={38}
                          variant="sheen"
                          transitionDuration={550}
                          rimGlint={false}
                          className="block w-full border-0"
                        >
                          <div className="relative aspect-[3/4] w-full overflow-hidden bg-baron-elevated">
                            <img
                              src={champLoadingUrl(skin.champion_name, skinNum)}
                              alt={skin.skin_name}
                              loading="lazy"
                              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent"
                            />
                            <div className="absolute top-2 right-2">
                              <span className="rounded bg-baron-emerald/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs tnum">
                                -{discountPct}%
                              </span>
                            </div>
                            <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                              <img
                                src={champSquareUrl(skin.champion_name, ddVersion)}
                                alt={skin.champion_name}
                                className="h-5 w-5 rounded border border-white/25 object-cover"
                              />
                              <span className="text-[11px] font-semibold text-white/95">
                                {skin.champion_name}
                              </span>
                            </div>
                          </div>
                        </GlareHover>

                        <div className="p-2.5">
                          <div className="truncate text-[12.5px] font-bold text-baron-ink">
                            {skin.skin_name}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-baron-gold tnum">
                              {skin.cost.toLocaleString()} {skin.currency}
                            </span>
                            <span className="text-baron-ink-muted">OP.GG Sale</span>
                          </div>
                        </div>
                      </SpotlightCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "owned" && (
        <div className="p-5">
          {!lcuConnected ? (
            <div className="baron-surface-card rounded-xl border border-baron-border bg-baron-surface p-6 text-[13px] text-baron-ink-secondary">
              Launch <strong className="text-baron-ink">League of Legends</strong> so Baron can read
              your personal unlocked skin collection directly from LCU (no account login required).
            </div>
          ) : !ownedState.loaded ? (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl bg-baron-surface" />
              ))}
            </div>
          ) : ownedState.error ? (
            <div className="baron-surface-card rounded-xl border border-baron-border bg-baron-surface p-5 text-[12.5px] text-baron-ink-secondary">
              {ownedState.error}
            </div>
          ) : filteredOwned.length === 0 ? (
            <div className="baron-surface-card rounded-xl border border-baron-border bg-baron-surface px-5 py-10 text-center text-[13px] text-baron-ink-muted">
              No unlocked skins match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {filteredOwned.map((skin) => {
                const skinNum = skin.skin_id % 1000;
                return (
                  <SpotlightCard
                    key={skin.skin_id}
                    theme={resolved}
                    intensity={0.09}
                    borderGlow={0.48}
                    style={{ borderRadius: "10px" }}
                    className="group overflow-hidden rounded-[10px] border border-baron-border bg-baron-surface p-0"
                  >
                    <GlareHover
                      width="100%"
                      height="auto"
                      borderRadius="0px"
                      glareColor="#ffe8cc"
                      glareOpacity={0.22}
                      glareSize={38}
                      variant="sheen"
                      transitionDuration={550}
                      rimGlint={false}
                      className="block w-full border-0"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-baron-elevated">
                        <img
                          src={champLoadingUrl(skin.champion_name, skinNum)}
                          alt={skin.name}
                          loading="lazy"
                          className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent"
                        />
                        <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                          <img
                            src={champSquareUrl(skin.champion_name, ddVersion)}
                            alt={skin.champion_name}
                            className="h-5 w-5 rounded border border-white/25 object-cover"
                          />
                          <span className="text-[11px] font-semibold text-white/95">
                            {skin.champion_name}
                          </span>
                        </div>
                      </div>
                    </GlareHover>
                    <div className="p-2.5">
                      <div className="truncate text-[12.5px] font-bold text-baron-ink">
                        {skin.name}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-baron-cyan">{skin.rarity}</span>
                        <span className="text-baron-ink-muted">Owned</span>
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
