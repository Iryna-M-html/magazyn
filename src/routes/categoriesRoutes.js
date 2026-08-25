import { Router } from 'express';
import {
  createCategory,
  getAllCategories,
} from '../controllers/categoryController.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { celebrate } from 'celebrate';
import { createCategorySchema } from '../validations/categoriesValidation.js';
// import { authenticate } from '../middleware/authenticate.js';
// import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

router.get('/categories', getAllCategories);
router.post(
  '/categories',
  // authenticate,
  // requireAdmin,
  celebrate(createCategorySchema),
  ctrlWrapper(createCategory),
);

export default router;
