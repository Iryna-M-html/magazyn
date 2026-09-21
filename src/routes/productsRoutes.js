import { Router } from 'express';
import {
  createProductManual,
  getAllIntakes,
  getProductByBarcode,
  recordIntake,
} from '../controllers/productsController.js';
import { validateBody, validateParams } from '../middleware/validateBody.js';
import {
  getByBarcodeSchema,
  createIntakeSchema,
  createManualProductSchema,
} from '../validations/productsValidation.js';
import { upload } from '../middleware/multer.js';

const router = Router();

// Поиск товара по штрихкоду (Сканирование/Ручной ввод)
router.get(
  '/products/barcode/:barcode',
  validateParams(getByBarcodeSchema),
  getProductByBarcode,
);
router.get('/inventory/intake', getAllIntakes);

// Фиксация приемки (Кнопка «Далее»)
router.post(
  '/inventory/intake',
  validateBody(createIntakeSchema),
  recordIntake,
);
// Ручное добавление товара
router.post(
  '/manual',
  upload.single('imageUrl'),
  validateBody(createManualProductSchema),
  createProductManual,
);
export default router;
