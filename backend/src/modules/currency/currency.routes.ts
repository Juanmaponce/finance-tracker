import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as currencyController from './currency.controller';

const router = Router();

router.use(authenticate);

router.get('/rates', currencyController.getRates);

export default router;
