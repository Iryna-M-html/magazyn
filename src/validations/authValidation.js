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

export const loginUserSchema = {
  [Segments.BODY]: Joi.alternatives().try(
    Joi.object({
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
    }),

    // Логін для інших ролей (email + password)
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
  ),
};
