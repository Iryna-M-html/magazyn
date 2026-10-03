// GET /inventory/intake/:intakeId/audits

import { Intake } from '../models/Intake.js';
import InventoryAudit from '../models/InventoryAudit.js';

export async function getInventoryAudits(req, res) {
  try {
    const { intakeId } = req.params;

    const audits = await InventoryAudit.find({
      intakeId,
    })
      .sort({
        countedAt: -1,
      })
      .lean();

    return res.status(200).json({
      data: audits,
    });
  } catch (error) {
    console.error('Ошибка получения ревизий:', error);

    return res.status(500).json({
      error: 'Не удалось получить историю ревизий',
    });
  }
}

// POST /inventory/intake/:intakeId/audits

export async function createInventoryAudit(req, res, next) {
  try {
    const { intakeId } = req.params;
    const { countedQuantity, countedAt, note } = req.body;

    const intake = await Intake.findById(intakeId);

    if (!intake) {
      return res.status(404).json({
        error: 'Партия не найдена',
      });
    }

    const expectedQuantity =
      intake.quantity -
      (intake.discountedQuantity ?? 0) -
      (intake.writtenOffQuantity ?? 0);

    const difference = countedQuantity - expectedQuantity;

    const audit = await InventoryAudit.create({
      intakeId: intake._id,
      expectedQuantity,
      countedQuantity,
      difference,
      countedAt: countedAt ? new Date(countedAt) : new Date(),
      note: note || '',
    });

    return res.status(201).json({
      data: audit,
    });
  } catch (error) {
    next(error);
  }
}
