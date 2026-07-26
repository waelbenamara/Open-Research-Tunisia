-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "typingAt" TIMESTAMP(3),
ADD COLUMN     "typingToId" TEXT;
