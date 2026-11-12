import { isSeasonEnded } from "./episodeRankability.js";

// Kept in sync by hand with src/utils/predictions.ts on the frontend. If the
// two drift, the page offers a prediction the server then rejects (or hides
// one it would accept).

type PredictionEpisode = {
  airDate: Date | string | null;
  isPreSeason?: boolean;
  isFinale?: boolean;
  eliminationCount?: number;
};

// A prediction can be made (or changed) for an episode of a "By episode"
// show until the moment it airs, as long as somebody actually leaves in it
// (eliminationCount > 0) or it's the finale, and the season hasn't ended.
// DAILY shows aren't supported.
export const isPredictionOpen = (
  episode: PredictionEpisode,
  season: { endDate?: Date | string | null },
  rankingMode: "EPISODE" | "DAILY",
  now: number = Date.now()
): boolean => {
  if (rankingMode !== "EPISODE") return false;
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
