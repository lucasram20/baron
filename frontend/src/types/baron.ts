export type BaronRoute =
  | "dashboard"
  | "tierlist"
  | "leaderboards"
  | "spectate"
  | "collections"
  | "datastudio"
  | "champselect"
  | "postgame";

export interface DraftSlot {
  champion: string;
  role: "Top" | "Jg" | "Mid" | "Bot" | "Sup";
  tier: "S+" | "S" | "A" | "B" | "C";
  delta: string;
  deltaPositive: boolean | null;
}

export interface RuneNode {
  id: number;
  name: string;
  icon: string;
  active: boolean;
}

export interface BuildArchetype {
  id: string;
  name: string;
  games: string;
  winRate: string;
  accent: "indigo" | "emerald" | "rose";
  coreItems: number[];
  completedItems: { id: number; winRate: string }[];
  situationalItems: { id: number; winRate: string }[];
  skillOrder: ("Q" | "W" | "E")[];
}

export interface ProBuildRow {
  player: string;
  team: string;
  when: string;
  keystoneIcon: string;
  items: number[];
}

export interface SpectatePlayer {
  champion: string;
  playerName: string;
  teamTag: string | null;
  role: string;
  isPro: boolean;
}

export interface SpectateMatch {
  id: string;
  duration: string;
  region: string;
  avgTier: "CHALLENGER" | "GRANDMASTER";
  avgLp: string;
  knownPlayers: string;
  blue: SpectatePlayer[];
  red: SpectatePlayer[];
}

export interface ScoreboardParticipant {
  place: string;
  badge: "MVP" | "ACE" | null;
  isYou: boolean;
  champion: string;
  level: number;
  name: string;
  tag: string;
  rankBadge: string;
  spells: [string, string];
  keystoneIcon: string;
  secondaryIcon: string;
  items: number[];
  kills: number;
  deaths: number;
  assists: number;
  kdaLine: string;
  csTop: string;
  csSub: string;
  dmgLabel: string;
  dmgRatio: number;
  score: number;
  team: "blue" | "red";
}

export interface TierListRow {
  rank: number;
  champion: string;
  role: string;
  rolePct: string;
  tier: "S+" | "S" | "A" | "B";
  winRate: string;
  delta: string;
  deltaPositive: boolean;
  pickRate: string;
  games: string;
}

export interface SkinPosterItem {
  id: string;
  skinName: string;
  champion: string;
  skinNum: number;
  priceLabel: string;
  rarity: "Standard" | "Rare" | "Epic" | "Legendary" | "Mythic" | "Ultimate" | "Exalted" | "Transcendent";
  owned: boolean;
  year: number;
}
