-- DropForeignKey
ALTER TABLE `edit_requests` DROP FOREIGN KEY `edit_requests_transactionId_fkey`;

-- AlterTable
ALTER TABLE `edit_requests` ADD COLUMN `expenseId` CHAR(36) NULL,
    ADD COLUMN `resourceType` VARCHAR(20) NOT NULL DEFAULT 'TRANSACTION',
    MODIFY `transactionId` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `edit_requests_expenseId_idx` ON `edit_requests`(`expenseId`);

-- AddForeignKey
ALTER TABLE `edit_requests` ADD CONSTRAINT `edit_requests_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edit_requests` ADD CONSTRAINT `edit_requests_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
