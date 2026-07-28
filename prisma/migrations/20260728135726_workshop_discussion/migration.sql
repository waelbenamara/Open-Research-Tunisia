-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "workshopId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Message_workshopId_idx" ON "Message"("workshopId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
