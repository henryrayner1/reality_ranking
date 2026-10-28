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

// DAILY-mode shows: rankable once the row's dayKey has opened (today or
// earlier, America/New_York calendar day) — stays rankable afterward,
// mirroring isEpisodeRankable, so a user can still submit for a past day
// they haven't ranked yet.
export const isDailyRankable = (
  dayKey: string | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!dayKey) return false;
  return dayKey <= getTodayDayKey(new Date(now));
};

export const isRankableNow = (
  episode: { airDate: Date | string | null; dayKey?: string | null },
  rankingMode: "EPISODE" | "DAILY",
  now: number = Date.now()
): boolean =>
  rankingMode === "DAILY"
    ? isDailyRankable(episode.dayKey, now)
    : isEpisodeRankable(episode.airDate, now);

// A season with an endDate stops accepting rankings at that exact moment
// (date + time, chosen by an admin) — independent of whether an individual
// episode is open (isRankableNow) or backfilled. No endDate => never ends.
// Kept in sync by hand with src/utils/episodeRankability.ts on the frontend.
export const isSeasonEnded = (
  season: { endDate?: Date | string | null },
  now: number = Date.now()
): boolean => {
  if (!season.endDate) return false;
  const endMs = new Date(season.endDate).getTime();
  return !Number.isNaN(endMs) && now >= endMs;
};

// Pre-season ranking (the season's Episode.isPreSeason row) is open from the
// season's startDate until its first real episode airs: the earliest airDate
// among its other episodes (DAILY day rows carry their Eastern-midnight
// airDate too), or its premiereDate, whichever comes first. With nothing
// scheduled yet it stays open. No startDate => no pre-season at all.
// Kept in sync by hand with src/utils/episodeRankability.ts on the frontend.
export const getFirstAirMs = (season: {
  premiereDate?: Date | string | null;
  episodes: { airDate: Date | string | null; isPreSeason?: boolean }[];
}): number => {
  const times = [season.premiereDate, ...season.episodes.filter((e) => !e.isPreSeason).map((e) => e.airDate)]
    .filter((d): d is Date | string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((ms) => !Number.isNaN(ms));
  return times.length ? Math.min(...times) : Infinity;
};

export const isPreSeasonOpen = (
  season: {
    startDate?: Date | string | null;
    premiereDate?: Date | string | null;
    episodes: { airDate: Date | string | null; isPreSeason?: boolean }[];
  },
  now: number = Date.now()
): boolean => {
  if (!season.startDate) return false;
  const startMs = new Date(season.startDate).getTime();
  if (Number.isNaN(startMs) || now < startMs) return false;
  return now < getFirstAirMs(season);
};
