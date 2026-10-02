import { Router } from 'express';
import {
  createProductManual,
  getAllIntakes,
  getProductByBarcode,
  recordIntake,
  updateIntake,
  updateProductByBarcode,
} from '../controllers/productsController.js';
import { validateBody, validateParams } from '../middleware/validateBody.js';
import {
  getByBarcodeSchema,
  createIntakeSchema,
  createManualProductSchema,
  updateIntakeStatusSchema,
  updateProductByBarcodeSchema,
} from '../validations/productsValidation.js';
import { upload } from '../middleware/multer.js';
import { celebrate } from 'celebrate';

const router = Router();

// Поиск товара по штрихкоду (Сканирование/Ручной ввод)
router.get(
  '/products/barcode/:barcode',
  validateParams(getByBarcodeSchema),
  getProductByBarcode,
);
//добавление цены согласно полке
router.patch(
  '/products/barcode/:barcode',
  validateParams(getByBarcodeSchema),
  validateBody(updateProductByBarcodeSchema),
  updateProductByBarcode,
);

//все партии
router.get('/inventory/intake', getAllIntakes);

router.patch(
  '/inventory/intake/:id',
  celebrate(updateIntakeStatusSchema),
  updateIntake,
);
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
