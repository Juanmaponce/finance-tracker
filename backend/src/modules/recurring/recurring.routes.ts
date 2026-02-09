import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as recurringController from './recurring.controller';

const router = Router();

router.use(authenticate);

router.get('/', recurringController.listRecurring);
router.post('/', recurringController.createRecurring);
router.put('/:id', recurringController.updateRecurring);
router.patch('/:id/toggle', recurringController.toggleRecurring);
router.delete('/:id', recurringController.deleteRecurring);

export default router;
