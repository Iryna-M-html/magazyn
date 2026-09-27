import { Intake } from '../models/Intake.js';
import Revision from '../models/Revision.js';

export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    // ============================================================
    // ПРОВЕРКА ПАРАМЕТРОВ
    // ============================================================

    if (!year || !month) {
      return res.status(400).json({
        status: 'error',
        message: 'Параметры year и month обязательны',
      });
    }

    const targetYear = parseInt(year, 10);
    const targetMonth = parseInt(month, 10);

    if (
      Number.isNaN(targetYear) ||
      Number.isNaN(targetMonth) ||
      targetMonth < 1 ||
      targetMonth > 12
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректные параметры year или month',
      });
    }

    // ============================================================
    // ДАТЫ ВЫБРАННОГО МЕСЯЦА
    // ============================================================

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);

    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    const today = new Date();

    // ============================================================
    // ПОЛУЧАЕМ РЕВИЗИЮ ЗА ВЫБРАННЫЙ МЕСЯЦ
    // ============================================================

    const revision = await Revision.findOne({
      year: targetYear,
      month: targetMonth,
    });

    // ============================================================
    // СОЗДАЁМ MAP ФАКТИЧЕСКИХ ОСТАТКОВ
    //
    // productId -> actualQuantity
    //
    // Например:
    //
    // {
    //   "65abc123": 25,
    //   "65abc456": 10
    // }
    // ============================================================

    const revisionMap = new Map();

    if (revision && Array.isArray(revision.items)) {
      revision.items.forEach((item) => {
        if (item.productId) {
          revisionMap.set(
            item.productId.toString(),
            Number(item.actualQuantity) || 0,
          );
        }
      });
    }

    // ============================================================
    // AGGREGATION
    // ============================================================

    const report = await Intake.aggregate([
      // ----------------------------------------------------------
      // Подтягиваем товар
      // ----------------------------------------------------------

      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },

      // ----------------------------------------------------------
      // Разворачиваем product
      // ----------------------------------------------------------

      {
        $unwind: '$product',
      },

      // ----------------------------------------------------------
      // Группируем партии по товару
      // ----------------------------------------------------------

      {
        $group: {
          _id: '$product._id',

          name: {
            $first: '$product.name',
          },

          barcode: {
            $first: '$product.barcode',
          },

          // ------------------------------------------------------
          // Всего принято за всё время
          // ------------------------------------------------------

          totalIntakeAllTime: {
            $sum: '$quantity',
          },

          // ------------------------------------------------------
          // Принято в выбранном месяце
          // ------------------------------------------------------

          totalIntakeMonth: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $gte: ['$createdAt', startOfMonth],
                    },
                    {
                      $lte: ['$createdAt', endOfMonth],
                    },
                  ],
                },
                '$quantity',
                0,
              ],
            },
          },

          // ------------------------------------------------------
          // Расчётный текущий остаток
          //
          // Он используется только если нет фактического остатка
          // из ревизии.
          // ------------------------------------------------------

          currentStock: {
            $sum: {
              $cond: [
                {
                  $gt: ['$expirationDate', today],
                },
                '$quantity',
                0,
              ],
            },
          },

          // ------------------------------------------------------
          // Просроченное количество
          // ------------------------------------------------------

          expiredQuantity: {
            $sum: {
              $cond: [
                {
                  $lte: ['$expirationDate', today],
                },
                '$quantity',
                0,
              ],
            },
          },
        },
      },

      // ----------------------------------------------------------
      // Первоначальный проект
      // ----------------------------------------------------------

      {
        $project: {
          _id: 1,
          name: 1,
          barcode: 1,
          totalIntakeAllTime: 1,
          totalIntakeMonth: 1,
          currentStock: 1,
          expiredQuantity: 1,
        },
      },

      // ----------------------------------------------------------
      // Сортировка
      // ----------------------------------------------------------

      {
        $sort: {
          name: 1,
        },
      },
    ]);

    // ============================================================
    // ПРИМЕНЯЕМ ФАКТИЧЕСКИЕ ОСТАТКИ ИЗ РЕВИЗИИ
    // ============================================================

    const finalReport = report.map((item) => {
      const productId = item._id.toString();

      // ----------------------------------------------------------
      // Если есть ревизия для этого товара —
      // используем фактический остаток.
      //
      // Если ревизии нет —
      // используем расчётный currentStock.
      // ----------------------------------------------------------

      const currentStock = revisionMap.has(productId)
        ? revisionMap.get(productId)
        : item.currentStock;

      // ----------------------------------------------------------
      // Расход
      // ----------------------------------------------------------

      const dailyConsumption =
        item.totalIntakeMonth > currentStock
          ? Number(
              ((item.totalIntakeMonth - currentStock) / daysInMonth).toFixed(2),
            )
          : 0;

      return {
        ...item,

        // Фактический или расчётный остаток
        currentStock,

        // Средний расход в день
        dailyConsumption,
      };
    });

    // ============================================================
    // ОТВЕТ
    // ============================================================

    return res.status(200).json({
      status: 'success',

      period: {
        year: targetYear,
        month: targetMonth,
        daysInMonth,
      },

      // Была ли найдена ревизия
      revision: Boolean(revision),

      // Количество товаров в отчёте
      amount: finalReport.length,

      data: finalReport,
    });
  } catch (error) {
    console.error('Ошибка при формировании отчета:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера при получении отчета',
    });
  }
};
