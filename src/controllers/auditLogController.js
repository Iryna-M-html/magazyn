import { AuditLog } from '../models/AuditLog.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /audit-logs — журнал действий с фильтрами (только администратор)
export const getAuditLogs = async (req, res) => {
  const {
    userId,
    role,
    action,
    entityType,
    entityId,
    from,
    to,
    q,
    page = 1,
    limit = 50,
  } = req.query;

  const filter = {};

  if (userId) filter.userId = userId;
  if (role) filter.userRole = role;
  if (action) filter.action = { $in: action.split(',') };
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;

  // Границы периода приходят с фронтенда уже в местном времени (ISO)
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  // Поиск по имени пользователя, объекту (товар, партия, фактура) и IP
  if (q) {
    const regex = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ userName: regex }, { entityLabel: regex }, { ip: regex }];
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    data,
    total,
    page: pageNumber,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
};
