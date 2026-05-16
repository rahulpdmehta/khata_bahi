import { PrismaClient } from '@prisma/client';

/** Retired DB values → current enum value */
const LEGACY_MODES = ['BANK_TRANSFER', 'CARD', 'CHEQUE'] as const;
const LEGACY_TARGET = 'C_TO_C';

const NEW_ENUM_VALUES = ['C_TO_C', 'DISCOUNT'] as const;

const LEGACY_MIGRATION: Record<string, string> = {
  BANK_TRANSFER: LEGACY_TARGET,
  CARD: LEGACY_TARGET,
  CHEQUE: LEGACY_TARGET,
};

function createMigrationClient() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL or DIRECT_URL must be set');
  }
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

async function ensurePostgresEnumValues(prisma: PrismaClient) {
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

async function migratePostgresPaymentModes(prisma: PrismaClient) {
  const tables = ['transactions', 'transaction_payments', 'expenses'] as const;
  const legacyList = LEGACY_MODES.map((m) => `'${m}'`).join(', ');

  for (const table of tables) {
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "${table}"
      SET "paymentMode" = '${LEGACY_TARGET}'::"PaymentMode"
      WHERE "paymentMode"::text IN (${legacyList})
    `);
    console.log(`   ${table}: migrated ${Number(updated)} legacy row(s)`);
  }
}

const MYSQL_PAYMENT_ENUM =
  "ENUM('CASH','UPI','C_TO_C','DISCOUNT','DUES','SPLIT','BANK_TRANSFER','CARD','CHEQUE')";
const MYSQL_PAYMENT_ENUM_FINAL = "ENUM('CASH','UPI','C_TO_C','DISCOUNT','DUES','SPLIT')";

async function migrateMysqlPaymentModes(prisma: PrismaClient) {
  for (const table of ['transactions', 'transaction_payments', 'expenses']) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` MODIFY \`paymentMode\` ${MYSQL_PAYMENT_ENUM} NOT NULL`
    );
  }

  for (const table of ['transactions', 'transaction_payments', 'expenses']) {
    for (const [oldMode, newMode] of Object.entries(LEGACY_MIGRATION)) {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE \`${table}\` SET paymentMode = '${newMode}' WHERE paymentMode = '${oldMode}'`
      );
      const count = Number(result);
      if (count > 0) {
        console.log(`   ${table}: migrated ${count} row(s) from ${oldMode}`);
      }
    }
  }

  for (const table of ['transactions', 'transaction_payments', 'expenses']) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` MODIFY \`paymentMode\` ${MYSQL_PAYMENT_ENUM_FINAL} NOT NULL`
    );
  }
}

async function main() {
  const prisma = createMigrationClient();
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  const isPostgres = url.includes('postgres');

  try {
    console.log('🔄 Syncing payment modes...');
    if (isPostgres) {
      await ensurePostgresEnumValues(prisma);
      await migratePostgresPaymentModes(prisma);
    } else {
      await migrateMysqlPaymentModes(prisma);
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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
