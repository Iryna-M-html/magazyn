import { Router } from 'express';
import { getGurtproductGurtSG } from '../controllers/gurtController';
const router = Router();

router.get('/gurt/sg', getGurtproductGurtSG);

export default router;
