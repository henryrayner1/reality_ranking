import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureTodaysDailyEpisodesForAllShows } from "../src/utils/dailyEpisode.js";

// One-time (re-runnable) manual trigger for the same backfill/renumber logic
// that runs automatically via dailyEpisodeScheduler.ts and the GET routes —
// useful to fix existing gaps immediately instead of waiting for the next
// scheduler tick or page load. Safe to run any number of times.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dailyShows = await prisma.show.findMany({
    where: { rankingMode: "DAILY" },
    include: {
      seasons: {
        where: { isCurrent: true },
        include: { episodes: { where: { dayKey: { not: null } }, orderBy: { dayKey: "asc" } } },
      },
    },
  });

  const before = new Map(
    dailyShows.map((show) => [
      show.id,
      new Map(show.seasons.map((season) => [season.id, season.episodes.map((e) => ({ dayKey: e.dayKey, episodeNumber: e.episodeNumber, isBackfilled: e.isBackfilled }))])),
    ])
  );

  await ensureTodaysDailyEpisodesForAllShows(prisma);

  const after = await prisma.show.findMany({
    where: { rankingMode: "DAILY" },
    include: {
      seasons: {
        where: { isCurrent: true },
        include: { episodes: { where: { dayKey: { not: null } }, orderBy: { dayKey: "asc" } } },
      },
    },
  });

  for (const show of after) {
    for (const season of show.seasons) {
      const beforeRows = before.get(show.id)?.get(season.id) ?? [];
      const beforeKeys = new Set(beforeRows.map((r) => r.dayKey));
      const created = season.episodes.filter((e) => !beforeKeys.has(e.dayKey));
      const renumbered = season.episodes.filter((e) => {
        const prev = beforeRows.find((r) => r.dayKey === e.dayKey);
        return prev && prev.episodeNumber !== e.episodeNumber;
      });

      console.log(`\n${show.name} — season ${season.seasonNumber} (${season.id})`);
      console.log(`  total days: ${season.episodes.length}`);
      if (created.length > 0) {
        console.log(`  created ${created.length} day(s):`);
        for (const e of created) {
          console.log(`    ${e.dayKey}  Day ${e.episodeNumber}  isBackfilled=${e.isBackfilled}`);
        }
      } else {
        console.log("  no days created (no gap)");
      }
      if (renumbered.length > 0) {
        console.log(`  renumbered ${renumbered.length} existing day(s):`);
        for (const e of renumbered) {
          const prev = beforeRows.find((r) => r.dayKey === e.dayKey);
          console.log(`    ${e.dayKey}  Day ${prev?.episodeNumber} -> Day ${e.episodeNumber}`);
        }
      }
    }
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
