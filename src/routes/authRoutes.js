import { Router } from 'express';
import { celebrate } from 'celebrate';
import {
  registerUserSchema,
  loginUserSchema,
  changePasswordSchema,
} from '../validations/authValidation.js';
import {
  registerUser,
  refreshUserSession,
  loginUser,
  // registerOperator,
  logoutUser,
  changePassword,
} from '../controllers/authController.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { loginLimiter } from '../middleware/rateLimitAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Регистрировать пользователей может только администратор (обычно — через POST /users)
router.post(
  '/auth/register',
  authenticate,
  requireAdmin,
  celebrate(registerUserSchema),
  ctrlWrapper(registerUser),
);

router.post('/auth/refresh', refreshUserSession);
router.post(
  '/auth/login',
  loginLimiter,
  celebrate(loginUserSchema),
  loginUser,
);

router.post(
  '/auth/change-password',
  authenticate,
  celebrate(changePasswordSchema),
  ctrlWrapper(changePassword),
);
// router.patch(
//   '/auth/change-password',
//   celebrate(loginUserSchema),
//   registerOperator,
// );

router.post('/auth/logout', logoutUser);

export default router;
