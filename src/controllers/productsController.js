import { Product } from '../models/product.js';
import { Intake } from '../models/Intake.js';
import { logAction, productLabel } from '../services/auditLog.js';
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
        category: product.category,

        product_quantity: product.productQuantity ?? null,
        product_quantity_unit: product.productQuantityUnit || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const { category, shelfPrice } = req.body;

    const product = await Product.findOne({ barcode });

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Товар с таким штрихкодом не найден',
      });
    }

    const before = { category: product.category, shelfPrice: product.shelfPrice };

    if (category !== undefined) product.category = category;
    if (shelfPrice !== undefined) product.shelfPrice = shelfPrice;

    await product.save();

    await logAction(req, {
      action: 'product.updated',
      entityType: 'product',
      entityId: product._id,
      entityLabel: productLabel(product),
      changes: [
        { field: 'category', from: before.category, to: product.category },
        { field: 'shelfPrice', from: before.shelfPrice, to: product.shelfPrice },
      ],
    });

    return res.status(200).json({
      status: 'success',
      message: 'Информация о товаре успешно обновлена',
      data: {
        id: product._id,
        name: product.name,
        barcode: product.barcode,
        brand: product.brand,
        imageUrl: product.imageUrl,
        source: product.source,
        productQuantity: product.productQuantity,
        productQuantityUnit: product.productQuantityUnit,
        category: product.category,
        shelfPrice: product.shelfPrice,
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
      productQuantity,
      productQuantityUnit,
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
      // Пустая строка не входит в enum категорий — тогда берётся значение по умолчанию («Другое»)
      category: category || undefined,
      unit: unit || 'шт',
      // Из form-data числа приходят строками
      productQuantity: productQuantity ? Number(productQuantity) : null,
      productQuantityUnit: productQuantityUnit || '',
      imageUrl: finalImageUrl,
      cloudinaryPublicId,
      source: 'MANUAL',
    });

    await logAction(req, {
      action: 'product.created',
      entityType: 'product',
      entityId: newProduct._id,
      entityLabel: productLabel(newProduct),
      details: {
        source: 'MANUAL',
        category: newProduct.category,
        productQuantity: newProduct.productQuantity,
        productQuantityUnit: newProduct.productQuantityUnit,
      },
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
    const { productId, quantity, batch, expirationDate, priceNetto } = req.body;

    const productExists = await Product.findById(productId).select('name barcode');
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
      priceNetto: priceNetto ?? null,
    });

    await logAction(req, {
      action: 'intake.created',
      entityType: 'intake',
      entityId: newIntake._id,
      entityLabel: productLabel(productExists),
      details: {
        quantity: newIntake.quantity,
        batch: newIntake.batch,
        expirationDate: newIntake.expirationDate,
        priceNetto: newIntake.priceNetto,
      },
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
      .populate(
        'productId',
        'name barcode brand imageUrl unit category productQuantity productQuantityUnit',
      )
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
    const before = {
      discountedQuantity: intake.discountedQuantity,
      writtenOffQuantity: intake.writtenOffQuantity,
    };

    intake.discountedQuantity = newDiscountedQuantity;
    intake.writtenOffQuantity = newWrittenOffQuantity;

    await intake.save();

    const product = await Product.findById(intake.productId).select('name barcode');
    const entity = {
      entityType: 'intake',
      entityId: intake._id,
      entityLabel: productLabel(product),
    };

    if (discountedQuantity > 0) {
      await logAction(req, {
        action: 'intake.discounted',
        ...entity,
        changes: [
          { field: 'discountedQuantity', from: before.discountedQuantity, to: newDiscountedQuantity },
        ],
        details: { quantity: discountedQuantity, batch: intake.batch },
      });
    }

    if (writtenOffQuantity > 0) {
      await logAction(req, {
        action: 'intake.written_off',
        ...entity,
        changes: [
          { field: 'writtenOffQuantity', from: before.writtenOffQuantity, to: newWrittenOffQuantity },
        ],
        details: { quantity: writtenOffQuantity, batch: intake.batch },
      });
    }

    return res.status(200).json({
      message: 'Intake updated successfully',
      intake,
    });
  } catch (error) {
    next(error);
  }
};
// Изменение цены нетто партии; брутто пересчитывается автоматически (virtual priceBrutto)
export const updateIntakePrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { priceNetto } = req.body;

    const intake = await Intake.findById(id);

    if (!intake) {
      return res.status(404).json({
        status: 'error',
        message: 'Запись приёмки не найдена',
      });
    }

    const previousPrice = intake.priceNetto;

    intake.priceNetto = priceNetto;
    await intake.save();

    // category нужна для расчёта VAT / брутто в ответе
    await intake.populate(
      'productId',
      'name barcode brand imageUrl category shelfPrice productQuantity productQuantityUnit',
    );

    await logAction(req, {
      action: 'intake.price_changed',
      entityType: 'intake',
      entityId: intake._id,
      entityLabel: productLabel(intake.productId),
      changes: [{ field: 'priceNetto', from: previousPrice, to: intake.priceNetto }],
      details: { batch: intake.batch, priceBrutto: intake.priceBrutto },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Цена партии обновлена',
      data: intake,
    });
  } catch (error) {
    next(error);
  }
};
////////////

export const getIntake = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ищем приёмку и подтягиваем данные связанного товара
    const intake = await Intake.findById(id).populate(
      'productId',
      'name barcode brand imageUrl category shelfPrice productQuantity productQuantityUnit',
    );

    if (!intake) {
      return res.status(404).json({
        status: 'error',
        message: 'Запись приёмки не найдена',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: intake,
    });
  } catch (error) {
    next(error);
  }
};
