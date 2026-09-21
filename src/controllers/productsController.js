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

// 4. Получение списка всех приемок (с фильтрацией по месяцу/году и FEFO-сортировкой)
export const getAllIntakes = async (req, res, next) => {
  try {
    const { productId, year, month } = req.query;
    const filter = {};

    if (productId) {
      filter.productId = productId;
    }

    // Фильтрация по месяцу и году срока годности
    if (year && month) {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10) - 1;

      const startDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0));
      const endDate = new Date(
        Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999),
      );

      filter.expirationDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const yearNum = parseInt(year, 10);
      const startDate = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));

      filter.expirationDate = { $gte: startDate, $lte: endDate };
    }

    const intakes = await Intake.find(filter)
      .populate('productId', 'name barcode brand imageUrl unit')
      .sort({ expirationDate: 1 }); // Сортировка FEFO (ближайшие к просрочке вверху)

    return res.status(200).json({
      status: 'success',
      amount: intakes.length,
      data: intakes,
    });
  } catch (error) {
    next(error);
  }
};
