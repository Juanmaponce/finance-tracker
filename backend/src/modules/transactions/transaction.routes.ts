import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as transactionController from './transaction.controller';

const router = Router();

router.use(authenticate);

router.get('/dashboard', transactionController.getDashboardStats);
router.get('/', transactionController.listTransactions);
router.post('/', transactionController.createTransaction);
router.get('/:id', transactionController.getTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

export default router;
