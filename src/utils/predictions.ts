import type { Contestant, Episode, EliminationEntry, PredictionInsightsEpisode, Season } from "./Constants";
import { isSeasonEnded } from "./episodeRankability";

// Kept in sync by hand with backend/src/utils/predictions.ts. If the two
// drift, the page offers a prediction the server then rejects (or hides one
// it would accept).

type PredictionEpisode = Pick<Episode, "airDate" | "isPreSeason" | "isFinale" | "eliminationCount">;

// A prediction can be made (or changed) for an episode of a "By episode"
// show until the moment it airs, as long as somebody actually leaves in it
// (eliminationCount > 0) or it's the finale, and the season hasn't ended.
// DAILY shows aren't supported.
export const isPredictionOpen = (
  episode: PredictionEpisode,
  season: { endDate?: string | null },
  rankingMode: string | undefined,
  now: number = Date.now()
): boolean => {
  if (rankingMode === "DAILY") return false;
  if (episode.isPreSeason || !episode.airDate) return false;
  const airMs = new Date(episode.airDate).getTime();
  if (Number.isNaN(airMs) || now >= airMs) return false;
  if (isSeasonEnded(season, now)) return false;
  return !!episode.isFinale || (episode.eliminationCount ?? 1) > 0;
};

// Contestants still in the competition going into `episodeNumber`: everyone
// on the roster without an elimination on an earlier episode.
export const getRemainingContestantIds = (
  contestantIds: string[],
  eliminations: { contestantId: string; episodeNumber: number }[],
  episodeNumber: number
): string[] => {
  const gone = new Set(
    eliminations.filter((e) => e.episodeNumber < episodeNumber).map((e) => e.contestantId)
  );
  return contestantIds.filter((id) => !gone.has(id));
};

// The show tree (GET /api/shows/) embeds each episode's raw Elimination rows,
// not the grouped `Elimination` shape the Episode type claims.
export const getEpisodeEliminations = (episode: Episode): EliminationEntry[] =>
  (episode.eliminations ?? []) as unknown as EliminationEntry[];

export const getSeasonEliminations = (season: Season) =>
  (season.episodes ?? []).flatMap((ep) =>
    getEpisodeEliminations(ep).map((el) => ({ contestantId: el.contestantId, episodeNumber: ep.episodeNumber }))
  );

// Real (non-pre-season) episodes, in airing order.
export const getRealEpisodes = (season: Season): Episode[] =>
  [...(season.episodes ?? [])].filter((e) => !e.isPreSeason).sort((a, b) => a.episodeNumber - b.episodeNumber);

// The next episode users can predict, if any: the earliest still-open one.
export const getNextPredictableEpisode = (
  season: Season,
  rankingMode: string | undefined,
  now: number = Date.now()
): Episode | null =>
  getRealEpisodes(season).find((e) => isPredictionOpen(e, season, rankingMode, now)) ?? null;

// Episodes that have already aired (prediction window closed), newest first.
export const getAiredEpisodes = (season: Season, now: number = Date.now()): Episode[] =>
  getRealEpisodes(season)
    .filter((e) => !!e.airDate && new Date(e.airDate).getTime() <= now)
    .reverse();

// Seeds the order from the saved prediction, keeping only contestants still
// in it, then appends anyone missing in roster order.
export const seedFinaleOrder = (contestants: { id: string }[], saved: string[]): string[] => {
  const ids = contestants.map((c) => c.id);
  const kept = saved.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
};

// "A", "A and B", "A, B and C".
export const formatNameList = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export interface PredictionStanding {
  contestantId: string;
  votes: number;
  // Share of predictors who picked them (0-1). Can sum past 1 when an
  // episode eliminates several contestants and everyone picks several.
  percent: number;
  // 1 = most predicted to go home (finale: to win). Competition ranking
  // (1, 2, 2, 4), except that everyone tied for last gets the lowest
  // possible rank, the number of contestants still in, unless everyone is tied.
  rank: number;
}

