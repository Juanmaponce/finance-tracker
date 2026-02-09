import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../lib/prisma';
import { generateTestToken } from '../../../__tests__/helpers/auth-helper';

const app = createApp();

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Transaction Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let categoryId: string;
  let transactionId: string;

  beforeAll(async () => {
    // Create test user directly
    const user = await prisma.user.create({
      data: {
        email: `tx-test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        displayName: 'TX Test User',
        primaryCurrency: 'USD',
        categories: {
          create: [
            {
              name: 'Food',
              icon: 'utensils',
              color: '#FF0000',
              type: 'EXPENSE',
              keywords: ['food', 'lunch'],
            },
          ],
        },
      },
      include: { categories: true },
    });

    userId = user.id;
    categoryId = user.categories[0]!.id;
    authToken = generateTestToken(userId, user.email);
  });

  afterAll(async () => {
    try {
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.category.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // ignore
    }
  });

  describe('POST /api/v1/transactions', () => {
    it('should create a transaction with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50.0,
          currency: 'USD',
          categoryId,
          type: 'EXPENSE',
          description: 'Lunch',
          date: '2026-02-07T12:00:00Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(50);
      transactionId = response.body.data.id;
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -10,
          currency: 'USD',
          type: 'EXPENSE',
          date: '2026-02-07T12:00:00Z',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 when unauthenticated', async () => {
      const response = await request(app).post('/api/v1/transactions').send({
        amount: 50,
        currency: 'USD',
        type: 'EXPENSE',
        date: '2026-02-07T12:00:00Z',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/transactions', () => {
    it('should return paginated transactions', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('should return a single transaction', async () => {
      const response = await request(app)
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(transactionId);
    });
  });

  describe('PUT /api/v1/transactions/:id', () => {
    it('should update a transaction', async () => {
      const response = await request(app)
        .put(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 75 });

      expect(response.status).toBe(200);
      expect(response.body.data.amount).toBe(75);
    });
  });

  describe('DELETE /api/v1/transactions/:id', () => {
    it('should soft-delete a transaction', async () => {
      const response = await request(app)
        .delete(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/transactions/dashboard', () => {
    it('should return dashboard stats', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalExpenses');
      expect(response.body.data).toHaveProperty('totalIncome');
      expect(response.body.data).toHaveProperty('balance');
    });
  });
});
