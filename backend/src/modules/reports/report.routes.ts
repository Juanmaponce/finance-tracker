import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getSummary, getComparison } from './report.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/comparison', getComparison);

export default router;
