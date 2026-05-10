-- AlterTable
ALTER TABLE `expenses` MODIFY `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DUES', 'SPLIT') NOT NULL;

-- AlterTable
ALTER TABLE `transactions` MODIFY `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DUES', 'SPLIT') NOT NULL DEFAULT 'CASH';

-- CreateTable
CREATE TABLE `transaction_payments` (
    `id` CHAR(36) NOT NULL,
    `transactionId` CHAR(36) NOT NULL,
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DUES', 'SPLIT') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,

    INDEX `transaction_payments_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transaction_payments` ADD CONSTRAINT `transaction_payments_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
