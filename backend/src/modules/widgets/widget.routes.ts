import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getMonthlySummary } from './widget.controller';

const router = Router();

router.use(authenticate);

router.get('/monthly-summary', getMonthlySummary);

export default router;
