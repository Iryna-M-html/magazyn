import { Joi, Segments } from 'celebrate';
import { isValidObjectId } from 'mongoose';
const objectIdValidator = (value, helpers) => {
  return !isValidObjectId(value) ? helpers.message('Invalid id format') : value;
};
export const productIdSchema = {
  [Segments.PARAMS]: Joi.object({
    productId: Joi.string().custom(objectIdValidator).required(),
  }),
};

// Если нет внешнего objectIdValidator, используем валидацию 24-значного HEX
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createProductSchema = {
  [Segments.BODY]: Joi.object({
    barcode: Joi.string().required().trim(),
    expirationDate: Joi.date().iso().required(),
    quantity: Joi.number().integer().min(1).required(),
    category: Joi.string().regex(objectIdPattern).required().messages({
      'string.pattern.base': 'Некорректный ID категории',
    }),
    // Опциональные поля
    name: Joi.string().optional(),
    weightOrVolume: Joi.string().optional().allow(''),
  }),
};

export const updateProductSchema = {
  ...productIdSchema,
  [Segments.BODY]: Joi.object({
    name: Joi.string().min(1).required(),
    price: Joi.number().required(),
    image: Joi.string().uri().trim(),
    category: Joi.string().custom(objectIdValidator).required(),
  }).min(1),
};

//////////////
export const getByBarcodeSchema = Joi.object({
  barcode: Joi.string()
    .pattern(/^\d{8,14}$/)
    .required()
    .messages({
      'string.pattern.base':
        'Штрихкод должен содержать только цифры (от 8 до 14 символов)',
      'any.required': 'Штрихкод обязателен',
    }),
});

export const createIntakeSchema = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Некорректный ID товара',
    'any.required': 'productId обязателен',
  }),
  quantity: Joi.number().integer().min(1).default(1),
  batch: Joi.string().min(1).required(),
});
