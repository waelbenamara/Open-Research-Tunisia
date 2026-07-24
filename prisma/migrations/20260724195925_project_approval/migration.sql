-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Project_approvalStatus_idx" ON "Project"("approvalStatus");

-- Projects that predate the review flow were already public: grandfather them in.
UPDATE "Project" SET "approvalStatus" = 'APPROVED';
