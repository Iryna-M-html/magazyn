import axios from 'axios';

export const fetchProductFromOFF = async (barcode) => {
  try {
    // В запрос можно добавить свой параметр fields, чтобы OFF отдавал только нужные ключи
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=code,product_name,product_name_pl,brands,image_url,image_front_url`;

    const response = await axios.get(url, {
      headers: {
        // Хорошая практика OFF: указывать User-Agent вашего приложения
        'User-Agent': 'MyInventoryApp/1.0 (contact@example.com)',
      },
    });

    const data = response.data;

    // Статус 0 означает, что продукт не найден в базе OpenFoodFacts
    if (data.status === 0 || !data.product) {
      return null;
    }

    const { product } = data;

    // Нормализация данных: извлекаем названия, бренды и наилучшую картинку
    return {
      barcode: data.code || barcode,
      // Берём локализованное имя (если есть) или стандартное
      name:
        product.product_name_pl ||
        product.product_name ||
        'Наименование не указано',
      brand: product.brands || 'Производитель не указан',
      // Берем лицевое изображение или общее изображение товара
      imageUrl: product.image_front_url || product.image_url || null,
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error('Ошибка обращения к OpenFoodFacts API:', error.message);
    throw new Error('Не удалось получить данные о товаре из внешнего сервиса');
  }
};
