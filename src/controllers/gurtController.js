export const getGurtproductGurtSG = (req, res, next) => {
  const { chromium } = require('playwright');

  async function getProductData(searchQuery) {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Декодируем query, чтобы фильтр понимал и обычный текст, и URL-encoded
    const decodedSearchQuery = decodeURIComponent(searchQuery);

    page.on('response', async (response) => {
      const request = response.request();
      const resourceType = request.resourceType();
      const decodedUrl = decodeURIComponent(response.url());

      // Фильтруем XHR/Fetch запросы, которые содержат поисковую строку
      if (
        (resourceType === 'xhr' || resourceType === 'fetch') &&
        decodedUrl.toLowerCase().includes(decodedSearchQuery.toLowerCase())
      ) {
        console.log(`[+] Найден запрос: ${response.url()}`);

        try {
          const responseBody = await response.json();
          console.log('Ответ сервера:', responseBody);
        } catch (err) {
          console.error('Не удалось прочитать тело ответа:', err.message);
        }
      }
    });

    const targetUrl = `https://www.selgros.pl/znajdz-produkt/product/${encodeURIComponent(searchQuery)}`;
    console.log(`Переходим на: ${targetUrl}`);

    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // await browser.close();
  }
  getProductData('pudliszki-ketchup-łagodny');
};
// Теперь можно передать ЛЮБОЙ продукт:

// getProductData('mleko-laciate-3-2');
// getProductData('chleb-baltonowski');
