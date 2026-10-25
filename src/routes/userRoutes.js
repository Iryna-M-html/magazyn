import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { celebrate } from 'celebrate';
import {
  updateProfile,
  getAllUsers,
  createUser,
  resetUserPassword,
  getUser,
} from '../controllers/userController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  createUserSchema,
  userIdParamsSchema,
} from '../validations/usersValidation.js';

const router = Router();
router.patch(
  '/users/:userId',
  authenticate,
  requireAdmin,
  ctrlWrapper(updateProfile),
);

router.put(
  '/users/:userId',
  authenticate,
  requireAdmin,
  ctrlWrapper(updateProfile),
);

// Администратор: список, создание пользователя с автоматическим кодом, новый код
router.get('/users', authenticate, requireAdmin, ctrlWrapper(getAllUsers));

router.post(
  '/users',
  authenticate,
  requireAdmin,
  celebrate(createUserSchema),
  ctrlWrapper(createUser),
);

router.post(
  '/users/:userId/reset-password',
  authenticate,
  requireAdmin,
  celebrate(userIdParamsSchema),
  ctrlWrapper(resetUserPassword),
);

router.get('/users/me', authenticate, getUser);
// router.get('/api/users/:userId', getUserProfile);

export default router;
