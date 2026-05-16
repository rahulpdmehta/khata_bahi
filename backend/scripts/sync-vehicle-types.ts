import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CANONICAL_VEHICLE_TYPES = [
  { typeName: 'Two Wheeler', typeCode: '2W', baseCharge: 50 },
  { typeName: 'Three Wheeler', typeCode: '3W', baseCharge: 80 },
  { typeName: 'Four Wheeler - LMV', typeCode: '4W_LMV', baseCharge: 120 },
  { typeName: 'Four Wheeler - MCV', typeCode: '4W_MCV', baseCharge: 200 },
  { typeName: 'Commercial - HCV', typeCode: 'COMMERCIAL_HCV', baseCharge: 300 },
] as const;

/** Map retired type codes to their replacement */
const LEGACY_CODE_MIGRATION: Record<string, string> = {
  '4W_PETROL': '4W_LMV',
  '4W_DIESEL': '4W_MCV',
  COMMERCIAL_LIGHT: '4W_MCV',
  COMMERCIAL_HEAVY: 'COMMERCIAL_HCV',
};

async function main() {
  for (const vt of CANONICAL_VEHICLE_TYPES) {
    await prisma.vehicleType.upsert({
      where: { typeCode: vt.typeCode },
      create: { ...vt, isActive: true },
      update: { typeName: vt.typeName, baseCharge: vt.baseCharge, isActive: true },
    });
  }

  const allTypes = await prisma.vehicleType.findMany();
  const idByCode = new Map(allTypes.map((t) => [t.typeCode, t.id]));

  for (const [oldCode, newCode] of Object.entries(LEGACY_CODE_MIGRATION)) {
    const oldId = idByCode.get(oldCode);
    const newId = idByCode.get(newCode);
    if (!oldId || !newId || oldId === newId) continue;

    const { count } = await prisma.transaction.updateMany({
      where: { vehicleTypeId: oldId },
      data: { vehicleTypeId: newId },
    });
    if (count > 0) {
      console.log(`  ↳ Reassigned ${count} transaction(s): ${oldCode} → ${newCode}`);
    }
  }

  const canonicalCodes = CANONICAL_VEHICLE_TYPES.map((v) => v.typeCode);
  const removed = await prisma.vehicleType.deleteMany({
    where: { typeCode: { notIn: [...canonicalCodes] } },
  });

  console.log('✅ Vehicle types synced');
  console.log(`   Removed ${removed.count} legacy type(s)`);
  const final = await prisma.vehicleType.findMany({ orderBy: { typeName: 'asc' } });
  for (const vt of final) {
    console.log(`   • ${vt.typeName} (${vt.typeCode}) — ₹${vt.baseCharge}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
