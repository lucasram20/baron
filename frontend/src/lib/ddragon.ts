export const LATEST_PATCH = "16.22";
export const LATEST_DDRAGON = "16.22.1";

export const AVAILABLE_PERIODS = ["7 days", "14 days", "30 days"] as const;
export const AVAILABLE_PATCHES = [
  "16.22",
  "16.21",
  "16.20",
  "16.19",
  "16.18",
  "16.17",
  "16.16",
  "16.15",
  "16.14",
  "16.13",
  "16.12",
  "16.11",
  "16.10",
] as const;

const CHAMPION_KEY_ALIASES: Record<string, string> = {
  "Kai'Sa": "Kaisa",
  "K'Sante": "KSante",
  "Kha'Zix": "Khazix",
  "Lee Sin": "LeeSin",
  "Miss Fortune": "MissFortune",
  "Jarvan IV": "JarvanIV",
  "Twisted Fate": "TwistedFate",
  "Tahm Kench": "TahmKench",
  "Xin Zhao": "XinZhao",
  "Aurelion Sol": "AurelionSol",
  "Wukong": "MonkeyKing",
  "LeBlanc": "Leblanc",
};

export function championKey(name: string): string {
  return CHAMPION_KEY_ALIASES[name] ?? name.replace(/['\s.]/g, "");
}

export function champSquareUrl(name: string, ddVersion = LATEST_DDRAGON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${championKey(name)}.png`;
}

export function champLoadingUrl(name: string, skinNum = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championKey(name)}_${skinNum}.jpg`;
}

export function champSplashUrl(name: string, skinNum = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championKey(name)}_${skinNum}.jpg`;
}

export function itemIconUrl(itemId: number, ddVersion = LATEST_DDRAGON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${itemId}.png`;
}

export function spellIconUrl(spellKey: string, ddVersion = LATEST_DDRAGON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/spell/${spellKey}.png`;
}

export function runeIconUrl(iconPath: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/${iconPath}`;
}
