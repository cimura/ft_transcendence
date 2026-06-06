/*
  Warnings:

  - A unique constraint covering the columns `[pairKey]` on the table `Friendship` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pairKey` to the `Friendship` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Friendship" ADD COLUMN     "pairKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_pairKey_key" ON "Friendship"("pairKey");
