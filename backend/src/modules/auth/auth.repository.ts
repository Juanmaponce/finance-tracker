import { prisma } from '../../lib/prisma';
import type { CategoryType } from '@prisma/client';

interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
  primaryCurrency: string;
}

interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  keywords: string[];
}

class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        primaryCurrency: true,
        darkMode: true,
        locale: true,
        createdAt: true,
      },
    });
  }

  async createUser(data: CreateUserData, defaultCategories: DefaultCategory[]) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        primaryCurrency: data.primaryCurrency,
        categories: {
          create: defaultCategories.map((cat) => ({
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            type: cat.type,
            isDefault: true,
            keywords: cat.keywords,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        primaryCurrency: true,
        darkMode: true,
        locale: true,
        createdAt: true,
      },
    });
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async deleteRefreshToken(token: string) {
    return prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async deleteAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpiredTokens() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export const authRepository = new AuthRepository();
