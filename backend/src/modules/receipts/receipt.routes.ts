import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { receiptUpload } from '../../lib/upload';
import * as receiptController from './receipt.controller';

const router = Router();

router.use(authenticate);

router.post('/:transactionId', receiptUpload.single('receipt'), receiptController.uploadReceipt);
router.delete('/:transactionId', receiptController.deleteReceipt);

export default router;
