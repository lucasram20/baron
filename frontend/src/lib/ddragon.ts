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
  "Nunu & Willump": "Nunu",
  "Renata Glasc": "Renata",
  "Bel'Veth": "Belveth",
  "Cho'Gath": "Chogath",
  "Dr. Mundo": "DrMundo",
  "Rek'Sai": "RekSai",
  "Vel'Koz": "Velkoz",
  "Kog'Maw": "KogMaw",
};

export function championKey(name: string): string {
  const exact = CHAMPION_KEY_ALIASES[name];
  if (exact) return exact;
  const upper = name.trim().toUpperCase().replace(/[^A-Z]/g, "");
  switch (upper) {
    case "WUKONG":
    case "MONKEYKING":
      return "MonkeyKing";
    case "FIDDLESTICKS":
      return "Fiddlesticks";
    case "KAISA":
      return "Kaisa";
    case "KHAZIX":
      return "Khazix";
    case "LEBLANC":
      return "Leblanc";
    case "REKSAI":
      return "RekSai";
    case "CHOGATH":
      return "Chogath";
    case "VELKOZ":
      return "Velkoz";
    case "KOGMAW":
      return "KogMaw";
    case "NUNU":
    case "NUNUWILLUMP":
      return "Nunu";
    case "BELVETH":
      return "Belveth";
    case "RENATAGLASC":
    case "RENATA":
      return "Renata";
    case "DRMUNDO":
      return "DrMundo";
    case "TWISTEDFATE":
      return "TwistedFate";
    case "MISSFORTUNE":
      return "MissFortune";
    case "LEESIN":
      return "LeeSin";
    case "XINZHAO":
      return "XinZhao";
    case "MASTERYI":
      return "MasterYi";
    case "JARVANIV":
      return "JarvanIV";
    case "TAHMKENCH":
      return "TahmKench";
    case "AURELIONSOL":
      return "AurelionSol";
    case "KSANTE":
      return "KSante";
    default: {
      const cleaned = name.replace(/['\s.&_]/g, "");
      if (cleaned === cleaned.toUpperCase() && cleaned.length > 1) {
        return cleaned.charAt(0) + cleaned.slice(1).toLowerCase();
      }
      return cleaned;
    }
  }
}

function championSplashKey(name: string): string {
  const key = championKey(name);
  // Riot DDragon square icons use `Fiddlesticks.png`, while splash/loading art retains `FiddleSticks_*`.
  return key === "Fiddlesticks" ? "FiddleSticks" : key;
}

export function champSquareUrl(name: string, ddVersion = LATEST_DDRAGON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${championKey(name)}.png`;
}

export function champLoadingUrl(name: string, skinNum = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championSplashKey(name)}_${skinNum}.jpg`;
}

export function champSplashUrl(name: string, skinNum = 0): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championSplashKey(name)}_${skinNum}.jpg`;
}

export function itemIconUrl(itemId: number, ddVersion = LATEST_DDRAGON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${itemId}.png`;
}

export function spellIconUrl(spellKey: string, ddVersion = LATEST_DDRAGON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/spell/${spellKey}.png`;
}

const SPELL_ID_KEYS: Record<number, string> = {
  1: "SummonerBoost",
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste",
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  14: "SummonerDot",
  21: "SummonerBarrier",
  32: "SummonerSnowball",
};

export function spellIdUrl(spellId: number, ddVersion = LATEST_DDRAGON): string {
  return spellIconUrl(SPELL_ID_KEYS[spellId] ?? "SummonerFlash", ddVersion);
}

export function spellIdName(spellId: number): string {
  switch (spellId) {
    case 1:
      return "Cleanse";
    case 3:
      return "Exhaust";
    case 4:
      return "Flash";
    case 6:
      return "Ghost";
    case 7:
      return "Heal";
    case 11:
      return "Smite";
    case 12:
      return "Teleport";
    case 14:
      return "Ignite";
    case 21:
      return "Barrier";
    case 32:
      return "Mark";
    default:
      return `Spell ${spellId}`;
  }
}

export function statShardLabel(shardId: number): string {
  switch (shardId) {
    case 5001:
      return "+Health Scaling";
    case 5005:
      return "+10% Attack Speed";
    case 5007:
      return "+8 Ability Haste";
    case 5008:
      return "+9 Adaptive Force";
    case 5010:
      return "+2% Move Speed";
    case 5011:
      return "+65 Health";
    case 5013:
      return "+10% Tenacity";
    default:
      return `Shard ${shardId}`;
  }
}

export function runeIconUrl(iconPath: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/${iconPath}`;
}

export const RUNE_STYLE_ICON_FALLBACK: Record<number, string> = {
  8000: "perk-images/Styles/7201_Precision.png",
  8100: "perk-images/Styles/7200_Domination.png",
  8200: "perk-images/Styles/7202_Sorcery.png",
  8300: "perk-images/Styles/7203_Whimsy.png",
  8400: "perk-images/Styles/7204_Resolve.png",
};

const runeCache = new Map<string, Promise<Record<number, { name: string; icon: string }>>>();

interface DDragonRuneTree {
  id: number;
  name: string;
  icon: string;
  slots: { runes: { id: number; name: string; icon: string }[] }[];
}

export function fetchRuneMetadataMap(
  ddVersion = LATEST_DDRAGON,
): Promise<Record<number, { name: string; icon: string }>> {
  const existing = runeCache.get(ddVersion);
  if (existing) return existing;
  const req = fetch(
    `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/en_US/runesReforged.json`,
  )
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const trees = (await res.json()) as DDragonRuneTree[];
      const map: Record<number, { name: string; icon: string }> = {};
      for (const tree of trees) {
        map[tree.id] = { name: tree.name, icon: tree.icon };
        for (const slot of tree.slots) {
          for (const rune of slot.runes) {
            map[rune.id] = { name: rune.name, icon: rune.icon };
          }
        }
      }
      return map;
    })
    .catch(() => {
      const fallback: Record<number, { name: string; icon: string }> = {};
      for (const [id, icon] of Object.entries(RUNE_STYLE_ICON_FALLBACK)) {
        fallback[Number(id)] = { name: id, icon };
      }
      return fallback;
    });
  runeCache.set(ddVersion, req);
  return req;
}

export function profileIconUrl(iconId: number, ddVersion = LATEST_DDRAGON): string {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${iconId}.png`;
}

const champIdCache = new Map<string, Promise<Record<number, { id: string; name: string }>>>();

interface DDragonChampionMap {
  data?: Record<string, { id: string; key: string; name: string }>;
}

export function fetchChampionIdNameMap(
  ddVersion = LATEST_DDRAGON,
): Promise<Record<number, { id: string; name: string }>> {
  const existing = champIdCache.get(ddVersion);
  if (existing) return existing;
  const req = fetch(
    `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/en_US/champion.json`,
  )
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as DDragonChampionMap;
      const out: Record<number, { id: string; name: string }> = {};
      for (const entry of Object.values(payload.data ?? {})) {
        const numKey = Number(entry.key);
        if (Number.isFinite(numKey) && numKey > 0) {
          out[numKey] = { id: entry.id, name: entry.name };
        }
      }
      return out;
    })
    .catch(() => ({}));
  champIdCache.set(ddVersion, req);
  return req;
}
