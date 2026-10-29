-- AlterTable
ALTER TABLE "Elimination" ADD COLUMN     "placement" INTEGER;

-- Existing winners and runners-up get the placement their type implies.
UPDATE "Elimination" SET "placement" = 1 WHERE "eliminationType" = 'WINNER';
UPDATE "Elimination" SET "placement" = 2 WHERE "eliminationType" = 'RUNNER_UP';
