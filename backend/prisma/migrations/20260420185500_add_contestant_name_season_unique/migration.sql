/*
  Warnings:

  - A unique constraint covering the columns `[name,seasonId]` on the table `Contestant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contestant_name_seasonId_key" ON "Contestant"("name", "seasonId");
