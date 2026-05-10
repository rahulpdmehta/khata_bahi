import { prisma } from '../../config/database';

export interface CreateIncomeSourceDto {
  sourceName: string;
  sourceCode: string;
  defaultAmount: number;
}

export interface CreateVehicleTypeDto {
  typeName: string;
  typeCode: string;
  baseCharge: number;
}

export interface UpdateIncomeSourceDto {
  sourceName?: string;
  sourceCode?: string;
  defaultAmount?: number;
  isActive?: boolean;
}

export interface UpdateVehicleTypeDto {
  typeName?: string;
  typeCode?: string;
  baseCharge?: number;
  isActive?: boolean;
}

export class MasterDataService {
  async getIncomeSources() {
    return prisma.incomeSource.findMany({
      where: { isActive: true },
      orderBy: { sourceName: 'asc' },
    });
  }

  async getVehicleTypes() {
    return prisma.vehicleType.findMany({
      where: { isActive: true },
      orderBy: { typeName: 'asc' },
    });
  }

  async createIncomeSource(dto: CreateIncomeSourceDto) {
    return prisma.incomeSource.create({
      data: {
        sourceName: dto.sourceName,
        sourceCode: dto.sourceCode,
        defaultAmount: dto.defaultAmount,
        isActive: true,
      },
    });
  }

  async createVehicleType(dto: CreateVehicleTypeDto) {
    return prisma.vehicleType.create({
      data: {
        typeName: dto.typeName,
        typeCode: dto.typeCode,
        baseCharge: dto.baseCharge,
        isActive: true,
      },
    });
  }

  async updateIncomeSource(id: string, dto: UpdateIncomeSourceDto) {
    return prisma.incomeSource.update({
      where: { id },
      data: {
        ...(dto.sourceName !== undefined && { sourceName: dto.sourceName }),
        ...(dto.sourceCode !== undefined && { sourceCode: dto.sourceCode }),
        ...(dto.defaultAmount !== undefined && { defaultAmount: dto.defaultAmount }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async updateVehicleType(id: string, dto: UpdateVehicleTypeDto) {
    return prisma.vehicleType.update({
      where: { id },
      data: {
        ...(dto.typeName !== undefined && { typeName: dto.typeName }),
        ...(dto.typeCode !== undefined && { typeCode: dto.typeCode }),
        ...(dto.baseCharge !== undefined && { baseCharge: dto.baseCharge }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
