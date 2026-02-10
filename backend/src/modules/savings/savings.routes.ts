import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as savingsController from './savings.controller';

const router = Router();

router.use(authenticate);

router.get('/', savingsController.listSavings);
router.post('/', savingsController.createSavings);
router.put('/:id', savingsController.updateSavings);
router.post('/:id/deposit', savingsController.depositToSavings);
router.get('/:id/deposits', savingsController.getDeposits);
router.delete('/:id', savingsController.deleteSavings);

export default router;
