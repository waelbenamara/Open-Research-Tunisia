-- CreateTable
CREATE TABLE "CodeProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT,
    "sourceRef" TEXT,
    "commitSha" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" INTEGER NOT NULL DEFAULT 0,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "workshopId" TEXT,
    "projectId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "binary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CodeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeProject_workshopId_idx" ON "CodeProject"("workshopId");

-- CreateIndex
CREATE INDEX "CodeProject_projectId_idx" ON "CodeProject"("projectId");

-- CreateIndex
CREATE INDEX "CodeFile_projectId_idx" ON "CodeFile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeFile_projectId_path_key" ON "CodeFile"("projectId", "path");

-- AddForeignKey
ALTER TABLE "CodeProject" ADD CONSTRAINT "CodeProject_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeProject" ADD CONSTRAINT "CodeProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeProject" ADD CONSTRAINT "CodeProject_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeFile" ADD CONSTRAINT "CodeFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CodeProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
