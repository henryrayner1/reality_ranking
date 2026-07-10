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

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

// Finds or creates today's day-row for a DAILY-mode show's season, if the
// season has premiered. No-ops entirely for seasons with no premiereDate set,
// or whose premiereDate hasn't arrived yet — no rows are created before then.
export async function ensureTodaysDailyEpisode(
  prisma: PrismaClient,
  season: { id: string; premiereDate: Date | null }
): Promise<void> {
  if (!season.premiereDate) return;

  const todayKey = getTodayDayKey();
  if (todayKey < getTodayDayKey(season.premiereDate)) return;

  const existing = await prisma.episode.findUnique({
    where: { seasonId_dayKey: { seasonId: season.id, dayKey: todayKey } },
  });
  if (existing) return;

  const count = await prisma.episode.count({ where: { seasonId: season.id } });
  try {
    await prisma.episode.create({
      data: {
        id: Math.random().toString(36).slice(2, 8).toLowerCase(),
        seasonId: season.id,
        dayKey: todayKey,
        airDate: dayKeyToAirDate(todayKey),
        episodeNumber: count + 1,
      },
    });
  } catch (error) {
    // A concurrent request already created today's row — the
    // @@unique([seasonId, dayKey]) constraint is the actual guard here.
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
    include: { seasons: { where: { isCurrent: true }, select: { id: true, premiereDate: true } } },
  });
  await Promise.all(
    dailyShows.flatMap((show) => show.seasons.map((season) => ensureTodaysDailyEpisode(prisma, season)))
  );
}
