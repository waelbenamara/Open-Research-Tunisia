-- AlterTable
ALTER TABLE "Output" ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "fileSize" INTEGER;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "meetingId" TEXT;

-- CreateIndex
CREATE INDEX "Resource_meetingId_idx" ON "Resource"("meetingId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
