import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from '../auth.repository';
import { AppError, UnauthorizedError } from '../../../lib/errors';

jest.mock('../auth.repository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

import { authService } from '../auth.service';

const mockAuthRepo = authRepository as jest.Mocked<typeof authRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockJwt.sign as jest.Mock).mockReturnValue('mock-token');
  });

  describe('register', () => {
    it('should create user with hashed password and return tokens', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockAuthRepo.createUser.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        primaryCurrency: 'USD',
        darkMode: false,
        locale: 'es',
        createdAt: new Date(),
      });
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined as never);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        displayName: 'Test',
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123', 12);
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw 409 on duplicate email', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: 'existing',
        email: 'test@example.com',
        passwordHash: 'hash',
        displayName: 'Existing',
        primaryCurrency: 'USD',
        darkMode: false,
        locale: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123',
          displayName: 'Test',
        }),
      ).rejects.toThrow(AppError);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123',
          displayName: 'Test',
        }),
      ).rejects.toThrow('An account with this email already exists');
    });
  });

  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-pw',
        displayName: 'Test',
        primaryCurrency: 'USD',
        darkMode: false,
        locale: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockAuthRepo.saveRefreshToken.mockResolvedValue(undefined as never);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toBeDefined();
    });

    it('should throw UnauthorizedError on non-existent email', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nope@example.com', password: 'Password123' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError on wrong password', async () => {
      mockAuthRepo.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-pw',
        displayName: 'Test',
        primaryCurrency: 'USD',
        darkMode: false,
        locale: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPass1' }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should delete refresh token', async () => {
      mockAuthRepo.deleteRefreshToken.mockResolvedValue(undefined as never);

      await authService.logout('some-refresh-token');
      expect(mockAuthRepo.deleteRefreshToken).toHaveBeenCalledWith('some-refresh-token');
    });
  });
});
