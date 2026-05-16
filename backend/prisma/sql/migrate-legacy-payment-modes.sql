-- Run against production Postgres when transactions API fails with
-- "Value 'BANK_TRANSFER' not found in enum 'PaymentMode'".
-- Usage: npx prisma db execute --file prisma/sql/migrate-legacy-payment-modes.sql --schema prisma/schema.prisma

DO $$ BEGIN
  ALTER TYPE "PaymentMode" ADD VALUE 'C_TO_C';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "PaymentMode" ADD VALUE 'DISCOUNT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

UPDATE "transactions"
SET "paymentMode" = 'C_TO_C'::"PaymentMode"
WHERE "paymentMode"::text IN ('BANK_TRANSFER', 'CARD', 'CHEQUE');

UPDATE "transaction_payments"
SET "paymentMode" = 'C_TO_C'::"PaymentMode"
WHERE "paymentMode"::text IN ('BANK_TRANSFER', 'CARD', 'CHEQUE');

UPDATE "expenses"
SET "paymentMode" = 'C_TO_C'::"PaymentMode"
WHERE "paymentMode"::text IN ('BANK_TRANSFER', 'CARD', 'CHEQUE');
