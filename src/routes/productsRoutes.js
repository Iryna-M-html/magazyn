import { Router } from 'express';
import {
  createProductManual,
  getAllIntakes,
  getIntake,
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
  getIntakeStatusSchema,
} from '../validations/productsValidation.js';
import { upload } from '../middleware/multer.js';
import { celebrate } from 'celebrate';
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

router.get(
  '/inventory/intake/:id',
  celebrate(getIntakeStatusSchema),
  getIntake,
);

// Фиксация приемки (Кнопка «Далее»)
router.post(
  '/inventory/intake',
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
  celebrate(createInventoryAuditSchema),
  createInventoryAudit,
);

// Ручное добавление товара
router.post(
  '/manual',
  upload.single('imageUrl'),
  validateBody(createManualProductSchema),
  createProductManual,
);
export default router;
