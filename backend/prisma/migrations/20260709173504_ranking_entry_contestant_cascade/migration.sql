-- DropForeignKey
ALTER TABLE "RankingEntry" DROP CONSTRAINT "RankingEntry_contestantId_fkey";

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
