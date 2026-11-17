"use client";

import { useState } from "react";
import { RarityDiamond } from "@/components/icons/LolIcons";
import SpotlightCard from "@/components/SpotlightCard";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SKIN_POSTERS } from "@/data/mockDpm";
import { champLoadingUrl, champSquareUrl, LATEST_DDRAGON } from "@/lib/ddragon";
import { useTheme } from "@/lib/theme";

type VaultFilter = "all" | "owned" | "unowned";

function rarityAccent(rarity: string): string {
  switch (rarity) {
    case "Ultimate":
      return "text-baron-gold";
    case "Mythic":
      return "text-baron-ace";
    case "Legendary":
      return "text-baron-defeat";
    default:
      return "text-baron-cyan";
  }
}

export function CollectionView({ ddVersion = LATEST_DDRAGON }: { ddVersion?: string }) {
  const { resolved } = useTheme();
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [query, setQuery] = useState("");

  const ownedCount = SKIN_POSTERS.filter((s) => s.owned).length;
  const unownedCount = SKIN_POSTERS.length - ownedCount;

  const filtered = SKIN_POSTERS.filter((skin) => {
    if (filter === "owned" && !skin.owned) return false;
    if (filter === "unowned" && skin.owned) return false;
    return `${skin.skinName} ${skin.champion} ${skin.rarity}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  });

  return (
    <div className="min-h-full">
      <header className="border-b border-baron-border bg-baron-surface px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-baron-ink">
                Skin Vault &amp; Mastery
              </h1>
              <span className="rounded bg-baron-elevated px-2 py-0.5 text-[10.5px] font-semibold text-baron-ink-secondary ring-1 ring-baron-border">
                Sample LCU vault
              </span>
            </div>
            <p className="mt-1 text-[12px] text-baron-ink-muted">
              Verified Data Dragon 16.22.1 splash posters with rarity breakdown. Live client vault
              syncs via LCU when League of Legends is open.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[20px] leading-none font-extrabold text-baron-ink tnum">
                <NumberTicker value={ownedCount} className="text-baron-ink" />
              </div>
              <div className="mt-1 text-[10.5px] font-semibold tracking-wider text-baron-ink-muted uppercase">
                Owned Skins
              </div>
            </div>
            <div className="h-7 w-px bg-baron-border" />
            <div className="text-right">
              <div className="text-[20px] leading-none font-extrabold text-baron-ink-secondary tnum">
                <NumberTicker value={unownedCount} className="text-baron-ink-secondary" />
              </div>
              <div className="mt-1 text-[10.5px] font-semibold tracking-wider text-baron-ink-muted uppercase">
                Wishlist
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          <AnimatedTabs
            layoutId="collections-filter-tab"
            ariaLabel="Filter skin vault"
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: `All (${SKIN_POSTERS.length})` },
              { id: "owned", label: `Owned (${ownedCount})` },
              { id: "unowned", label: `Wishlist (${unownedCount})` },
            ]}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skin or champion..."
            aria-label="Search skin vault"
            className="h-8 w-56 rounded-md border border-baron-border bg-baron-inset px-3 text-[12px] text-baron-ink placeholder:text-baron-ink-muted focus:border-baron-accent focus:outline-none"
          />
        </div>
      </header>

      <div className="p-5">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-baron-border bg-baron-surface px-5 py-10 text-center text-[13px] text-baron-ink-muted">
            No skins match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((skin) => (
              <SpotlightCard
                key={skin.id}
                theme={resolved}
                intensity={0.09}
                borderGlow={0.45}
                style={{ borderRadius: "10px" }}
                className="group overflow-hidden rounded-[10px] border border-baron-border bg-baron-surface"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-baron-elevated">
                  <img
                    src={champLoadingUrl(skin.champion, skin.skinNum)}
                    alt={skin.skinName}
                    loading="lazy"
                    className={`h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03] ${
                      skin.owned ? "" : "opacity-65 grayscale-[30%]"
                    }`}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent"
                  />
                  <div className="absolute top-2 right-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        skin.owned
                          ? "bg-baron-emerald/85 text-white"
                          : "bg-black/70 text-white/85"
                      }`}
                    >
                      {skin.owned ? "Owned" : skin.priceLabel}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                    <img
                      src={champSquareUrl(skin.champion, ddVersion)}
                      alt={skin.champion}
                      className="h-5 w-5 rounded border border-white/25 object-cover"
                    />
                    <span className="text-[11px] font-semibold text-white/90">{skin.champion}</span>
                  </div>
                </div>

                <div className="p-2.5">
                  <div className="truncate text-[12.5px] font-bold text-baron-ink">
                    {skin.skinName}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className={`inline-flex items-center gap-1 font-semibold ${rarityAccent(skin.rarity)}`}>
                      <RarityDiamond className="h-2.5 w-2.5" />
                      {skin.rarity}
                    </span>
                    <span className="text-baron-ink-muted tnum">{skin.year}</span>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
