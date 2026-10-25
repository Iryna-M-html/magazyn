// Действия в журнале (история для администратора)
export const AUDIT_ACTIONS = [
  // Вход
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.password_changed',
  // Пользователи
  'user.created',
  'user.code_reset',
  // Товары
  'product.created',
  'product.updated',
  // Партии
  'intake.created',
  'intake.discounted',
  'intake.written_off',
  'intake.price_changed',
  // Ревизии и фактуры
  'audit.created',
  'invoice.recognized',
];

export const AUDIT_ENTITY_TYPES = ['user', 'product', 'intake', 'invoice'];

// Записи старше этого срока удаляются автоматически (TTL-индекс MongoDB)
export const AUDIT_LOG_TTL_DAYS = 90;
