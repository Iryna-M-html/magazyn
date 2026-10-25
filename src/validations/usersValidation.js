import { Joi, Segments } from 'celebrate';
import { USER_ROLES } from '../constants/roles.js';
import { personNamePart } from './authValidation.js';

export const createUserSchema = {
  [Segments.BODY]: Joi.object({
    firstName: personNamePart.required(),
    lastName: personNamePart.required(),
    role: Joi.string()
      .valid(...USER_ROLES)
      .required(),
  }),
};

export const userIdParamsSchema = {
  [Segments.PARAMS]: Joi.object({
    userId: Joi.string().hex().length(24).required(),
  }),
};
