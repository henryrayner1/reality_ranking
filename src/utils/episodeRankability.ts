import type { Episode } from "./Constants";

// Assumed fixed episode runtime used to compute when ranking opens.
// Kept in sync by hand with backend/src/utils/episodeRankability.ts —
// check both if this assumption ever changes.
export const EPISODE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Episodes with no airDate are treated as "never rankable" rather than
// "always rankable" — the admin form requires an air date in practice, so
// this only matters for hypothetical bad data, and failing closed never
// leaks a spoiler.
export const getRankingOpensAt = (airDate: string | null | undefined): number => {
  if (!airDate) return Infinity;
  const airTimeMs = new Date(airDate).getTime();
  if (Number.isNaN(airTimeMs)) return Infinity;
  return airTimeMs + EPISODE_DURATION_MS;
};

export const isEpisodeRankable = (
  airDate: string | null | undefined,
  now: number = Date.now()
): boolean => now >= getRankingOpensAt(airDate);

// Convenience overloads that take the whole Episode object, since most call
// sites already have one.
export const getEpisodeRankingOpensAt = (episode: Pick<Episode, "airDate">): number =>
  getRankingOpensAt(episode.airDate);

export const isEpisodeRankableNow = (
  episode: Pick<Episode, "airDate">,
  now: number = Date.now()
): boolean => isEpisodeRankable(episode.airDate, now);

export const formatDuration = (ms: number): string => {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
