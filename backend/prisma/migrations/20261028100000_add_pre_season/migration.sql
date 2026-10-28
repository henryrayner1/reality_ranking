-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "isPreSeason" BOOLEAN NOT NULL DEFAULT false;
