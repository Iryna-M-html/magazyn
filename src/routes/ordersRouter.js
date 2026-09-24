import express from 'express';
import { getOrderInformationList } from '../controllers/ordersController.js';

const router = express.Router();

// GET /api/orders/order-info
router.get('/order-info', getOrderInformationList);

export default router;
