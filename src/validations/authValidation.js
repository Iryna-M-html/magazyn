import { Joi, Segments } from 'celebrate';

export const registerUserSchema = {
  [Segments.BODY]: Joi.object({
    role: Joi.string().valid('admin', 'owner', 'user').required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string()
      .trim()
      .pattern(
        /^[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яІіЇїЄєҐґ'-]{2,}( [A-Za-zÀ-ÖØ-öø-ÿА-Яа-яІіЇїЄєҐґ'-]{2,})+$/,
      )
      .required()
      .messages({
        'string.pattern.base':
          'Full name must contain at least two words and only letters',
      }),
    email: Joi.string().email().required(),
    avatar: Joi.string().allow('').default(''),
  }),
};

// Имя или фамилия: буквы любого алфавита, дефис, апостроф, пробел (двойная фамилия)
export const personNamePart = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .pattern(/^\p{L}[\p{L}'’ -]*$/u)
  .messages({
    'string.pattern.base': 'Имя и фамилия могут содержать только буквы',
    'string.min': 'Имя и фамилия должны быть не короче 2 символов',
  });

export const loginUserSchema = {
  [Segments.BODY]: Joi.alternatives().try(
    // Сотрудники: имя + фамилия + код от администратора
    Joi.object({
      firstName: personNamePart.required(),
      lastName: personNamePart.required(),
      password: Joi.string().required(),
    }),

    // Вход по email + паролю (для пользователей с email)
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
  ),
};

export const changePasswordSchema = {
  [Segments.BODY]: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(100).required().messages({
      'string.min': 'Новый код должен быть не короче 8 символов',
    }),
  }),
};
