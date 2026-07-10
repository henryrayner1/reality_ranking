import { getTodayDayKey } from "./dailyEpisode.js";

// Kept in sync by hand with src/utils/episodeRankability.ts on the frontend.
// If this drifts, the two apps disagree about when an episode opens for
// ranking — check both when changing episode-duration assumptions.
export const EPISODE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const isEpisodeRankable = (
  airDate: Date | string | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!airDate) return false; // no airDate => never rankable, matches frontend default
  const airTimeMs = new Date(airDate).getTime();
  if (Number.isNaN(airTimeMs)) return false;
  return now >= airTimeMs + EPISODE_DURATION_MS;
};

// DAILY-mode shows: rankable iff the row's dayKey is today (America/New_York calendar day).
export const isDailyRankable = (
  dayKey: string | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!dayKey) return false;
  return dayKey === getTodayDayKey(new Date(now));
};

export const isRankableNow = (
  episode: { airDate: Date | string | null; dayKey?: string | null },
  rankingMode: "EPISODE" | "DAILY",
  now: number = Date.now()
): boolean =>
  rankingMode === "DAILY"
    ? isDailyRankable(episode.dayKey, now)
    : isEpisodeRankable(episode.airDate, now);
