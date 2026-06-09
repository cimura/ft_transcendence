-- CreateEnum
CREATE TYPE "RoomMode" AS ENUM ('ONLINE', 'LOCAL_CPU');

-- AlterTable
ALTER TABLE "GameRoom" ADD COLUMN "mode" "RoomMode" NOT NULL DEFAULT 'ONLINE';

-- CreateIndex
CREATE INDEX "GameRoom_mode_idx" ON "GameRoom"("mode");
