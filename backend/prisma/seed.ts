import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let txnCounter = 1;
let expCounter = 1;

function txnNum() {
  const n = String(txnCounter++).padStart(4, '0');
  return `TXN${Date.now()}${n}`;
}

function expNum() {
  const n = String(expCounter++).padStart(4, '0');
  return `EXP${Date.now()}${n}`;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.editRequest.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.userCenter.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.incomeSource.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.center.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleaned existing data');

  // ── Users ──
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: { username: 'admin', email: 'admin@pollution.local', passwordHash: adminPassword, role: 'ADMIN', isActive: true },
  });

  const staff1 = await prisma.user.create({
    data: { username: 'staff1', email: 'staff1@pollution.local', passwordHash: await bcrypt.hash('staff123', 10), role: 'STAFF', isActive: true },
  });
  const staff2 = await prisma.user.create({
    data: { username: 'staff2', email: 'staff2@pollution.local', passwordHash: await bcrypt.hash('staff123', 10), role: 'STAFF', isActive: true },
  });
  const staff3 = await prisma.user.create({
    data: { username: 'staff3', email: 'staff3@pollution.local', passwordHash: await bcrypt.hash('staff123', 10), role: 'STAFF', isActive: true },
  });
  console.log('✅ Created users');

  // ── Centers ──
  const center1 = await prisma.center.create({
    data: { centerCode: 'PC001', centerName: 'Central Pollution Center', address: '123 Main Street, City Center', contactNumber: '9876543210', email: 'central@pollution.local', isActive: true },
  });
  const center2 = await prisma.center.create({
    data: { centerCode: 'PC002', centerName: 'North Zone Pollution Center', address: '456 North Avenue, North Zone', contactNumber: '9876543211', email: 'north@pollution.local', isActive: true },
  });
  const center3 = await prisma.center.create({
    data: { centerCode: 'PC003', centerName: 'South Zone Pollution Center', address: '789 South Road, South Zone', contactNumber: '9876543212', email: 'south@pollution.local', isActive: true },
  });
  console.log('✅ Created centers');

  // Assign staff to centers
  await prisma.userCenter.createMany({
    data: [
      { userId: staff1.id, centerId: center1.id },
      { userId: staff2.id, centerId: center2.id },
      { userId: staff3.id, centerId: center3.id },
    ],
  });

  // ── Income Sources ──
  const [pucSrc, roadTaxSrc, insuranceSrc, serviceSrc, retestSrc, docSrc] = await Promise.all([
    prisma.incomeSource.create({ data: { sourceName: 'Pollution Test Fee', sourceCode: 'PUC', defaultAmount: 50 } }),
    prisma.incomeSource.create({ data: { sourceName: 'Road Tax', sourceCode: 'ROAD_TAX', defaultAmount: 100 } }),
    prisma.incomeSource.create({ data: { sourceName: 'Insurance Processing', sourceCode: 'INSURANCE', defaultAmount: 75 } }),
    prisma.incomeSource.create({ data: { sourceName: 'Service Charge', sourceCode: 'SERVICE', defaultAmount: 50 } }),
    prisma.incomeSource.create({ data: { sourceName: 'Re-Test Fee', sourceCode: 'RETEST', defaultAmount: 30 } }),
    prisma.incomeSource.create({ data: { sourceName: 'Document Verification', sourceCode: 'DOC_VERIFY', defaultAmount: 25 } }),
  ]);
  console.log('✅ Created income sources');

  // ── Vehicle Types ──
  const [vt2w, vt3w, vt4wLMV, vt4wMCV, vtHCV] = await Promise.all([
    prisma.vehicleType.create({ data: { typeName: 'Two Wheeler', typeCode: '2W', baseCharge: 50 } }),
    prisma.vehicleType.create({ data: { typeName: 'Three Wheeler', typeCode: '3W', baseCharge: 80 } }),
    prisma.vehicleType.create({ data: { typeName: 'Four Wheeler - LMV', typeCode: '4W_LMV', baseCharge: 120 } }),
    prisma.vehicleType.create({ data: { typeName: 'Four Wheeler - MCV', typeCode: '4W_MCV', baseCharge: 200 } }),
    prisma.vehicleType.create({ data: { typeName: 'Commercial - HCV', typeCode: 'COMMERCIAL_HCV', baseCharge: 300 } }),
  ]);
  console.log('✅ Created vehicle types');

  // ── Expense Categories ──
  const [catSalary, catRent, catElec, catWater, catTelecom, catMaint, catSupplies, catCleaning, catTransport, catMarketing, catMisc] = await Promise.all([
    prisma.expenseCategory.create({ data: { categoryName: 'Staff Salaries', categoryCode: 'SALARY', approvalThreshold: 50000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Rent', categoryCode: 'RENT', approvalThreshold: 20000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Electricity Bill', categoryCode: 'ELECTRICITY', approvalThreshold: 5000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Water Bill', categoryCode: 'WATER', approvalThreshold: 2000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Internet/Phone Bill', categoryCode: 'TELECOM', approvalThreshold: 3000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Equipment Maintenance', categoryCode: 'MAINTENANCE', approvalThreshold: 10000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Office Supplies', categoryCode: 'SUPPLIES', approvalThreshold: 5000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Cleaning & Sanitation', categoryCode: 'CLEANING', approvalThreshold: 3000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Transportation', categoryCode: 'TRANSPORT', approvalThreshold: 5000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Marketing', categoryCode: 'MARKETING', approvalThreshold: 10000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Miscellaneous', categoryCode: 'MISC', approvalThreshold: 5000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Food', categoryCode: 'FOOD', approvalThreshold: 5000 } }),
    prisma.expenseCategory.create({ data: { categoryName: 'Other', categoryCode: 'OTHER', approvalThreshold: 5000 } }),
  ]);
  console.log('✅ Created expense categories');

  // ──────────────────────────────────────────
  // TRANSACTIONS — 60 records across 30 days
  // ──────────────────────────────────────────
  const vehicleNumbers = [
    'DL01AB1234', 'DL02CD5678', 'DL03EF9012', 'DL04GH3456', 'DL05IJ7890',
    'HR26AK1111', 'HR26BL2222', 'HR55CM3333', 'UP16DN4444', 'UP80EO5555',
    'MH12FP6666', 'MH14GQ7777', 'RJ14HR8888', 'RJ45IS9999', 'GJ01JT0001',
    'PB10KU1122', 'WB22LV2233', 'KA01MW3344', 'TN07NX4455', 'AP09OY5566',
    'DL06PZ6677', 'DL07QA7788', 'UP32RB8899', 'UP15SC9900', 'HR12TD0011',
  ];

  const customerNames = [
    'Rajesh Kumar', 'Priya Sharma', 'Amit Singh', 'Sunita Devi', 'Vikram Patel',
    'Anita Gupta', 'Rohit Verma', 'Pooja Mehta', 'Suresh Yadav', 'Kavita Joshi',
    'Deepak Nair', 'Meena Pillai', 'Arun Iyer', 'Lalita Bose', 'Sanjay Dubey',
    null, null, null, null, null,
  ];

  const customerMobiles = [
    '9876543210', '9876543211', '8765432109', '7654321098', '9988776655',
    '8877665544', '7766554433', '9900112233', '8811223344', '7722334455',
    null, null, null, null, null,
    null, null, null, null, null,
  ];

  type TxnPaymentMode = 'CASH' | 'UPI' | 'DUES' | 'C_TO_C' | 'DISCOUNT';
  const paymentModes: TxnPaymentMode[] = ['CASH', 'CASH', 'CASH', 'UPI', 'UPI', 'DUES', 'C_TO_C', 'DISCOUNT'];
  const incomeSrcList = [pucSrc, pucSrc, pucSrc, roadTaxSrc, insuranceSrc, serviceSrc, retestSrc, docSrc];
  const vehicleTypeList = [vt2w, vt3w, vt4wLMV, vt4wMCV, vtHCV];
  const centers = [center1, center2, center3];
  const txnData: Parameters<typeof prisma.transaction.create>[0]['data'][] = [];

  for (let day = 0; day <= 30; day++) {
    const txDate = daysAgo(day);
    const txnsPerDay = randomInt(1, 4);
    for (let t = 0; t < txnsPerDay; t++) {
      const center = pick(centers);
      const staff = center.id === center1.id ? staff1 : center.id === center2.id ? staff2 : staff3;
      const vt = pick(vehicleTypeList);
      const src = pick(incomeSrcList);
      const vNum = pick(vehicleNumbers);
      const cNameIdx = randomInt(0, customerNames.length - 1);
      const pm = pick(paymentModes);

      txnData.push({
        transactionNumber: txnNum(),
        centerId: center.id,
        userId: staff.id,
        vehicleTypeId: vt.id,
        vehicleNumber: vNum,
        incomeSourceId: src.id,
        amount: Number(src.defaultAmount ?? 50) + randomInt(-10, 50),
        transactionDate: txDate,
        transactionTime: new Date(),
        paymentMode: pm,
        customerName: customerNames[cNameIdx] ?? undefined,
        customerMobile: customerMobiles[cNameIdx] ?? undefined,
        notes: day <= 2 ? 'Same-day entry' : undefined,
        isLocked: day > 0,
        createdBy: staff.id,
      });
    }
  }

  for (const data of txnData) {
    await prisma.transaction.create({ data });
  }
  console.log(`✅ Created ${txnData.length} transactions`);

  // ──────────────────────────────────────────
  // EXPENSES — 40 records across 30 days
  // ──────────────────────────────────────────
  type ExpenseStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

  interface ExpenseRow {
    categoryId: string;
    centerId: string;
    userId: string;
    amount: number;
    paymentMode: 'CASH' | 'UPI' | 'C_TO_C' | 'DISCOUNT' | 'DUES';
    vendorName: string;
    description: string;
    daysAgoN: number;
    status: ExpenseStatus;
    approvedBy?: string;
  }

  const expenseRows: ExpenseRow[] = [
    // Electricity — all centers, monthly
    { categoryId: catElec.id, centerId: center1.id, userId: staff1.id, amount: 2800, paymentMode: 'C_TO_C', vendorName: 'Delhi Electricity Board', description: 'Monthly electricity bill - March', daysAgoN: 3, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catElec.id, centerId: center2.id, userId: staff2.id, amount: 1950, paymentMode: 'C_TO_C', vendorName: 'Delhi Electricity Board', description: 'Monthly electricity bill - March', daysAgoN: 3, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catElec.id, centerId: center3.id, userId: staff3.id, amount: 2100, paymentMode: 'C_TO_C', vendorName: 'Delhi Electricity Board', description: 'Monthly electricity bill - March', daysAgoN: 4, status: 'PENDING' },
    { categoryId: catElec.id, centerId: center1.id, userId: staff1.id, amount: 2600, paymentMode: 'C_TO_C', vendorName: 'Delhi Electricity Board', description: 'Monthly electricity bill - February', daysAgoN: 32, status: 'APPROVED', approvedBy: admin.id },

    // Rent — monthly
    { categoryId: catRent.id, centerId: center1.id, userId: admin.id, amount: 18000, paymentMode: 'C_TO_C', vendorName: 'Property Owner - Mr. Gupta', description: 'Office rent - March', daysAgoN: 2, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catRent.id, centerId: center2.id, userId: admin.id, amount: 12000, paymentMode: 'C_TO_C', vendorName: 'Property Owner - Mrs. Sharma', description: 'Office rent - March', daysAgoN: 2, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catRent.id, centerId: center3.id, userId: admin.id, amount: 9500, paymentMode: 'C_TO_C', vendorName: 'Property Owner - Mr. Singh', description: 'Office rent - March', daysAgoN: 3, status: 'PENDING' },

    // Office Supplies
    { categoryId: catSupplies.id, centerId: center1.id, userId: staff1.id, amount: 1450, paymentMode: 'CASH', vendorName: 'Office Mart', description: 'Printer paper, pens, files', daysAgoN: 1, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catSupplies.id, centerId: center2.id, userId: staff2.id, amount: 980, paymentMode: 'CASH', vendorName: 'Stationery World', description: 'Receipt books and stickers', daysAgoN: 5, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catSupplies.id, centerId: center3.id, userId: staff3.id, amount: 1200, paymentMode: 'UPI', vendorName: 'Amazon Business', description: 'Toner cartridge and USB drives', daysAgoN: 8, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catSupplies.id, centerId: center1.id, userId: staff1.id, amount: 750, paymentMode: 'CASH', vendorName: 'Local Stationery', description: 'Pens, rubber stamps, ink', daysAgoN: 15, status: 'PENDING' },

    // Equipment Maintenance
    { categoryId: catMaint.id, centerId: center1.id, userId: admin.id, amount: 5500, paymentMode: 'C_TO_C', vendorName: 'TechServ Solutions', description: 'PUC machine annual service', daysAgoN: 7, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catMaint.id, centerId: center2.id, userId: staff2.id, amount: 3200, paymentMode: 'CASH', vendorName: 'Quick Fix Repairs', description: 'Printer and scanner repair', daysAgoN: 12, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catMaint.id, centerId: center3.id, userId: staff3.id, amount: 8000, paymentMode: 'C_TO_C', vendorName: 'AutoTest Equipment Ltd', description: 'Vehicle testing equipment calibration', daysAgoN: 20, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catMaint.id, centerId: center1.id, userId: staff1.id, amount: 1500, paymentMode: 'CASH', vendorName: 'Local Mechanic', description: 'Generator maintenance', daysAgoN: 25, status: 'REJECTED' },

    // Telecom
    { categoryId: catTelecom.id, centerId: center1.id, userId: staff1.id, amount: 1499, paymentMode: 'UPI', vendorName: 'Jio Business', description: 'Monthly broadband + phone bill', daysAgoN: 5, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catTelecom.id, centerId: center2.id, userId: staff2.id, amount: 999, paymentMode: 'UPI', vendorName: 'Airtel Office', description: 'Monthly broadband bill', daysAgoN: 5, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catTelecom.id, centerId: center3.id, userId: staff3.id, amount: 1299, paymentMode: 'UPI', vendorName: 'BSNL', description: 'Monthly broadband + landline', daysAgoN: 6, status: 'PENDING' },

    // Water
    { categoryId: catWater.id, centerId: center1.id, userId: staff1.id, amount: 850, paymentMode: 'CASH', vendorName: 'Delhi Jal Board', description: 'Monthly water bill', daysAgoN: 10, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catWater.id, centerId: center2.id, userId: staff2.id, amount: 620, paymentMode: 'CASH', vendorName: 'Delhi Jal Board', description: 'Monthly water bill', daysAgoN: 10, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catWater.id, centerId: center3.id, userId: staff3.id, amount: 740, paymentMode: 'CASH', vendorName: 'Delhi Jal Board', description: 'Monthly water bill', daysAgoN: 11, status: 'PENDING' },

    // Cleaning
    { categoryId: catCleaning.id, centerId: center1.id, userId: staff1.id, amount: 2500, paymentMode: 'CASH', vendorName: 'Clean India Services', description: 'Monthly cleaning contract - March', daysAgoN: 1, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catCleaning.id, centerId: center2.id, userId: staff2.id, amount: 1800, paymentMode: 'CASH', vendorName: 'SparkleClean', description: 'Weekly cleaning x4 + supplies', daysAgoN: 2, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catCleaning.id, centerId: center3.id, userId: staff3.id, amount: 2000, paymentMode: 'CASH', vendorName: 'Safai Services', description: 'Monthly cleaning contract - March', daysAgoN: 3, status: 'PENDING' },

    // Transport
    { categoryId: catTransport.id, centerId: center1.id, userId: admin.id, amount: 3200, paymentMode: 'CASH', vendorName: 'Fuel Station - HP', description: 'Fuel reimbursement - staff travel March', daysAgoN: 2, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catTransport.id, centerId: center2.id, userId: staff2.id, amount: 850, paymentMode: 'UPI', vendorName: 'Ola Corporate', description: 'Cab charges for document delivery', daysAgoN: 9, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catTransport.id, centerId: center3.id, userId: staff3.id, amount: 1200, paymentMode: 'CASH', vendorName: 'Petrol Pump - Indian Oil', description: 'Bike fuel reimbursement', daysAgoN: 14, status: 'REJECTED' },

    // Marketing
    { categoryId: catMarketing.id, centerId: center1.id, userId: admin.id, amount: 5000, paymentMode: 'C_TO_C', vendorName: 'PrintMedia Hub', description: 'Pamphlets and banners for awareness drive', daysAgoN: 18, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catMarketing.id, centerId: center2.id, userId: admin.id, amount: 3500, paymentMode: 'UPI', vendorName: 'Social Media Agency', description: 'Facebook & Google ads - March', daysAgoN: 10, status: 'PENDING' },

    // Miscellaneous
    { categoryId: catMisc.id, centerId: center1.id, userId: staff1.id, amount: 650, paymentMode: 'CASH', vendorName: 'Various', description: 'Tea/coffee, refreshments for visitors', daysAgoN: 0, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catMisc.id, centerId: center2.id, userId: staff2.id, amount: 480, paymentMode: 'CASH', vendorName: 'Corner Store', description: 'Miscellaneous office items', daysAgoN: 4, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catMisc.id, centerId: center3.id, userId: staff3.id, amount: 1100, paymentMode: 'CASH', vendorName: 'Ceremony expenses', description: 'Center inauguration décor', daysAgoN: 22, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catMisc.id, centerId: center1.id, userId: staff1.id, amount: 890, paymentMode: 'UPI', vendorName: 'Online Store', description: 'Extension cords and power strips', daysAgoN: 16, status: 'PENDING' },

    // Salary (admin level)
    { categoryId: catSalary.id, centerId: center1.id, userId: admin.id, amount: 45000, paymentMode: 'C_TO_C', vendorName: 'Payroll - March', description: 'Staff salary disbursement - Center 1', daysAgoN: 0, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catSalary.id, centerId: center2.id, userId: admin.id, amount: 38000, paymentMode: 'C_TO_C', vendorName: 'Payroll - March', description: 'Staff salary disbursement - Center 2', daysAgoN: 0, status: 'APPROVED', approvedBy: admin.id },
    { categoryId: catSalary.id, centerId: center3.id, userId: admin.id, amount: 32000, paymentMode: 'C_TO_C', vendorName: 'Payroll - March', description: 'Staff salary disbursement - Center 3', daysAgoN: 0, status: 'PENDING' },
  ];

  for (const row of expenseRows) {
    const expDate = daysAgo(row.daysAgoN);
    await prisma.expense.create({
      data: {
        expenseNumber: expNum(),
        centerId: row.centerId,
        userId: row.userId,
        categoryId: row.categoryId,
        amount: row.amount,
        paymentMode: row.paymentMode,
        vendorName: row.vendorName,
        description: row.description,
        expenseDate: expDate,
        status: row.status,
        approvedBy: row.approvedBy ?? undefined,
        approvedAt: row.approvedBy ? expDate : undefined,
      },
    });
  }
  console.log(`✅ Created ${expenseRows.length} expenses`);

  console.log('\n🎉 Database seeding completed!');
  console.log('──────────────────────────────');
  console.log('📋 Login Credentials:');
  console.log('  Admin  → username: admin,  password: admin123');
  console.log('  Staff1 → username: staff1, password: staff123');
  console.log('  Staff2 → username: staff2, password: staff123');
  console.log('  Staff3 → username: staff3, password: staff123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
