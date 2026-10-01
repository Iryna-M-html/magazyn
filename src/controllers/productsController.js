import { Product } from '../models/Product.js';
import { Intake } from '../models/Intake.js';
import { fetchProductFromOFF } from '../services/openFoodFactsService.js';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';

// 1. Поиск товара по штрихкоду (Локальная база -> OFF / Open Products / Open Beauty)
export const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;

    // Ищем в локальной базе MongoDB
    let product = await Product.findOne({ barcode });

    // Если в базе нет — ищем во внешних базах (Еда, Вода, Химия, Косметика)
    if (!product) {
      const externalProduct = await fetchProductFromOFF(barcode);

      if (!externalProduct) {
        return res.status(404).json({
          status: 'error',
          message:
            'Товар с таким штрихкодом не найден ни в локальной базе, ни во внешних каталогах',
        });
      }

      // Кэшируем найденный товар в базу
      product = await Product.create({
        name: externalProduct.name,
        barcode: externalProduct.barcode,
        brand: externalProduct.brand,
        imageUrl: externalProduct.imageUrl || '',
        source: externalProduct.source,
        productQuantity: externalProduct.productQuantity ?? null,
        productQuantityUnit: externalProduct.productQuantityUnit || '',
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
        source: product.source,

        product_quantity: product.productQuantity ?? null,
        product_quantity_unit: product.productQuantityUnit || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Ручное создание товара (с загрузкой фото в Cloudinary)
export const createProductManual = async (req, res, next) => {
  try {
    const {
      barcode,
      name,
      brand,
      category,
      unit,
      imageUrl: bodyImageUrl,
    } = req.body;

    // Проверка на дубликат штрихкода
    const existingProduct = await Product.findOne({ barcode });
    if (existingProduct) {
      return res.status(409).json({
        status: 'error',
        message: 'Товар с таким штрихкодом уже существует в системе',
        data: existingProduct,
      });
    }

    let finalImageUrl = bodyImageUrl || '';
    let cloudinaryPublicId = null;

    // Если загружен файл через multer (form-data)
    if (req.file) {
      const cloudinaryResult = await saveFileToCloudinary(
        req.file.buffer,
        'products',
      );
      finalImageUrl = cloudinaryResult.secure_url;
      cloudinaryPublicId = cloudinaryResult.public_id;
    }

    const newProduct = await Product.create({
      barcode,
      name,
      brand: brand || '',
      category: category || '',
      unit: unit || 'шт',
      imageUrl: finalImageUrl,
      cloudinaryPublicId,
      source: 'MANUAL',
    });

    return res.status(201).json({
      status: 'success',
      message: 'Товар успешно создан',
      data: newProduct,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Фиксация приемки товара (сохранение партии и срока годности)
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
      batch: batch || null,
      expirationDate: new Date(expirationDate),
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

// 4. Получение списка всех приемок (с фильтрацией по месяцу/году и FEFO-сортировкой)
export const getAllIntakes = async (req, res, next) => {
  try {
    const { productId, year, month } = req.query;
    const filter = {};

    if (productId) {
      filter.productId = productId;
    }

    // Фильтрация по месяцу и году
    if (year) {
      const yearNum = parseInt(year, 10);
      let startDate, endDate;

      if (month) {
        const monthNum = parseInt(month, 10) - 1; // 0-11
        startDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0));
        // Последний день месяца
        endDate = new Date(Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999));
      } else {
        startDate = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));
      }

      // Поддерживает фильтрацию как по объектам Date, так и по строкам ISO
      filter.$or = [
        {
          expirationDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          expirationDate: {
            $gte: startDate.toISOString(),
            $lte: endDate.toISOString(),
          },
        },
        // Если даты в базе записаны только как YYYY-MM-DD
        {
          expirationDate: {
            $gte: startDate.toISOString().split('T')[0],
            $lte: endDate.toISOString().split('T')[0],
          },
        },
      ];
    }

    const intakes = await Intake.find(filter)
      .populate('productId', 'name barcode brand imageUrl unit')
      .sort({ expirationDate: 1 }); // Сортировка FEFO

    return res.status(200).json({
      status: 'success',
      amount: intakes.length,
      data: intakes,
    });
  } catch (error) {
    next(error);
  }
};
export const updateIntake = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { discountedQuantity = 0, writtenOffQuantity = 0 } = req.body;

    const intake = await Intake.findById(id);

    if (!intake) {
      return res.status(404).json({
        message: 'Intake not found',
      });
    }

    // Новые итоговые значения
    const newDiscountedQuantity =
      intake.discountedQuantity + discountedQuantity;

    const newWrittenOffQuantity =
      intake.writtenOffQuantity + writtenOffQuantity;

    // Общее количество, которое уже уценили + списали
    const usedQuantity = newDiscountedQuantity + newWrittenOffQuantity;

    // Нельзя обработать больше товара, чем есть в партии
    if (usedQuantity > intake.quantity) {
      return res.status(400).json({
        message:
          'Discounted and written-off quantity cannot exceed intake quantity',

        quantity: intake.quantity,

        currentDiscountedQuantity: intake.discountedQuantity,

        currentWrittenOffQuantity: intake.writtenOffQuantity,

        requestedDiscountedQuantity: discountedQuantity,

        requestedWrittenOffQuantity: writtenOffQuantity,

        remainingQuantity:
          intake.quantity -
          (intake.discountedQuantity + intake.writtenOffQuantity),
      });
    }
    intake.discountedQuantity = newDiscountedQuantity;
    intake.writtenOffQuantity = newWrittenOffQuantity;

    await intake.save();

    return res.status(200).json({
      message: 'Intake updated successfully',
      intake,
    });
  } catch (error) {
    next(error);
  }
};
