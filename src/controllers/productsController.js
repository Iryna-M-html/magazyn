import { Product } from '../models/Product.js';
import { Intake } from '../models/Intake.js';
import { fetchProductFromOFF } from '../services/openFoodFactsService.js';

// GET /api/products/barcode/:barcode (Страница 2 -> Страница 3)
export const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;

    // 1. Ищем в локальной базе
    let product = await Product.findOne({ barcode });

    // 2. Если в локальной базе нет — ищем во внешнем API OpenFoodFacts
    if (!product) {
      const offProduct = await fetchProductFromOFF(barcode);

      if (!offProduct) {
        return res.status(404).json({
          status: 'error',
          message:
            'Товар с таким штрихкодом не найден ни в локальной базе, ни в OpenFoodFacts',
        });
      }

      // Опционально: Кэшируем/сохраняем найденный товар из OFF в нашу локальную БД
      product = await Product.create({
        name: offProduct.name,
        barcode: offProduct.barcode,
        brand: offProduct.brand,
        imageUrl: offProduct.imageUrl || 'https://via.placeholder.com/150', //  если нет картинки
        source: 'OPEN_FOOD_FACTS',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        id: product._id,
        name: product.name,
        barcode: product.barcode,
        brand: product.brand,
        imageUrl: product.imageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/inventory/intake (Страница 3 -> Кнопка «Далее»)
export const recordIntake = async (req, res, next) => {
  try {
    const { productId, quantity, batch, expirationDate } = req.body;

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({
        status: 'error',
        message: 'Указанный товар не существует',
      });
    }

    const newIntake = await Intake.create({
      productId,
      quantity,
      batch,
      expirationDate,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Товар успешно принят',
      data: newIntake,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllIntakes = async (req, res, next) => {
  try {
    const { productId, year, month } = req.query;
    const filter = {};

    if (productId) {
      filter.productId = productId;
    }

    if (year && month) {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10) - 1; // В JS месяцы идут от 0 (Январь) до 11 (Декабрь)

      // Начало месяца (например: 2026-09-01T00:00:00.000Z)
      const startDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0));
      // Конец месяца (например: 2026-09-30T23:59:59.999Z)
      const endDate = new Date(
        Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999),
      );

      filter.expirationDate = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (year) {
      // Если передан только год (выборка за весь год)
      const yearNum = parseInt(year, 10);
      const startDate = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));

      filter.expirationDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const intakes = await Intake.find(filter)
      .populate('productId', 'name barcode brand imageUrl')
      .sort({ expirationDate: 1 }); // Сортировка по FEFO (раньше истекает — выше в списке)

    return res.status(200).json({
      status: 'success',
      amount: intakes.length,
      data: intakes,
    });
  } catch (error) {
    next(error);
  }
};
