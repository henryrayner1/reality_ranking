import type { Episode, EliminationEntry, Season } from "./Constants";
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
