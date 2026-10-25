import { Router } from 'express';
import multer from 'multer';
import { celebrate, Joi, Segments } from 'celebrate';
import { authenticate } from '../middleware/authenticate.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import {
  matchProducts,
  recognizeInvoice,
} from '../controllers/invoiceController.js';

const router = Router();

// Фото фактуры с телефона бывает больше общего лимита 5 МБ
const invoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  },
});

// Приёмка по фактуре: распознавание фото (Tesseract) и подбор товаров
router.post(
  '/invoices/recognize',
  authenticate,
  invoiceUpload.single('invoice'),
  ctrlWrapper(recognizeInvoice),
);

router.get(
  '/products/match',
  authenticate,
  celebrate({
    [Segments.QUERY]: Joi.object({
      q: Joi.string().trim().min(2).max(200).required(),
      source: Joi.string().valid('db', 'off').default('db'),
    }),
  }),
  ctrlWrapper(matchProducts),
);

export default router;
