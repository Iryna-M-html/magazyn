import { Router } from 'express';
import {
  getProductByBarcode,
  recordIntake,
} from '../controllers/productsController.js';
import { validateBody, validateParams } from '../middleware/validateBody.js';
import {
  getByBarcodeSchema,
  createIntakeSchema,
} from '../validations/productsValidation.js';

const router = Router();

// Поиск товара по штрихкоду (Сканирование/Ручной ввод)
router.get(
  '/products/barcode/:barcode',
  validateParams(getByBarcodeSchema),
  getProductByBarcode,
);

// Фиксация приемки (Кнопка «Далее»)
router.post(
  '/inventory/intake',
  validateBody(createIntakeSchema),
  recordIntake,
);

export default router;
