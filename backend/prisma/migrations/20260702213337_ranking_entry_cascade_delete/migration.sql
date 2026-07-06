-- DropForeignKey
ALTER TABLE "RankingEntry" DROP CONSTRAINT "RankingEntry_rankingId_fkey";

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
