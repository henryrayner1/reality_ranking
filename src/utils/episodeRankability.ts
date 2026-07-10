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

// DAILY-mode shows rank on an America/New_York (Eastern) calendar day, not
// per-episode — chosen since Big Brother (the first daily show) airs on a US
// schedule. Kept in sync by hand with backend/src/utils/dailyEpisode.ts,
// which duplicates this exact timezone math — check both if this ever
// changes. Uses Intl.DateTimeFormat rather than a fixed UTC offset so DST
// transitions (Eastern flips between UTC-5 and UTC-4) are handled correctly.
const DAILY_TIME_ZONE = "America/New_York";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const getTodayDayKey = (now: number = Date.now()): string =>
  dayKeyFormatter.format(new Date(now)); // "YYYY-MM-DD" in America/New_York

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// ms to add to a UTC instant to get its America/New_York wall-clock reading
// (expressed as if that reading were itself a UTC timestamp). Negative
// during both EST (-5h) and EDT (-4h), since Eastern is behind UTC.
const getZonedOffsetMs = (instantMs: number): number => {
  const parts = zonedPartsFormatter.formatToParts(new Date(instantMs)).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return asUTC - instantMs;
};

// UTC epoch ms of America/New_York midnight (00:00:00) on the given
// calendar date. Two-pass offset correction so this stays correct across a
// DST transition, not just a naive UTC-guess +/- a fixed offset.
const getZonedMidnightMs = (year: number, month: number, day: number): number => {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = getZonedOffsetMs(guess);
  let target = guess - offset;
  const offsetAtTarget = getZonedOffsetMs(target);
  if (offsetAtTarget !== offset) target = guess - offsetAtTarget;
  return target;
};

// Exposed so the admin "premiere date" input (a plain date, no timezone)
// can be stored as Eastern midnight rather than UTC midnight — otherwise a
// UTC-midnight timestamp reads as the *previous* Eastern evening, which
// would open the daily-ranking gate a day early. See AdminSeasons.tsx.
export const dayKeyToEasternMidnightMs = (dayKey: string): number => {
  const [y, m, d] = dayKey.split("-").map(Number);
  return getZonedMidnightMs(y, m, d);
};

export const isDailyRankable = (
  dayKey: string | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!dayKey) return false;
  // Once a day's row opens it stays rankable forever after, mirroring
  // isEpisodeRankable — otherwise past days drop out of rankableEpisodes
  // entirely instead of surfacing as read-only pastRankings columns.
  return dayKey <= getTodayDayKey(now);
};

// Next America/New_York-midnight timestamp after `now` — when today's daily
// ranking resets and a fresh day's row opens up.
export const getDailyResetAt = (now: number = Date.now()): number => {
  const [y, m, d] = getTodayDayKey(now).split("-").map(Number);
  return getZonedMidnightMs(y, m, d + 1);
};

export const isRankableNow = (
  episode: Pick<Episode, "airDate" | "dayKey">,
  rankingMode: "EPISODE" | "DAILY",
  now: number = Date.now()
): boolean =>
  rankingMode === "DAILY"
    ? isDailyRankable(episode.dayKey, now)
    : isEpisodeRankable(episode.airDate, now);

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
