-- AlterTable
ALTER TABLE `edit_requests` ADD COLUMN `settlementId` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `edit_requests_settlementId_idx` ON `edit_requests`(`settlementId`);

-- AddForeignKey
ALTER TABLE `edit_requests` ADD CONSTRAINT `edit_requests_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `settlements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