// Standings for one aired episode: every contestant still in going into it
// (zero-vote ones included), most votes first, then by name.
export const getPredictionStandings = (
  agg: Pick<PredictionInsightsEpisode, "predictorCount" | "votes">,
  remaining: Pick<Contestant, "id" | "name">[]
): PredictionStanding[] => {
  const rows = remaining
    .map((c) => ({ contestantId: c.id, name: c.name, votes: agg.votes[c.id] ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  const lowest = rows.length ? rows[rows.length - 1].votes : 0;
  const allTied = rows.every((r) => r.votes === rows[0]?.votes);
  return rows.map((r) => ({
    contestantId: r.contestantId,
    votes: r.votes,
    percent: agg.predictorCount > 0 ? r.votes / agg.predictorCount : 0,
    rank: !allTied && r.votes === lowest
      ? rows.length
      : rows.findIndex((x) => x.votes === r.votes) + 1,
  }));
};

export interface FinaleStanding {
  contestantId: string;
  // Mean predicted placement (1 = winner) over the predictions that placed
  // them; null when nobody did.
  averagePlacement: number | null;
  // Share of predictors (0-1) who put them 1st, 2nd, 3rd and 4th or lower.
  // Sums to 1 unless some predictions left them out.
  shares: [number, number, number, number];
}

// A finale's consensus order: everyone still in going into it, lowest average
// predicted placement first (then more winner picks, then by name), with
// nobody-placed contestants last.
export const getFinaleStandings = (
  agg: Pick<PredictionInsightsEpisode, "predictorCount" | "votes" | "placementVotes">,
  remaining: Pick<Contestant, "id" | "name">[]
): FinaleStanding[] => {
  // A backend older than placementVotes only sent winner picks: treat them
  // as 1st places so the column still shows something sensible.
  const placementVotes = agg.placementVotes ??
    Object.fromEntries(Object.entries(agg.votes).map(([id, n]) => [id, [n]]));
  const share = (n: number) => (agg.predictorCount > 0 ? n / agg.predictorCount : 0);
  return remaining
    .map((c) => {
      const counts = placementVotes[c.id] ?? [];
      const total = counts.reduce((sum, n) => sum + n, 0);
      const weighted = counts.reduce((sum, n, i) => sum + n * (i + 1), 0);
      const rest = counts.slice(3).reduce((sum, n) => sum + n, 0);
      return {
        name: c.name,
        standing: {
          contestantId: c.id,
          averagePlacement: total > 0 ? weighted / total : null,
          shares: [share(counts[0] ?? 0), share(counts[1] ?? 0), share(counts[2] ?? 0), share(rest)],
        } as FinaleStanding,
      };
    })
    .sort((a, b) =>
      (a.standing.averagePlacement ?? Infinity) - (b.standing.averagePlacement ?? Infinity) ||
      b.standing.shares[0] - a.standing.shares[0] ||
      a.name.localeCompare(b.name)
    )
    .map((r) => r.standing);
};

// 1.4 -> "1.4", 2 -> "2"
export const formatAveragePlacement = (avg: number) => String(Math.round(avg * 10) / 10);

// Contestants still in going into an episode, as roster entries.
export const getRemainingContestants = (season: Season, episodeNumber: number): Contestant[] => {
  const ids = new Set(
    getRemainingContestantIds(season.contestants.map((c) => c.id), getSeasonEliminations(season), episodeNumber)
  );
  return season.contestants.filter((c) => ids.has(c.id));
};

// episodeNumber -> a contestant's prediction rank, for the trend chart.
export const getPredictionRanksFor = (
  contestantId: string,
  season: Season,
  insights: PredictionInsightsEpisode[]
): Map<number, number> => {
  const ranks = new Map<number, number>();
  for (const agg of insights) {
    if (agg.predictorCount === 0) continue;
    const standing = getPredictionStandings(agg, getRemainingContestants(season, agg.episodeNumber))
      .find((s) => s.contestantId === contestantId);
    if (standing) ranks.set(agg.episodeNumber, standing.rank);
  }
  return ranks;
};

// 0.625 -> "63%"
export const formatPercent = (percent: number) => `${Math.round(percent * 100)}%`;
