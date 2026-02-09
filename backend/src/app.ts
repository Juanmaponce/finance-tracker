import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './modules/auth/auth.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import categoryRoutes from './modules/categories/category.routes';
import currencyRoutes from './modules/currency/currency.routes';
import recurringRoutes from './modules/recurring/recurring.routes';
import savingsRoutes from './modules/savings/savings.routes';
import reportRoutes from './modules/reports/report.routes';
import receiptRoutes from './modules/receipts/receipt.routes';
import userRoutes from './modules/users/user.routes';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  // Module routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/transactions', transactionRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/currency', currencyRoutes);
  app.use('/api/v1/recurring', recurringRoutes);
  app.use('/api/v1/savings', savingsRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/receipts', receiptRoutes);
  app.use('/api/v1/users', userRoutes);

  // Serve local uploads in development
  if (config.nodeEnv === 'development') {
    app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
  }

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
