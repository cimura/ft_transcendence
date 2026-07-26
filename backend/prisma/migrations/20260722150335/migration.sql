/*
  Warnings:

  - You are about to drop the `GameRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoomParticipant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GameRoom" DROP CONSTRAINT "GameRoom_hostId_fkey";

-- DropForeignKey
ALTER TABLE "RoomInvitation" DROP CONSTRAINT "RoomInvitation_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomMessage" DROP CONSTRAINT "RoomMessage_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomParticipant" DROP CONSTRAINT "RoomParticipant_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomParticipant" DROP CONSTRAINT "RoomParticipant_userId_fkey";

-- DropTable
DROP TABLE "GameRoom";

-- DropTable
DROP TABLE "RoomParticipant";

-- DropEnum
DROP TYPE "RoomMode";

-- DropEnum
DROP TYPE "RoomStatus";
