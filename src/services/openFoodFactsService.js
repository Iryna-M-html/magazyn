import axios from 'axios';

export const fetchProductFromOFF = async (barcode) => {
  const domains = [
    'world.openfoodfacts.org', // Еда, минеральная вода, напитки
    'world.openproductsfacts.org', // Бытовая химия, бытовые товары
    'world.openbeautyfacts.org', // Косметика и гигиена
  ];

  const fields =
    'code,product_name,product_name_pl,brands,image_url,image_front_url';

  for (const domain of domains) {
    try {
      const url = `https://${domain}/api/v2/product/${barcode}.json?fields=${fields}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'MagazynApp/1.0 (contact@example.com)',
        },
        timeout: 3000, // Таймаут 3 сек на каждый сервис
      });

      const data = response.data;

      if (data.status === 1 && data.product) {
        const { product } = data;

        return {
          barcode: data.code || barcode,
          name:
            product.product_name_pl ||
            product.product_name ||
            'Наименование не указано',
          brand: product.brands
            ? product.brands.split(',')[0].trim()
            : 'Производитель не указан',
          imageUrl: product.image_front_url || product.image_url || null,
          source: domain.includes('openfoodfacts')
            ? 'OPEN_FOOD_FACTS'
            : 'EXTERNAL_API',
        };
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        continue;
      }

      console.warn(`Ошибка при запросе к ${domain}:`, error.message);
    }
  }

  return null;
};
