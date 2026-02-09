import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as categoryController from './category.controller';

const router = Router();

router.use(authenticate);

router.get('/', categoryController.listCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
