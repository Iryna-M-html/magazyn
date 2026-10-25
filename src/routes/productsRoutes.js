import { Router } from 'express';
import {
  createProductManual,
  getAllIntakes,
  getIntake,
  getProductByBarcode,
  recordIntake,
  updateIntake,
  updateIntakePrice,
  updateProductByBarcode,
} from '../controllers/productsController.js';
import { validateBody, validateParams } from '../middleware/validateBody.js';
import {
  getByBarcodeSchema,
  createIntakeSchema,
  createManualProductSchema,
  updateIntakeStatusSchema,
  updateIntakePriceSchema,
  updateProductByBarcodeSchema,
  getIntakeStatusSchema,
} from '../validations/productsValidation.js';
import { upload } from '../middleware/multer.js';
import { celebrate } from 'celebrate';
import { authenticate } from '../middleware/authenticate.js';
import {
  createInventoryAudit,
  getInventoryAudits,
} from '../controllers/auditContoller.js';
import {
  createInventoryAuditSchema,
  getInventoryAuditsSchema,
} from '../validations/inventoryAuditValidation.js';

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
  authenticate,
  validateParams(getByBarcodeSchema),
  validateBody(updateProductByBarcodeSchema),
  updateProductByBarcode,
);

//все партии
router.get('/inventory/intake', getAllIntakes);

router.patch(
  '/inventory/intake/:id',
  authenticate,
  celebrate(updateIntakeStatusSchema),
  updateIntake,
);

// Цена нетто партии (брутто считается по VAT из категории товара)
router.patch(
  '/inventory/intake/:id/price',
  authenticate,
  celebrate(updateIntakePriceSchema),
  updateIntakePrice,
);

router.get(
  '/inventory/intake/:id',
  celebrate(getIntakeStatusSchema),
  getIntake,
);

// Фиксация приемки (Кнопка «Далее»)
router.post(
  '/inventory/intake',
  authenticate,
  validateBody(createIntakeSchema),
  recordIntake,
);

// GET /inventory/intake/:intakeId/audits
router.get(
  '/inventory/intake/:intakeId/audits',
  celebrate(getInventoryAuditsSchema),
  getInventoryAudits,
);

// POST /inventory/intake/:intakeId/audits
router.post(
  '/inventory/intake/:intakeId/audits',
  authenticate,
  celebrate(createInventoryAuditSchema),
  createInventoryAudit,
);

// Ручное добавление товара
router.post(
  '/manual',
  authenticate,
  upload.single('imageUrl'),
  validateBody(createManualProductSchema),
  createProductManual,
);
export default router;
