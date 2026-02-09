import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { AppError, UnauthorizedError } from '../../lib/errors';
import { authRepository } from './auth.repository';
import { DEFAULT_CATEGORIES } from './default-categories';
import type {
  RegisterDTO,
  LoginDTO,
  AuthTokens,
  AuthResponse,
  JwtPayload,
  UserResponse,
} from './auth.types';

const BCRYPT_ROUNDS = 12;

class AuthService {
  async register(data: RegisterDTO): Promise<AuthResponse> {
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await authRepository.createUser(
      {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        primaryCurrency: data.primaryCurrency || 'USD',
      },
      DEFAULT_CATEGORIES,
    );

    const tokens = await this.generateTokens({ userId: user.id, email: user.email });
    return { user, tokens };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens({ userId: user.id, email: user.email });

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      primaryCurrency: user.primaryCurrency,
      darkMode: user.darkMode,
      locale: user.locale,
      createdAt: user.createdAt,
    };

    return { user: userResponse, tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    await authRepository.deleteRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await authRepository.deleteAllUserRefreshTokens(userId);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await authRepository.findRefreshToken(refreshToken);
    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      await authRepository.deleteRefreshToken(refreshToken);
      throw new UnauthorizedError('Refresh token expired');
    }

    // Verify the JWT signature
    try {
      jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      await authRepository.deleteRefreshToken(refreshToken);
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Delete old token and generate new pair (token rotation)
    await authRepository.deleteRefreshToken(refreshToken);

    return this.generateTokens({
      userId: stored.userId,
      email: stored.user.email,
    });
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return user;
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiration as string,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { ...payload, jti: crypto.randomUUID() },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiration as string } as jwt.SignOptions,
    );

    // Calculate refresh token expiry (7 days default)
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await authRepository.saveRefreshToken(payload.userId, refreshToken, refreshExpiresAt);

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
