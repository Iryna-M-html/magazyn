import Revision from '../models/Revision.js';

// 1. Проведение / Сохранение ежемесячной ревизии
export const createOrUpdateRevision = async (req, res) => {
  try {
    const { year, month, items, note } = req.body;

    if (!year || !month || !Array.isArray(items)) {
      return res.status(400).json({
        status: 'error',
        message: 'Год, месяц и массив товаров (items) обязательны',
      });
    }

    // Подготавливаем элементы ревизии с подсчетом разницы
    const formattedItems = items.map((item) => ({
      productId: item.productId,
      expectedQuantity: Number(item.expectedQuantity || 0),
      actualQuantity: Number(item.actualQuantity || 0),
      difference:
        Number(item.actualQuantity || 0) - Number(item.expectedQuantity || 0),
      notes: item.notes || '',
    }));

    // Сохраняем или обновляем ревизию за указанный месяц
    const revision = await Revision.findOneAndUpdate(
      { year: Number(year), month: Number(month) },
      {
        revisionDate: new Date(),
        year: Number(year),
        month: Number(month),
        items: formattedItems,
        status: 'completed',
        note: note || '',
      },
      { new: true, upsert: true },
    );

    return res.status(200).json({
      status: 'success',
      message: 'Ревизия успешно сохранена',
      data: revision,
    });
  } catch (error) {
    console.error('Ошибка при сохранении ревизии:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера при сохранении ревизии',
    });
  }
};

// 2. Получение ревизии за конкретный месяц и год
export const getRevisionByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите year и month в параметрах запроса',
      });
    }

    const revision = await Revision.findOne({
      year: Number(year),
      month: Number(month),
    }).populate('items.productId', 'name barcode brand imageUrl');

    if (!revision) {
      return res.status(404).json({
        status: 'success',
        data: null,
        message: 'Ревизия за указанный период не найдена',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: revision,
    });
  } catch (error) {
    console.error('Ошибка при получении ревизии:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера при получении ревизии',
    });
  }
};

// 3. Получить список всех прошлых ревизий
export const getAllRevisions = async (req, res) => {
  try {
    const revisions = await Revision.find()
      .select('year month revisionDate status note items')
      .sort({ year: -1, month: -1 });

    const result = revisions.map((rev) => ({
      _id: rev._id,
      year: rev.year,
      month: rev.month,
      revisionDate: rev.revisionDate,
      totalPositions: rev.items.length,
      status: rev.status,
    }));

    return res.status(200).json({
      status: 'success',
      amount: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Ошибка при получении списка ревизий:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера',
    });
  }
};
