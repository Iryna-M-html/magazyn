import { Schema, model } from 'mongoose';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AUDIT_LOG_TTL_DAYS,
} from '../constants/auditActions.js';
import { USER_ROLES } from '../constants/roles.js';

const changeSchema = new Schema(
  {
    field: { type: String, required: true },
    from: { type: Schema.Types.Mixed, default: null },
    to: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

// Журнал действий пользователей. Имя и роль сохраняются копией — история не меняется,
// даже если пользователя потом переименуют.
const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userName: { type: String, default: '' },
    userRole: { type: String, enum: [...USER_ROLES, null], default: null, index: true },

    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },

    entityType: { type: String, enum: [...AUDIT_ENTITY_TYPES, null], default: null },
    entityId: { type: String, default: null },
    // Понятное название объекта: «Ketchup łagodny (5900783000424)»
    entityLabel: { type: String, default: '' },

    changes: { type: [changeSchema], default: [] },
    details: { type: Schema.Types.Mixed, default: null },

    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// Удаление через 90 дней
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: AUDIT_LOG_TTL_DAYS * 24 * 60 * 60 },
);
auditLogSchema.index({ createdAt: -1, action: 1 });

export const AuditLog = model('AuditLog', auditLogSchema);
