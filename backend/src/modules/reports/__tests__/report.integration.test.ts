import request from 'supertest';
import { createApp } from '../../../app';
import { generateTestToken } from '../../../__tests__/helpers/auth-helper';

const app = createApp();

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Report Integration Tests', () => {
  const authToken = generateTestToken();

  describe('GET /api/v1/reports/summary', () => {
    it('should return summary with valid date range', async () => {
      const response = await request(app)
        .get('/api/v1/reports/summary')
        .query({ startDate: '2026-01-01', endDate: '2026-01-31' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalExpenses');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('dailyTrend');
    });

    it('should return 400 when dates are missing', async () => {
      const response = await request(app)
        .get('/api/v1/reports/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 when unauthenticated', async () => {
      const response = await request(app)
        .get('/api/v1/reports/summary')
        .query({ startDate: '2026-01-01', endDate: '2026-01-31' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/reports/comparison', () => {
    it('should return comparison with valid periods', async () => {
      const response = await request(app)
        .get('/api/v1/reports/comparison')
        .query({
          period1Start: '2026-01-01',
          period1End: '2026-01-31',
          period2Start: '2026-02-01',
          period2End: '2026-02-28',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('period1');
      expect(response.body.data).toHaveProperty('period2');
      expect(response.body.data).toHaveProperty('changes');
    });
  });
});
