/*
  Warnings:

  - You are about to drop the `RoomMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoomMessage" DROP CONSTRAINT "RoomMessage_senderId_fkey";

-- DropTable
DROP TABLE "RoomMessage";
