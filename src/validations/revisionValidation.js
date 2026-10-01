import Joi from 'joi';
import mongoose from 'mongoose';

// Кастомный валидатор для проверки корректности MongoDB ObjectId
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('string.objectId');
  }
  return value;
};

export const createRevisionSchema = Joi.object({
  year: Joi.number().integer().min(2020).max(2100).required().messages({
    'number.base': 'Год должен быть числом',
    'number.min': 'Год не может быть меньше 2020',
    'number.max': 'Год не может превышать 2100',
    'any.required': 'Год обязателен',
  }),

  month: Joi.number().integer().min(1).max(12).required().messages({
    'number.base': 'Месяц должен быть числом',
    'number.min': 'Месяц должен быть в диапазоне от 1 до 12',
    'number.max': 'Месяц должен быть в диапазоне от 1 до 12',
    'any.required': 'Месяц обязателен',
  }),

  note: Joi.string().trim().max(500).allow('', null).optional().messages({
    'string.max': 'Заметка не должна превышать 500 символов',
  }),

  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .trim()
          .custom(objectIdValidator)
          .required()
          .messages({
            'string.empty': 'ID товара обязателен',
            'string.objectId': 'productId должен быть валидным ObjectId',
            'any.required': 'ID товара обязателен',
          }),

        expectedQuantity: Joi.number().min(0).default(0).optional().messages({
          'number.base': 'Ожидаемое количество должно быть числом',
          'number.min': 'Ожидаемое количество не может быть отрицательным',
        }),

        actualQuantity: Joi.number().min(0).required().messages({
          'number.base': 'Фактическое количество должно быть числом',
          'number.min': 'Фактическое количество не может быть отрицательным',
          'any.required': 'Фактическое количество обязательно',
        }),

        notes: Joi.string()
          .trim()
          .max(250)
          .allow('', null)
          .optional()
          .messages({
            'string.max':
              'Примечание к товару не должно превышать 250 символов',
          }),
      }),
    )
    .min(1)
    .required()
    .messages({
      'array.base': 'Список товаров должен быть массивом',
      'array.min': 'Список товаров не может быть пустым',
      'any.required': 'Список товаров (items) обязателен',
    }),
});
