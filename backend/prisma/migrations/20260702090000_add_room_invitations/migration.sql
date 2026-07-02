-- CreateEnum
CREATE TYPE "RoomInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RoomInvitation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "RoomInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomInvitation_roomId_idx" ON "RoomInvitation"("roomId");

-- CreateIndex
CREATE INDEX "RoomInvitation_inviterId_idx" ON "RoomInvitation"("inviterId");

-- CreateIndex
CREATE INDEX "RoomInvitation_inviteeId_idx" ON "RoomInvitation"("inviteeId");

-- CreateIndex
CREATE INDEX "RoomInvitation_status_idx" ON "RoomInvitation"("status");

-- CreateIndex
CREATE INDEX "RoomInvitation_inviteeId_status_createdAt_idx" ON "RoomInvitation"("inviteeId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "RoomInvitation" ADD CONSTRAINT "RoomInvitation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomInvitation" ADD CONSTRAINT "RoomInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomInvitation" ADD CONSTRAINT "RoomInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
