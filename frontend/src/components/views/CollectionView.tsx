"use client";

import { useState } from "react";
import { ArrowDownUp, Search, SlidersHorizontal } from "lucide-react";
import { RarityDiamond } from "@/components/icons/LolIcons";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SKIN_POSTERS } from "@/data/mockDpm";
import { champLoadingUrl, champSplashUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { SkinPosterItem } from "@/types/baron";

const RARITY_COLOR: Record<SkinPosterItem["rarity"], string> = {
  Standard: "text-baron-ink-muted",
  Rare: "text-baron-ink-muted",
  Epic: "text-baron-cyan",
  Legendary: "text-baron-defeat",
  Mythic: "text-baron-ace",
  Ultimate: "text-baron-gold",
  Exalted: "text-pink-400",
  Transcendent: "text-teal-400",
};

const TIER_SIDEBAR: { label: SkinPosterItem["rarity"]; count: string; color: string }[] = [
  { label: "Standard", count: "76/154", color: "text-baron-ink-muted" },
  { label: "Rare", count: "0/0", color: "text-baron-ink-muted/60" },
  { label: "Epic", count: "107/212", color: "text-baron-cyan" },
  { label: "Legendary", count: "12/43", color: "text-baron-defeat" },
  { label: "Mythic", count: "15/60", color: "text-baron-ace" },
  { label: "Ultimate", count: "1/7", color: "text-baron-gold" },
  { label: "Exalted", count: "1/4", color: "text-pink-400" },
  { label: "Transcendent", count: "0/2", color: "text-teal-400" },
];

export function CollectionView() {
  const [filter, setFilter] = useState<"All" | "Owned" | "Missing">("All");
  const [skinQuery, setSkinQuery] = useState("");
  const [championFilter, setChampionFilter] = useState("all");
  const [worldsOnly, setWorldsOnly] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<SkinPosterItem["rarity"][]>([]);
  const [groupBy, setGroupBy] = useState("year");
  const [sortBy, setSortBy] = useState("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [gridDensity, setGridDensity] = useState<"auto" | "compact">("auto");
  const [previewSkin, setPreviewSkin] = useState<SkinPosterItem | null>(null);

  const uniqueChampions = Array.from(new Set(SKIN_POSTERS.map((s) => s.champion)));

  const toggleTier = (tier: SkinPosterItem["rarity"]) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  };

  const visibleSkins = SKIN_POSTERS.filter((s) => {
    if (filter === "Owned" && !s.owned) return false;
    if (filter === "Missing" && s.owned) return false;
    if (championFilter !== "all" && s.champion !== championFilter) return false;
    if (worldsOnly && !s.skinName.toLowerCase().includes("world")) return false;
    if (selectedTiers.length > 0 && !selectedTiers.includes(s.rarity)) return false;
    if (skinQuery.trim()) {
      const q = skinQuery.trim().toLowerCase();
      return s.skinName.toLowerCase().includes(q) || s.champion.toLowerCase().includes(q);
    }
    return true;
  }).toSorted((a, b) => {
    if (sortBy === "name") {
      const cmp = a.skinName.localeCompare(b.skinName);
      return sortDesc ? -cmp : cmp;
    }
    return sortDesc ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-baron-ink">Collection</h1>
        <p className="text-xs text-baron-ink-secondary">
          Every skin on your account, and the ones still missing.
        </p>
      </div>

      <div className="grid grid-cols-[218px_1fr] gap-4">
        {/* Left Filters Sidebar matching DPM Collection */}
        <div className="flex flex-col gap-4 rounded-xl border border-baron-border bg-baron-surface p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-baron-ink">
            <SlidersHorizontal className="h-3.5 w-3.5 text-baron-ink-muted" />
            <span>Filters</span>
          </div>

          <div className="flex h-8 items-center gap-2 rounded-md border border-baron-border bg-baron-elevated px-2.5 focus-within:border-baron-accent">
            <Search className="h-3.5 w-3.5 text-baron-ink-muted" />
            <input
              type="text"
              value={skinQuery}
              onChange={(e) => setSkinQuery(e.target.value)}
              placeholder="Search a skin"
              className="w-full bg-transparent text-xs text-baron-ink placeholder:text-baron-ink-muted focus:outline-none"
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
                    ? "bg-baron-accent text-white shadow-sm"
                    : "text-baron-ink-secondary hover:text-baron-ink",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-1.5 text-[10px] font-bold tracking-wider text-baron-ink-muted">
              CHAMPION
            </div>
            <Select value={championFilter} onValueChange={setChampionFilter}>
              <SelectTrigger size="sm" className="h-8 w-full border-baron-border bg-baron-elevated text-xs text-baron-ink">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every champion</SelectItem>
                {uniqueChampions.map((champ) => (
                  <SelectItem key={champ} value={champ}>
                    {champ}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-1.5 text-[10px] font-bold tracking-wider text-baron-ink-muted">
              SET
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-baron-border bg-baron-elevated px-2.5 py-2 text-xs text-baron-ink">
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={worldsOnly}
                  onCheckedChange={(v) => setWorldsOnly(Boolean(v))}
                />
                <span>Worlds</span>
              </span>
              <span className="text-[11px] text-baron-ink-muted">14/19</span>
            </label>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-bold tracking-wider text-baron-ink-muted">
              TIER
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {TIER_SIDEBAR.map((t) => {
                const checked = selectedTiers.includes(t.label);
                return (
                  <label
                    key={t.label}
                    className="flex cursor-pointer items-center justify-between rounded px-1 py-0.5 transition hover:bg-baron-hover/60"
                  >
                    <span className="flex items-center gap-2 text-baron-ink">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleTier(t.label)}
                      />
                      <RarityDiamond className={t.color} />
                      <span>{t.label}</span>
                    </span>
                    <span className="text-[11px] text-baron-ink-muted">{t.count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Progress Banner & Skin Poster Grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-6 rounded-xl border border-baron-border bg-baron-surface p-4">
            <div className="flex-1">
              <div className="mb-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-baron-ink">
                  <NumberTicker value={212} />
                </span>
                <span className="text-sm text-baron-ink-muted">/ 482</span>
              </div>
              <Progress value={44} className="h-2 bg-baron-elevated" />
              <div className="mt-2 text-xs text-baron-ink-secondary">
                Skins owned · 44% complete
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-baron-ink">
                <NumberTicker value={223015} />{" "}
                <span className="text-sm font-bold text-baron-ink-muted">RP</span>
              </div>
              <div className="text-xs text-baron-ink-secondary">Spent on what you own</div>
            </div>
          </div>

          {/* Collection Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-baron-ink-secondary">
              {visibleSkins.length} matching skins · <strong className="text-baron-ink">482</strong> total
            </span>
            <div className="flex items-center gap-2">
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger size="sm" className="h-8 border-baron-border bg-baron-surface text-xs text-baron-ink">
                  <span className="text-baron-ink-muted">Group</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Acquisition year</SelectItem>
                  <SelectItem value="champion">Champion</SelectItem>
                  <SelectItem value="rarity">Rarity tier</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger size="sm" className="h-8 border-baron-border bg-baron-surface text-xs text-baron-ink">
                  <span className="text-baron-ink-muted">Sort</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Acquisition date</SelectItem>
                  <SelectItem value="name">Alphabetical</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={gridDensity}
                onValueChange={(v) => setGridDensity(v as "auto" | "compact")}
              >
                <SelectTrigger size="sm" className="h-8 border-baron-border bg-baron-surface text-xs text-baron-ink">
                  <span className="text-baron-ink-muted">Size</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>

              <button
                type="button"
                aria-label="Toggle sort order"
                onClick={() => setSortDesc((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-baron-border bg-baron-surface text-baron-ink-secondary transition hover:border-baron-border-strong hover:text-baron-ink"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-baron-ink">Acquired in 2026</span>
            <span className="text-baron-ink-muted">18 / 18</span>
          </div>

          <div
            className={cn(
              "grid gap-3",
              gridDensity === "compact" ? "grid-cols-6" : "grid-cols-5",
            )}
          >
            {visibleSkins.map((skin) => (
              <MagicCard
                key={skin.id}
                gradientFrom="#6366f1"
                gradientTo="#38bdf8"
                gradientOpacity={0.14}
                className="rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setPreviewSkin(skin)}
                  className="group relative block h-[228px] w-full overflow-hidden rounded-lg border border-baron-border bg-baron-surface text-left transition hover:border-baron-border-strong"
                >
                  <img
                    src={champLoadingUrl(skin.champion, skin.skinNum)}
                    alt={skin.skinName}
                    className={cn(
                      "h-full w-full object-cover object-top transition duration-300 group-hover:scale-105",
                      !skin.owned && "opacity-45 grayscale",
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                  <span
                    className={cn(
                      "absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 ring-1 ring-white/15",
                      RARITY_COLOR[skin.rarity],
                    )}
                  >
                    <RarityDiamond />
                  </span>

                  {!skin.owned && (
                    <span className="absolute top-2.5 left-2.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 ring-1 ring-white/15">
                      MISSING
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <div className="line-clamp-2 text-xs leading-tight font-bold text-slate-100">
                      {skin.skinName}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-slate-400">
                      {skin.priceLabel}
                    </div>
                  </div>
                </button>
              </MagicCard>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Splash Lightbox Modal */}
      <Dialog open={previewSkin !== null} onOpenChange={(open) => !open && setPreviewSkin(null)}>
        <DialogContent className="max-w-2xl border-baron-border bg-baron-sidebar text-baron-ink">
          {previewSkin && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-baron-ink">
                  <RarityDiamond className={RARITY_COLOR[previewSkin.rarity]} />
                  <span>{previewSkin.skinName}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-baron-ink-secondary">
                  {previewSkin.champion} · {previewSkin.rarity} · {previewSkin.priceLabel} ·{" "}
                  {previewSkin.owned ? "Owned on Account" : "Locked / Missing"}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg border border-baron-border">
                <img
                  src={champSplashUrl(previewSkin.champion, previewSkin.skinNum)}
                  alt={previewSkin.skinName}
                  className="aspect-video w-full object-cover"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
