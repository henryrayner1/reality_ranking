-- CreateEnum
CREATE TYPE "RankingMode" AS ENUM ('EPISODE', 'DAILY');

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "dayKey" TEXT;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "premiereDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "rankingMode" "RankingMode" NOT NULL DEFAULT 'EPISODE';

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_dayKey_key" ON "Episode"("seasonId", "dayKey");

