import express from 'express';
import { getMonthlyReport } from '../controllers/reportsController.js';

const router = express.Router();

// GET /api/reports/monthly?year=2026&month=9
router.get('/monthly', getMonthlyReport);

export default router;
