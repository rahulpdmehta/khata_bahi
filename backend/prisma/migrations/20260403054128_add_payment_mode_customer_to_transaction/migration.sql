-- AlterTable
ALTER TABLE `expenses` MODIFY `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DUES') NOT NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `customerMobile` VARCHAR(15) NULL,
    ADD COLUMN `customerName` VARCHAR(100) NULL,
    ADD COLUMN `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'DUES') NOT NULL DEFAULT 'CASH';
