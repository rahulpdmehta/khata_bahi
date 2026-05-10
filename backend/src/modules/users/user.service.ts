import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import type { CreateUserDto, UpdateUserDto, UserFiltersDto } from './user.dto';

const userInclude = {
  centers: {
    include: { center: true },
  },
};

export class UserService {
  async findAll(filters: UserFiltersDto) {
    const { role, isActive, page, limit } = filters;

    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { username: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: data.map((u) => ({
        ...u,
        passwordHash: undefined,
        centers: u.centers.map((uc) => uc.center),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    void _passwordHash;

    return {
      ...safeUser,
      centers: user.centers.map((uc) => uc.center),
    };
  }

  async create(dto: CreateUserDto) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existingUser) {
      throw ApiError.conflict('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: dto.role,
        isActive: true,
        ...(dto.centerIds && dto.centerIds.length > 0 && {
          centers: {
            create: dto.centerIds.map((centerId) => ({ centerId })),
          },
        }),
      },
      include: userInclude,
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    void _passwordHash;

    return {
      ...safeUser,
      centers: user.centers.map((uc) => uc.center),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (dto.username || dto.email) {
      const conflict = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(dto.username ? [{ username: dto.username }] : []),
                ...(dto.email ? [{ email: dto.email }] : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        throw ApiError.conflict('Username or email already in use');
      }
    }

    if (dto.centerIds !== undefined) {
      await prisma.userCenter.deleteMany({ where: { userId: id } });

      if (dto.centerIds.length > 0) {
        await prisma.userCenter.createMany({
          data: dto.centerIds.map((centerId) => ({ userId: id, centerId })),
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.email && { email: dto.email }),
        ...(dto.role && { role: dto.role }),
      },
      include: userInclude,
    });

    const { passwordHash: _passwordHash, ...safeUser } = updated;
    void _passwordHash;

    return {
      ...safeUser,
      centers: updated.centers.map((uc) => uc.center),
    };
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  }

  async toggleStatus(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      include: userInclude,
    });

    const { passwordHash: _passwordHash, ...safeUser } = updated;
    void _passwordHash;

    return {
      ...safeUser,
      centers: updated.centers.map((uc) => uc.center),
    };
  }
}
