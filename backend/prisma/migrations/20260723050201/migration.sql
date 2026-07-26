/*
  Warnings:

  - You are about to drop the `RoomInvitation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoomInvitation" DROP CONSTRAINT "RoomInvitation_inviteeId_fkey";

-- DropForeignKey
ALTER TABLE "RoomInvitation" DROP CONSTRAINT "RoomInvitation_inviterId_fkey";

-- DropTable
DROP TABLE "RoomInvitation";

-- DropEnum
DROP TYPE "RoomInvitationStatus";
