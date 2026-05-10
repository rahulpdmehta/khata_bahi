import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import type { CreateCenterDto, UpdateCenterDto, CenterFiltersDto } from './center.dto';

export class CenterService {
  async findAll(filters: CenterFiltersDto) {
    const { isActive, page, limit } = filters;

    const where: Record<string, unknown> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      prisma.center.findMany({
        where,
        orderBy: { centerName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.center.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const center = await prisma.center.findUnique({
      where: { id },
    });

    if (!center) {
      throw ApiError.notFound('Center not found');
    }

    return center;
  }

  async create(dto: CreateCenterDto) {
    const existing = await prisma.center.findFirst({
      where: { centerCode: dto.centerCode },
    });

    if (existing) {
      throw ApiError.conflict('Center code already exists');
    }

    const center = await prisma.center.create({
      data: {
        centerCode: dto.centerCode,
        centerName: dto.centerName,
        address: dto.address,
        contactNumber: dto.contactNumber,
        email: dto.email,
        isActive: true,
      },
    });

    return center;
  }

  async update(id: string, dto: UpdateCenterDto) {
    const center = await prisma.center.findUnique({ where: { id } });

    if (!center) {
      throw ApiError.notFound('Center not found');
    }

    if (dto.centerCode && dto.centerCode !== center.centerCode) {
      const conflict = await prisma.center.findFirst({
        where: { centerCode: dto.centerCode, id: { not: id } },
      });

      if (conflict) {
        throw ApiError.conflict('Center code already in use');
      }
    }

    const updated = await prisma.center.update({
      where: { id },
      data: {
        ...(dto.centerCode && { centerCode: dto.centerCode }),
        ...(dto.centerName && { centerName: dto.centerName }),
        ...(dto.address && { address: dto.address }),
        ...(dto.contactNumber && { contactNumber: dto.contactNumber }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });

    return updated;
  }

  async delete(id: string) {
    const center = await prisma.center.findUnique({ where: { id } });

    if (!center) {
      throw ApiError.notFound('Center not found');
    }

    await prisma.center.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Center deactivated successfully' };
  }
}
