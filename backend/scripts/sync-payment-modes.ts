import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_ENUM_VALUES = ['C_TO_C', 'DISCOUNT'] as const;

/** Retired modes → replacement */
const LEGACY_MIGRATION: Record<string, string> = {
  BANK_TRANSFER: 'C_TO_C',
  CARD: 'C_TO_C',
  CHEQUE: 'C_TO_C',
};

async function ensurePostgresEnumValues() {
  for (const val of NEW_ENUM_VALUES) {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TYPE "PaymentMode" ADD VALUE '${val}';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }
}

async function migratePaymentModeColumn(table: 'transactions' | 'transaction_payments' | 'expenses') {
  for (const [oldMode, newMode] of Object.entries(LEGACY_MIGRATION)) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "paymentMode" = '${newMode}'::"PaymentMode" WHERE "paymentMode"::text = '${oldMode}'`
    );
    void result;
  }
}

const MYSQL_PAYMENT_ENUM =
  "ENUM('CASH','UPI','C_TO_C','DISCOUNT','DUES','SPLIT','BANK_TRANSFER','CARD','CHEQUE')";
const MYSQL_PAYMENT_ENUM_FINAL = "ENUM('CASH','UPI','C_TO_C','DISCOUNT','DUES','SPLIT')";

async function migrateMysqlEnums() {
  for (const table of ['transactions', 'transaction_payments', 'expenses']) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` MODIFY \`paymentMode\` ${MYSQL_PAYMENT_ENUM} NOT NULL`
    );
  }
}

async function migrateMysqlColumn(table: string) {
  for (const [oldMode, newMode] of Object.entries(LEGACY_MIGRATION)) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${table}\` SET paymentMode = '${newMode}' WHERE paymentMode = '${oldMode}'`
    );
  }
}

async function finalizeMysqlEnums() {
  for (const table of ['transactions', 'transaction_payments', 'expenses']) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` MODIFY \`paymentMode\` ${MYSQL_PAYMENT_ENUM_FINAL} NOT NULL`
    );
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  const isPostgres = url.includes('postgres');

  if (isPostgres) {
    await ensurePostgresEnumValues();
    await migratePaymentModeColumn('transactions');
    await migratePaymentModeColumn('transaction_payments');
    await migratePaymentModeColumn('expenses');
  } else {
    await migrateMysqlEnums();
    for (const table of ['transactions', 'transaction_payments', 'expenses']) {
      await migrateMysqlColumn(table);
    }
    await finalizeMysqlEnums();
  }

  const counts = await Promise.all([
    prisma.transaction.groupBy({ by: ['paymentMode'], _count: { id: true } }),
    prisma.transactionPayment.groupBy({ by: ['paymentMode'], _count: { id: true } }),
    prisma.expense.groupBy({ by: ['paymentMode'], _count: { id: true } }),
  ]);

  console.log('✅ Payment modes synced');
  console.log('   Transactions:', counts[0].map((r) => `${r.paymentMode} (${r._count.id})`).join(', ') || 'none');
  console.log('   Split lines:', counts[1].map((r) => `${r.paymentMode} (${r._count.id})`).join(', ') || 'none');
  console.log('   Expenses:', counts[2].map((r) => `${r.paymentMode} (${r._count.id})`).join(', ') || 'none');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
