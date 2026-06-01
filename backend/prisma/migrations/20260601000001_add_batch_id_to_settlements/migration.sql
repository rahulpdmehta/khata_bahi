-- AlterTable
ALTER TABLE "settlements" ADD COLUMN "batchId" CHAR(36);

-- CreateIndex
CREATE INDEX "settlements_batchId_idx" ON "settlements"("batchId");
