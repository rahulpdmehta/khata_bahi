import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/environment';
import { ApiError } from '../../utils/ApiError';
import type { LoginDto, ChangePasswordDto } from './auth.dto';

export class AuthService {
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        centers: {
          include: { center: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        centers: user.centers.map((uc) => uc.center),
      },
      token,
      refreshToken,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw ApiError.badRequest('Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        centers: {
          include: { center: true },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      ...user,
      centers: user.centers.map((uc) => uc.center),
    };
  }

  private generateToken(userId: string, role: string) {
    return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '24h' });
  }

  private generateRefreshToken(userId: string) {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }
}
