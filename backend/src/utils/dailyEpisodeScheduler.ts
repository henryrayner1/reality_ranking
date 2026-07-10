import { PrismaClient } from "@prisma/client";
import { ensureTodaysDailyEpisodesForAllShows } from "./dailyEpisode.js";

// Server runs as a single long-lived Node process (not serverless), so a
// plain setInterval is enough — no cron dependency needed. Polling every 5
// minutes (rather than scheduling a precise setTimeout to the next UTC
// midnight) keeps this simple and self-healing: it doesn't need to be
// re-armed each day, and it catches up on its own after any downtime,
// including downtime spanning a midnight rollover.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function startDailyEpisodeScheduler(prisma: PrismaClient): void {
  const tick = () => {
    ensureTodaysDailyEpisodesForAllShows(prisma).catch((error) => {
      console.error("Daily episode scheduler tick failed:", error);
    });
  };

  tick(); // run immediately on boot so a restart shortly after midnight catches up right away
  setInterval(tick, POLL_INTERVAL_MS);
}
