import { Prisma, PrismaClient } from "@prisma/client";

// DAILY-mode shows rank on an America/New_York (Eastern) calendar day, not
// per-episode — chosen since Big Brother (the first daily show) airs on a US
// schedule. Kept in sync by hand with src/utils/episodeRankability.ts on the
// frontend, which duplicates this exact timezone math — check both if this
// ever changes. Uses Intl.DateTimeFormat rather than a fixed UTC offset so
// DST transitions (Eastern flips between UTC-5 and UTC-4) are handled
// correctly.
const DAILY_TIME_ZONE = "America/New_York";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const getTodayDayKey = (now: Date = new Date()): string =>
  dayKeyFormatter.format(now); // "YYYY-MM-DD" in America/New_York

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

export const dayKeyToAirDate = (dayKey: string): Date => {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(getZonedMidnightMs(y, m, d));
};

// Pure Y/M/D calendar arithmetic on the "YYYY-MM-DD" string itself — no
// timezone conversion involved, since a dayKey is already just a calendar
// date. Avoids any DST-drift edge cases that walking in millisecond/Date
// space would introduce.
export const nextDayKey = (dayKey: string): string => {
  const [y, m, d] = dayKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const yyyy = String(next.getUTCFullYear()).padStart(4, "0");
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

// Ensures every calendar day from a DAILY-mode show's premiere through today
// has a day-row, backfilling any gap left by a stretch of time nobody visited
// the site and the scheduler wasn't running (e.g. server downtime). No-ops
// entirely for seasons with no premiereDate set, or whose premiereDate hasn't
// arrived yet — no rows are created before then. Only the row for *today*
// itself is a live/on-time creation (isBackfilled: false); every other newly
// created row represents a real missed day and never had a real ranking
// window, so it's flagged isBackfilled: true. Also re-numbers every episode
// in the season by dayKey order on every call — idempotent and self-healing,
// so it also fixes numbering for any legacy out-of-order data, not just
// newly-backfilled gaps.
export async function ensureTodaysDailyEpisode(
  prisma: PrismaClient,
  season: { id: string; premiereDate: Date | null; endDate: Date | null }
): Promise<void> {
  if (!season.premiereDate) return;

  const premiereKey = getTodayDayKey(season.premiereDate);
  const todayKey = getTodayDayKey();
  if (todayKey < premiereKey) return;
  // A season with an endDate gets no rows past the Eastern calendar day that
  // endDate falls on. Rows up to that day are still created (and, if the
  // server missed them live, flagged isBackfilled as usual below).
  const lastKey = season.endDate && getTodayDayKey(season.endDate) < todayKey
    ? getTodayDayKey(season.endDate)
    : todayKey;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.episode.findMany({
        where: { seasonId: season.id, dayKey: { not: null } },
        select: { dayKey: true },
      });
      const existingKeys = new Set(existing.map((e) => e.dayKey as string));

      for (let key = premiereKey; key <= lastKey; key = nextDayKey(key)) {
        if (existingKeys.has(key)) continue;
        await tx.episode.create({
          data: {
            id: Math.random().toString(36).slice(2, 8).toLowerCase(),
            seasonId: season.id,
            dayKey: key,
            airDate: dayKeyToAirDate(key),
            isBackfilled: key !== todayKey,
            episodeNumber: 0, // placeholder, corrected by the renumber pass below
          },
        });
      }

      const allEpisodes = await tx.episode.findMany({
        where: { seasonId: season.id, dayKey: { not: null } },
        select: { id: true, episodeNumber: true },
        orderBy: { dayKey: "asc" },
      });
      await Promise.all(
        allEpisodes.map((episode, index) => {
          const correctNumber = index + 1;
          if (episode.episodeNumber === correctNumber) return null;
          return tx.episode.update({ where: { id: episode.id }, data: { episodeNumber: correctNumber } });
        })
      );
    });
  } catch (error) {
    // A concurrent request/scheduler tick already created one of these rows —
    // the @@unique([seasonId, dayKey]) constraint is the actual guard here;
    // the next tick will pick up whatever's still missing and renumber again.
    if (!isUniqueConstraintError(error)) throw error;
  }
}

// Runs ensureTodaysDailyEpisode for every DAILY-mode show's current season.
// Shared by the read routes (so a page load can trigger it) and by the
// background scheduler in dailyEpisodeScheduler.ts (so it also happens
// without anyone visiting the site).
export async function ensureTodaysDailyEpisodesForAllShows(prisma: PrismaClient): Promise<void> {
  const dailyShows = await prisma.show.findMany({
    where: { rankingMode: "DAILY" },
    include: { seasons: { where: { isCurrent: true }, select: { id: true, premiereDate: true, endDate: true } } },
  });
  await Promise.all(
    dailyShows.flatMap((show) => show.seasons.map((season) => ensureTodaysDailyEpisode(prisma, season)))
  );
}
