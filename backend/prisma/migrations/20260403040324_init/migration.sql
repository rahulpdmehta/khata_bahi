-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'STAFF') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `centers` (
    `id` CHAR(36) NOT NULL,
    `centerCode` VARCHAR(20) NOT NULL,
    `centerName` VARCHAR(100) NOT NULL,
    `address` TEXT NULL,
    `contactNumber` VARCHAR(15) NULL,
    `email` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `centers_centerCode_key`(`centerCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_centers` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `centerId` CHAR(36) NOT NULL,
    `assignedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_centers_userId_idx`(`userId`),
    INDEX `user_centers_centerId_idx`(`centerId`),
    UNIQUE INDEX `user_centers_userId_centerId_key`(`userId`, `centerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `income_sources` (
    `id` CHAR(36) NOT NULL,
    `sourceName` VARCHAR(100) NOT NULL,
    `sourceCode` VARCHAR(20) NOT NULL,
    `defaultAmount` DECIMAL(10, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `income_sources_sourceCode_key`(`sourceCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_types` (
    `id` CHAR(36) NOT NULL,
    `typeName` VARCHAR(50) NOT NULL,
    `typeCode` VARCHAR(20) NOT NULL,
    `baseCharge` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `vehicle_types_typeCode_key`(`typeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_categories` (
    `id` CHAR(36) NOT NULL,
    `categoryName` VARCHAR(100) NOT NULL,
    `categoryCode` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `approvalThreshold` DECIMAL(10, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `expense_categories_categoryCode_key`(`categoryCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` CHAR(36) NOT NULL,
    `expenseNumber` VARCHAR(50) NOT NULL,
    `centerId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `categoryId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE') NOT NULL,
    `vendorName` VARCHAR(200) NULL,
    `description` TEXT NULL,
    `receiptUrl` VARCHAR(500) NULL,
    `expenseDate` DATE NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` CHAR(36) NULL,
    `approvedAt` DATETIME(0) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,

    UNIQUE INDEX `expenses_expenseNumber_key`(`expenseNumber`),
    INDEX `expenses_centerId_expenseDate_idx`(`centerId`, `expenseDate`),
    INDEX `expenses_userId_idx`(`userId`),
    INDEX `expenses_categoryId_idx`(`categoryId`),
    INDEX `expenses_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` CHAR(36) NOT NULL,
    `transactionNumber` VARCHAR(50) NOT NULL,
    `centerId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `vehicleTypeId` CHAR(36) NULL,
    `vehicleNumber` VARCHAR(20) NULL,
    `incomeSourceId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `transactionDate` DATE NOT NULL,
    `transactionTime` TIME(0) NOT NULL,
    `notes` TEXT NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdBy` CHAR(36) NULL,
    `updatedAt` DATETIME(0) NOT NULL,
    `updatedBy` CHAR(36) NULL,

    UNIQUE INDEX `transactions_transactionNumber_key`(`transactionNumber`),
    INDEX `transactions_centerId_transactionDate_idx`(`centerId`, `transactionDate`),
    INDEX `transactions_userId_idx`(`userId`),
    INDEX `transactions_incomeSourceId_idx`(`incomeSourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edit_requests` (
    `id` CHAR(36) NOT NULL,
    `transactionId` CHAR(36) NOT NULL,
    `requestedBy` CHAR(36) NOT NULL,
    `requestReason` TEXT NOT NULL,
    `originalData` JSON NOT NULL,
    `proposedChanges` JSON NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` CHAR(36) NULL,
    `reviewNotes` TEXT NULL,
    `requestedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewedAt` DATETIME(0) NULL,

    INDEX `edit_requests_status_idx`(`status`),
    INDEX `edit_requests_transactionId_idx`(`transactionId`),
    INDEX `edit_requests_requestedBy_idx`(`requestedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settlements` (
    `id` CHAR(36) NOT NULL,
    `settlementNumber` VARCHAR(50) NOT NULL,
    `centerId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `settlementDate` DATE NOT NULL,
    `totalIncome` DECIMAL(10, 2) NOT NULL,
    `totalExpenses` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `netAmount` DECIMAL(10, 2) NOT NULL,
    `carryForwardAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `finalAmount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` CHAR(36) NULL,
    `approvedAt` DATETIME(0) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `settlements_settlementNumber_key`(`settlementNumber`),
    INDEX `settlements_centerId_settlementDate_idx`(`centerId`, `settlementDate`),
    INDEX `settlements_status_idx`(`status`),
    UNIQUE INDEX `settlements_centerId_settlementDate_key`(`centerId`, `settlementDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `action` VARCHAR(50) NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` CHAR(36) NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `audit_logs_userId_action_createdAt_idx`(`userId`, `action`, `createdAt`),
    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_centers` ADD CONSTRAINT `user_centers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_centers` ADD CONSTRAINT `user_centers_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `centers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `centers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `expense_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `centers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_vehicleTypeId_fkey` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_incomeSourceId_fkey` FOREIGN KEY (`incomeSourceId`) REFERENCES `income_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edit_requests` ADD CONSTRAINT `edit_requests_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edit_requests` ADD CONSTRAINT `edit_requests_requestedBy_fkey` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edit_requests` ADD CONSTRAINT `edit_requests_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_centerId_fkey` FOREIGN KEY (`centerId`) REFERENCES `centers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
