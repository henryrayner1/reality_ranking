-- Rename "Week" to "Episode" (and related columns/constraints), preserving existing data.
ALTER TABLE "Week" RENAME TO "Episode";
ALTER TABLE "Episode" RENAME COLUMN "weekNumber" TO "episodeNumber";
ALTER SEQUENCE "Week_weekNumber_seq" RENAME TO "Episode_episodeNumber_seq";
ALTER TABLE "Episode" RENAME CONSTRAINT "Week_pkey" TO "Episode_pkey";
ALTER TABLE "Episode" RENAME CONSTRAINT "Week_seasonId_fkey" TO "Episode_seasonId_fkey";

ALTER TABLE "Elimination" RENAME COLUMN "weekId" TO "episodeId";
ALTER TABLE "Elimination" RENAME CONSTRAINT "Elimination_weekId_fkey" TO "Elimination_episodeId_fkey";

ALTER TABLE "Ranking" RENAME COLUMN "weekId" TO "episodeId";
ALTER TABLE "Ranking" RENAME CONSTRAINT "Ranking_weekId_fkey" TO "Ranking_episodeId_fkey";
