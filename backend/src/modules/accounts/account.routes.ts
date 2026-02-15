import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as accountController from './account.controller';

const router = Router();
router.use(authenticate);

router.get('/', accountController.listAccounts);
router.get('/balances', accountController.getAccountBalances);
router.post('/', accountController.createAccount);
router.post('/reorder', accountController.reorderAccounts);
router.put('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

export default router;
