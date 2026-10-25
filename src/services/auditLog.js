import { AuditLog } from '../models/AuditLog.js';

// IP клиента: запросы идут через сервер Next.js, он передаёт адрес браузера в X-Forwarded-For
const getClientIp = (req) =>
  String(req.headers['x-forwarded-for'] ?? '')
    .split(',')[0]
    .trim() ||
  req.ip ||
  '';

/**
 * Запись в журнал действий. Никогда не прерывает основную операцию:
 * ошибка записи журнала только выводится в консоль.
 *
 * user — по умолчанию req.user (для входа/выхода передаётся явно).
 * changes — [{ field, from, to }] для «было → стало».
 */
export async function logAction(
  req,
  {
    action,
    user = req.user,
    userName,
    entityType = null,
    entityId = null,
    entityLabel = '',
    changes = [],
    details = null,
  },
) {
  try {
    await AuditLog.create({
      userId: user?._id ?? null,
      userName: userName ?? user?.fullName ?? '',
      userRole: user?.role ?? null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      entityLabel,
      changes: changes.filter((change) => change.from !== change.to),
      details,
      ip: getClientIp(req),
      userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
    });
  } catch (error) {
    console.error('Не удалось записать действие в журнал:', error.message);
  }
}

// «Ketchup łagodny (5900783000424)»
export const productLabel = (product) =>
  product ? `${product.name ?? ''}${product.barcode ? ` (${product.barcode})` : ''}`.trim() : '';
