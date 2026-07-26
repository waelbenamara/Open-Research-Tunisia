-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastDigestAt" TIMESTAMP(3);
