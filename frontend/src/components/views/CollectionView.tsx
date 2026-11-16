"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { SKIN_POSTERS } from "@/data/mockDpm";
import { champLoadingUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { SkinPosterItem } from "@/types/baron";

const RARITY_COLOR: Record<SkinPosterItem["rarity"], string> = {
  Standard: "text-slate-400",
  Epic: "text-sky-400",
  Legendary: "text-rose-500",
  Mythic: "text-purple-400",
  Ultimate: "text-amber-400",
  Exalted: "text-pink-400",
  Transcendent: "text-teal-400",
};

const TIER_SIDEBAR = [
  { label: "Standard", count: "76/154", color: "text-slate-400" },
  { label: "Rare", count: "0/0", color: "text-slate-600" },
  { label: "Epic", count: "107/212", color: "text-sky-400" },
  { label: "Legendary", count: "12/43", color: "text-rose-500" },
  { label: "Mythic", count: "15/60", color: "text-purple-400" },
  { label: "Ultimate", count: "1/7", color: "text-amber-400" },
  { label: "Exalted", count: "1/4", color: "text-pink-400" },
  { label: "Transcendent", count: "0/2", color: "text-teal-400" },
] as const;

export function CollectionView() {
  const [filter, setFilter] = useState<"All" | "Owned" | "Missing">("All");
  const [skinQuery, setSkinQuery] = useState("");

  const visibleSkins = SKIN_POSTERS.filter((s) => {
    if (filter === "Owned" && !s.owned) return false;
    if (filter === "Missing" && s.owned) return false;
    if (skinQuery.trim()) {
      const q = skinQuery.trim().toLowerCase();
      return (
        s.skinName.toLowerCase().includes(q) || s.champion.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-50">Collection</h1>
        <p className="text-xs text-slate-400">
          Every skin on your account, and the ones still missing.
        </p>
      </div>

      <div className="grid grid-cols-[216px_1fr] gap-4">
        {/* Left Filters Sidebar */}
        <div className="flex flex-col gap-4 rounded-xl border border-baron-border bg-baron-surface p-3.5">
          <div className="text-xs font-bold text-slate-200">Filters</div>
          <div className="flex h-8 items-center gap-2 rounded-md border border-baron-border bg-baron-elevated px-2.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={skinQuery}
              onChange={(e) => setSkinQuery(e.target.value)}
              placeholder="Search a skin"
              className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-md border border-baron-border bg-baron-elevated p-0.5">
            {(["All", "Owned", "Missing"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded py-1 text-xs font-semibold transition",
                  filter === f
                    ? "bg-baron-accent text-white"
                    : "text-slate-400 hover:text-slate-100",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-1 text-[10px] font-bold tracking-wider text-slate-500">
              CHAMPION
            </div>
            <div className="rounded-md border border-baron-border bg-baron-elevated px-2.5 py-1.5 text-xs text-slate-300">
              Every champion
            </div>
          </div>

          <div>
            <div className="mb-1 text-[10px] font-bold tracking-wider text-slate-500">SET</div>
            <div className="rounded-md border border-baron-border bg-baron-elevated px-2.5 py-1.5 text-xs text-slate-300">
              Every set
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
              <span>Worlds</span>
              <span className="text-slate-500">14/19</span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-bold tracking-wider text-slate-500">TIER</div>
            <div className="flex flex-col gap-2 text-xs">
              {TIER_SIDEBAR.map((t) => (
                <div key={t.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-200">
                    <span className={t.color}>◆</span>
                    {t.label}
                  </span>
                  <span className="text-slate-500">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Progress Banner & Skin Poster Grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-6 rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="flex-1">
              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-50">212</span>
                <span className="text-sm text-slate-500">/ 482</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-baron-elevated">
                <div className="h-full rounded-full bg-baron-accent" style={{ width: "44%" }} />
              </div>
              <div className="mt-2 text-xs text-slate-400">Skins owned · 44% complete</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-slate-50">
                223,015 <span className="text-sm text-slate-400">RP</span>
              </div>
              <div className="text-xs text-slate-400">Spent on what you own</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">
              Acquired in 2026 <span className="ml-1 font-normal text-slate-500">18 / 18</span>
            </span>
            <span className="text-slate-400">482 skins · Group: Acquisition year</span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {visibleSkins.map((skin) => (
              <div
                key={skin.id}
                className="group relative h-[228px] overflow-hidden rounded-lg border border-baron-border bg-baron-surface transition hover:border-baron-border-strong"
              >
                <img
                  src={champLoadingUrl(skin.champion, skin.skinNum)}
                  alt={skin.skinName}
                  className={cn(
                    "h-full w-full object-cover object-top transition duration-300 group-hover:scale-105",
                    !skin.owned && "opacity-45 grayscale",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-baron-canvas via-baron-canvas/20 to-transparent" />
                <span
                  className={cn(
                    "absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-baron-canvas/85 text-xs ring-1 ring-baron-border",
                    RARITY_COLOR[skin.rarity],
                  )}
                >
                  ◆
                </span>
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <div className="truncate text-xs font-bold text-slate-50">{skin.skinName}</div>
                  <div className="text-[11px] text-slate-400">{skin.priceLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
