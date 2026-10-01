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
  discountedQuantity: Joi.number().integer().min(1).default(0),
  writtenOffQuantity: Joi.number().integer().min(1).default(0),
  batch: Joi.string().min(1).required(),
  expirationDate: Joi.date().iso().required().messages({
    'date.format': 'Укажите дату в формате ГГГГ-ММ-ДД',
    'any.required': 'Срок годности обязателен для заполнения',
  }),
});
export const getIntakesQuerySchema = Joi.object({
  productId: Joi.string().hex().length(24).optional(),
  year: Joi.number().integer().min(2020).max(2100).optional(),
  month: Joi.number().integer().min(1).max(12).optional(),
  expirationDate: Joi.date().iso().optional(),
});

export const createManualProductSchema = Joi.object({
  barcode: Joi.string().trim().min(8).max(14).required().messages({
    'string.empty': 'Штрихкод обязателен',
    'string.min': 'Штрихкод должен содержать минимум 8 символов',
    'string.max': 'Штрихкод не должен превышать 14 символов',
  }),
  name: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Название товара обязательно',
    'string.min': 'Название товара должно быть не короче 2 символов',
  }),
  brand: Joi.string().trim().allow('', null).optional(),
  category: Joi.string().trim().allow('', null).optional(),
  unit: Joi.string().trim().default('шт').optional(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
});

// schema

export const updateIntakeStatusSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),

  body: Joi.object({
    discountedQuantity: Joi.number().integer().min(0),

    writtenOffQuantity: Joi.number().integer().min(0),
  }).or('discountedQuantity', 'writtenOffQuantity'),
};
