import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';

const app = createApp();

// These tests require a running PostgreSQL + Redis
// Skip if DATABASE_URL is not set for a test database
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Auth Integration Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    // Cleanup test user
    try {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    } catch {
      // ignore
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: testEmail,
        password: 'TestPassword123',
        displayName: 'Test User',
        primaryCurrency: 'USD',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: testEmail,
        password: 'TestPassword123',
        displayName: 'Test User 2',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'weak-pw@example.com',
        password: 'short',
        displayName: 'Test',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'not-an-email',
        password: 'TestPassword123',
        displayName: 'Test',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'TestPassword123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'WrongPassword123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'TestPassword123',
      });

      expect(response.status).toBe(401);
    });
  });
});
