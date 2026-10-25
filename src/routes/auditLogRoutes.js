import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../constants/auditActions.js';
import { USER_ROLES } from '../constants/roles.js';

const router = Router();

router.get(
  '/audit-logs',
  authenticate,
  requireAdmin,
  celebrate({
    [Segments.QUERY]: Joi.object({
      userId: Joi.string().hex().length(24),
      role: Joi.string().valid(...USER_ROLES),
      // Несколько действий через запятую
      action: Joi.string().custom((value, helpers) =>
        value.split(',').every((item) => AUDIT_ACTIONS.includes(item))
          ? value
          : helpers.error('any.invalid'),
      ),
      entityType: Joi.string().valid(...AUDIT_ENTITY_TYPES),
      entityId: Joi.string().max(64),
      from: Joi.date().iso(),
      to: Joi.date().iso(),
      q: Joi.string().trim().max(100).allow(''),
      page: Joi.number().integer().min(1).default(1),
      // До 5000 — для выгрузки CSV
      limit: Joi.number().integer().min(1).max(5000).default(50),
    }),
  }),
  ctrlWrapper(getAuditLogs),
);

export default router;
