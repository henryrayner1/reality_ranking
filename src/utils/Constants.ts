export interface ModalProps {
  displayFlag: boolean;
  setDisplayFlag: (flag: boolean) => void;
  initialIsLogin?: boolean;
}

export interface Ranking {
  id: string;
  userId: string;
  episodeId: string;
  type: string;
  entries: { contestantId: string; position: number }[];
  episode?: Episode;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonId: string;
  season?: Season;
  airDate?: string;
  dayKey?: string | null;
  eliminations?: Elimination[];
}

export const RankTypes = {
  FAVORITE: "FAVORITE",
  WINNER: "WINNER"
};

export type RankType = keyof typeof RankTypes;

export const AccountTypes = {
  ADMIN: "ADMIN",
  USER: "USER"
} as const;

export type AccountType = typeof AccountTypes[keyof typeof AccountTypes];

export const dwts_nameToImage: Record<number, Record<string,string>> = {
  34:  {
    "Jen": "./src/assets/DWTS/season_34/jen.jpg",
    "Hilaria": "./src/assets/DWTS/season_34/hilaria.jpg",
    "Jordan": "./src/assets/DWTS/season_34/jordan.jpg",    
    "Baron": "./src/assets/DWTS/season_34/baron.jpg",
    "Alix": "./src/assets/DWTS/season_34/alix.jpg",
    "Dylan": "./src/assets/DWTS/season_34/dylan.jpg",
    "Corey": "./src/assets/DWTS/season_34/corey.jpg",
    "Danielle": "./src/assets/DWTS/season_34/danielle.jpg",
    "Elaine": "./src/assets/DWTS/season_34/elaine.jpg",
    "Scott": "./src/assets/DWTS/season_34/scott.jpg",
    "Robert": "./src/assets/DWTS/season_34/robert.jpg",
    "Lauren": "./src/assets/DWTS/season_34/lauren.jpg",
    "Whitney": "./src/assets/DWTS/season_34/whitney.jpg",
    "Andy": "./src/assets/DWTS/season_34/andy.jpg"
  }
};

export const rpdr_nameToImage: Record<number, Record<string,string>> = {
  18: {
    "Athena": "./src/assets/RPDR/season_18/athena.png",
    "Briar": "./src/assets/RPDR/season_18/briar.png",
    "Ciara": "./src/assets/RPDR/season_18/ciara.png",
    "Darlene": "./src/assets/RPDR/season_18/darlene.png",
    "DD": "./src/assets/RPDR/season_18/dd.png",
    "Discord": "./src/assets/RPDR/season_18/discord.png",
    "Jane": "./src/assets/RPDR/season_18/jane.png",
    "Juicy": "./src/assets/RPDR/season_18/juicy.png",
    "Kenya": "./src/assets/RPDR/season_18/kenya.png",
    "Mandy": "./src/assets/RPDR/season_18/mandy.png",
    "Mia": "./src/assets/RPDR/season_18/mia.png",
    "Myki": "./src/assets/RPDR/season_18/myki.png",
    "Nini": "./src/assets/RPDR/season_18/nini.png",
    "Vita": "./src/assets/RPDR/season_18/vita.png"
  }
};

export const nameToImage: Record<string,Record<string, Record<string,string>>> = {
  "dwts": dwts_nameToImage,
  "rpdr": rpdr_nameToImage
}

export const totalDancers = Object.keys(dwts_nameToImage[34]).length;

export const elimintatedDancers = {
  1: [],
  2: ["Corey", "Baron"],
  3: ["Corey", "Baron", "Lauren"],
  4: ["Corey", "Baron", "Lauren", "Hilaria"],
}

export const RankingModes = {
  EPISODE: "EPISODE",
  DAILY: "DAILY",
} as const;

export type RankingMode = typeof RankingModes[keyof typeof RankingModes];

export interface Show {
  id: string;
  name: string;
  seasons?: Season[];
  currSeason: number;
  network?: string;
  rankingMode?: RankingMode;
}

export interface Season {
  id: string;
  showId: string;
  isCurrent: boolean;
  contestants: Contestant[];
  seasonNumber: number;
  episodes?: Episode[];
  premiereDate?: string | null;
}

export interface Contestant {
  id: string;
  name: string;
  seasonId: string;
  photoUrl?: string;
  status?: 'ACTIVE' | 'ELIMINATED';
}

export const EliminationTypes = {
  ELIMINATED: "ELIMINATED",
  QUIT: "QUIT",
  MEDICAL: "MEDICAL",
  WINNER: "WINNER",
  RUNNER_UP: "RUNNER_UP",
} as const;

export type EliminationType = typeof EliminationTypes[keyof typeof EliminationTypes];

// Episode-grouped shape returned by GET /api/eliminations/
export interface Elimination {
  episodeId: string;
  episodeNumber: number;
  contestantIds: string[];
  eliminationType: string;
}

// Single elimination record, e.g. from GET /api/eliminations/bySeason/:seasonId
export interface EliminationEntry {
  id: string;
  episodeId: string;
  contestantId: string;
  eliminationType: EliminationType;
}

// Shape returned by GET /api/rankings/insights/:seasonId
export interface InsightsEpisode {
  episodeId: string;
  episodeNumber: number;
  contestantAverages: { contestantId: string; averagePosition: number }[];
}

export interface InsightsOverall {
  contestantId: string;
  overallAveragePosition: number | null;
}

export interface InsightsResponse {
  seasonId: string;
  type: RankType;
  episodes: InsightsEpisode[];
  overall: InsightsOverall[];
}
