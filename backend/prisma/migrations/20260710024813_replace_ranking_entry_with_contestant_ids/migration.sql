-- AlterTable
ALTER TABLE "Ranking" ADD COLUMN     "contestantIds" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill contestantIds from existing RankingEntry rows, preserving order by position
UPDATE "Ranking" r
SET "contestantIds" = sub.ids
FROM (
  SELECT "rankingId", array_agg("contestantId" ORDER BY "position") AS ids
  FROM "RankingEntry"
  GROUP BY "rankingId"
) sub
WHERE r.id = sub."rankingId";

-- DropForeignKey
ALTER TABLE "RankingEntry" DROP CONSTRAINT "RankingEntry_contestantId_fkey";

-- DropForeignKey
ALTER TABLE "RankingEntry" DROP CONSTRAINT "RankingEntry_rankingId_fkey";

-- DropTable
DROP TABLE "RankingEntry";
