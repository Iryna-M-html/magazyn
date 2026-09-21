import axios from 'axios';

export const fetchProductFromOFF = async (barcode) => {
  const domains = [
    'world.openfoodfacts.org',
    'world.openproductsfacts.org',
    'world.openbeautyfacts.org',
  ];

  // Добавили product_quantity и product_quantity_unit
  const fields =
    'code,product_name,product_name_pl,brands,image_url,image_front_url,product_quantity,product_quantity_unit';

  for (const domain of domains) {
    try {
      const url = `https://${domain}/api/v2/product/${barcode}.json?fields=${fields}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'MagazynApp/1.0 (contact@example.com)',
        },
        timeout: 3000,
      });

      const data = response.data;

      if (data.status === 1 && data.product) {
        const { product } = data;

        // Парсим quantity безопасно
        const rawQuantity = product.product_quantity;
        const parsedQuantity =
          rawQuantity !== undefined &&
          rawQuantity !== null &&
          rawQuantity !== ''
            ? Number(rawQuantity)
            : null;

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
          productQuantity: !isNaN(parsedQuantity) ? parsedQuantity : null,
          productQuantityUnit: product.product_quantity_unit || '',
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
