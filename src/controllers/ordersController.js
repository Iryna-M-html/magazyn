import { Intake } from '../models/Intake.js';
import { fetchExternalProductByEan } from '../services/externalPriceService.js';

export const getOrderInformationList = async (req, res) => {
  try {
    console.log('[Orders] Формируем список товаров...');

    // ==========================================
    // 1. Группируем партии по productId
    // ==========================================

    const productsWithStock = await Intake.aggregate([
      {
        $group: {
          _id: '$productId',

          totalQuantity: {
            $sum: '$quantity',
          },
        },
      },

      // ==========================================
      // 2. Получаем Product
      // ==========================================

      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },

      {
        $unwind: '$product',
      },

      // ==========================================
      // 3. Только товары с barcode
      // ==========================================

      {
        $match: {
          'product.barcode': {
            $exists: true,
            $nin: ['', null],
          },
        },
      },

      // ==========================================
      // 4. Формируем данные
      // ==========================================

      {
        $project: {
          _id: 0,

          productId: '$product._id',

          name: '$product.name',

          barcode: '$product.barcode',

          brand: '$product.brand',

          unit: '$product.productQuantityUnit',

          totalQuantity: 1,
        },
      },
    ]);

    console.log(`[Orders] Найдено товаров: ${productsWithStock.length}`);

    // ==========================================
    // 5. Для каждого товара ищем цену Selgros
    // ==========================================

    const results = await Promise.all(
      productsWithStock.map(async (item) => {
        console.log(`[Orders] Проверяем barcode: ${item.barcode}`);

        const externalData = await fetchExternalProductByEan(item.barcode);

        console.log(
          `[Orders] Результат Selgros ${item.barcode}:`,
          externalData,
        );

        return {
          productId: item.productId,

          name: item.name,

          barcode: item.barcode,

          brand: item.brand,

          unit: item.unit || '',

          // Это количество из нашей базы
          totalQuantity: item.totalQuantity,

          // Это цена Selgros
          externalPrice: externalData?.externalPrice ?? null,

          currency: externalData?.currency ?? 'PLN',

          externalTitle: externalData?.externalTitle ?? null,

          isMatched: externalData?.isMatched ?? false,
        };
      }),
    );

    // ==========================================
    // 6. Отправляем результат
    // ==========================================

    return res.status(200).json({
      status: 'success',

      amount: results.length,

      data: results,
    });
  } catch (error) {
    console.error('[Orders] Ошибка:', error);

    return res.status(500).json({
      status: 'error',

      message: 'Server Error',
    });
  }
};
