import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as userController from './user.controller';

const router = Router();

router.use(authenticate);

router.put('/settings', userController.updateSettings);
router.get('/export', userController.exportData);

export default router;
