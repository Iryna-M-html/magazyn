import { Joi, Segments } from 'celebrate';
import { isValidObjectId } from 'mongoose';

// Кастомный валидатор для проверки Mongo ObjectId
const objectIdValidator = (value, helpers) => {
  return !isValidObjectId(value)
    ? helpers.message('Некорректный формат ID партии')
    : value;
};

// Схема для GET /inventory/intake/:intakeId/audits
export const getInventoryAuditsSchema = {
  [Segments.PARAMS]: Joi.object({
    intakeId: Joi.string().custom(objectIdValidator).required().messages({
      'any.required': 'ID партии обязателен',
    }),
  }),
};

// Схема для POST /inventory/intake/:intakeId/audits
export const createInventoryAuditSchema = {
  [Segments.PARAMS]: Joi.object({
    intakeId: Joi.string().custom(objectIdValidator).required().messages({
      'any.required': 'ID партии обязателен',
    }),
  }),
  [Segments.BODY]: Joi.object({
    countedQuantity: Joi.number().min(0).required().messages({
      'number.base': 'Фактическое количество должно быть числом',
      'number.min': 'Фактическое количество не может быть отрицательным',
      'any.required': 'Фактическое количество обязательно',
    }),
    countedAt: Joi.date().iso().optional().messages({
      'date.format': 'Дата проведения ревизии должна быть в формате ISO',
    }),
    note: Joi.string().trim().max(500).allow('').optional().messages({
      'string.max': 'Заметка не должна превышать 500 символов',
    }),
  }),
};
