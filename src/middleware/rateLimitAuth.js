import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { FIFTEEN_MINUTES } from '../constants/time.js';
import { toLoginName } from '../utils/loginName.js';

export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many auth attempts from this IP. Please try again later.',
  },
  keyGenerator: (req) => ipKeyGenerator(req),
});

// Запросы приходят через сервер Next.js (один IP), поэтому попытки входа считаются по аккаунту:
// 10 неудачных попыток за 15 минут для одного имени (или email)
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  },
  keyGenerator: (req) => {
    const { email, firstName = '', lastName = '' } = req.body ?? {};

    return email
      ? `email:${String(email).toLowerCase()}`
      : `name:${toLoginName(`${firstName} ${lastName}`)}`;
  },
});
