import createHttpError from 'http-errors';
import { recognizeInvoiceText } from '../services/invoiceOcrService.js';
import {
  matchInDatabase,
  matchInOpenFoodFacts,
} from '../services/productMatchService.js';
import { parseInvoiceText } from '../utils/invoiceParser.js';

// POST /invoices/recognize — фото фактуры (поле invoice) → номер фактуры и строки товаров
export const recognizeInvoice = async (req, res) => {
  if (!req.file) {
    throw createHttpError(400, 'Invoice image is required');
  }

  const { text, confidence } = await recognizeInvoiceText(req.file.buffer);
  const { invoiceNumber, items } = parseInvoiceText(text);

  res.status(200).json({
    status: 'success',
    data: {
      invoiceNumber,
      items,
      // Для проверки и ручного разбора, если строки распознались плохо
      text,
      confidence: Math.round(confidence),
    },
  });
};

// GET /products/match?q=…&source=db|off — кандидаты для строки фактуры
export const matchProducts = async (req, res) => {
  const { q, source = 'db' } = req.query;

  if (source === 'off') {
    try {
      const candidates = await matchInOpenFoodFacts(q);
      return res.status(200).json({ status: 'success', data: candidates });
    } catch (error) {
      // Open Food Facts недоступен или ограничил запросы — это не ошибка нашей базы
      const status = error.response?.status;
      throw createHttpError(
        status === 429 || status === 503 ? 503 : 502,
        'Open Food Facts is unavailable, try again later',
      );
    }
  }

  const candidates = await matchInDatabase(q);

  res.status(200).json({ status: 'success', data: candidates });
};
