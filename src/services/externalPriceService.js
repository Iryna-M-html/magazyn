import { chromium } from 'playwright';

const SELGROS_PAGE_URL = 'https://www.selgros.pl/znajdz-produkt';

const EXTERNAL_SEARCH_URL =
  'https://www.selgros.pl/znajdz-produkt/product/search';

let browser = null;
let context = null;
let page = null;

/**
 * Создаём настоящий Chromium.
 *
 * Браузер запускается один раз и потом используется
 * для последующих запросов.
 */
async function getBrowserPage() {
  if (page) {
    return page;
  }

  console.log('[Selgros] Запускаем Chromium...');

  browser = await chromium.launch({
    headless: true,
  });

  context = await browser.newContext({
    locale: 'pl-PL',

    viewport: {
      width: 1366,
      height: 768,
    },

    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/122.0.0.0 Safari/537.36',

    extraHTTPHeaders: {
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  page = await context.newPage();

  // Открываем настоящий сайт.
  console.log('[Selgros] Открываем страницу Selgros...');

  await page.goto(SELGROS_PAGE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  console.log('[Selgros] Страница открыта');

  return page;
}

/**
 * Получение товара Selgros по EAN.
 */
export async function fetchExternalProductByEan(barcode) {
  const cleanBarcode = String(barcode ?? '').trim();

  if (!cleanBarcode) {
    console.log('[Selgros] Пустой barcode');
    return null;
  }

  try {
    console.log('\n========================================');
    console.log('[Selgros] SEARCH EAN:', cleanBarcode);
    console.log('========================================');

    const currentPage = await getBrowserPage();

    /**
     * Выполняем POST НЕ через axios,
     * а непосредственно внутри Chromium.
     *
     * Это важно:
     * запрос выполняется из настоящего браузерного контекста.
     */
    const result = await currentPage.evaluate(
      async ({ url, barcode }) => {
        const response = await fetch(url, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
          },

          body: JSON.stringify({
            query: barcode,
          }),

          credentials: 'include',
        });

        const text = await response.text();

        let data = null;

        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        return {
          ok: response.ok,
          status: response.status,
          data,
        };
      },
      {
        url: EXTERNAL_SEARCH_URL,
        barcode: cleanBarcode,
      },
    );

    console.log('[Selgros] HTTP STATUS:', result.status);

    if (!result.ok) {
      console.error(`[Selgros] Ошибка HTTP ${result.status}`);

      return null;
    }

    const data = result.data;

    console.log('[Selgros] RAW RESPONSE:', JSON.stringify(data, null, 2));

    /**
     * ============================================
     * РАСПАКОВКА ОТВЕТА
     * ============================================
     */

    let products = [];

    if (Array.isArray(data)) {
      products = data;
    } else if (Array.isArray(data?.data)) {
      products = data.data;
    } else if (Array.isArray(data?.items)) {
      products = data.items;
    } else if (Array.isArray(data?.results)) {
      products = data.results;
    } else if (Array.isArray(data?.hits)) {
      products = data.hits;
    } else if (data && typeof data === 'object') {
      products = [data];
    }

    console.log('[Selgros] Найдено объектов:', products.length);

    if (!products.length) {
      console.log(`[Selgros] Товар не найден: ${cleanBarcode}`);

      return null;
    }

    /**
     * ============================================
     * ИЩЕМ ТОВАР ПО EAN
     * ============================================
     */

    var test = 1;

    for (const product of products) {
      if (!product || typeof product !== 'object') {
        continue;
      }
      if (test++ > 1) break;

      const units = Array.isArray(product.units) ? product.units : [];

      let matchedEan = null;
      let _matchedUnit = null;

      for (const unit of units) {
        const eans = Array.isArray(unit?.eans) ? unit.eans : [];

        for (const ean of eans) {
          const normalizedEan = String(ean ?? '').trim();

          console.log(`[Selgros] Проверяем EAN: ${normalizedEan}`);

          if (normalizedEan === cleanBarcode) {
            matchedEan = normalizedEan;
            _matchedUnit = unit;
            break;
          }
        }

        if (matchedEan) {
          break;
        }
      }

      /**
       * Если EAN найден
       */
      if (matchedEan) {
        /**
         * ==========================================
         * БЕРЁМ filterPrice
         * ==========================================
         */

        let price = null;

        if (product.filterPrice !== null && product.filterPrice !== undefined) {
          price = Number(product.filterPrice);
        }

        /**
         * Запасной вариант:
         * prices[0].price.grossPrice
         */
        if (
          price === null &&
          product.prices?.[0]?.price?.grossPrice !== undefined &&
          product.prices?.[0]?.price?.grossPrice !== null
        ) {
          price = Number(product.prices[0].price.grossPrice);
        }

        console.log('========================================');

        console.log('[Selgros] MATCH!');

        console.log('[Selgros] EAN:', matchedEan);

        console.log('[Selgros] TITLE:', product.title);

        console.log('[Selgros] FILTER PRICE:', product.filterPrice);

        console.log('[Selgros] FINAL PRICE:', price);

        console.log('========================================');

        return {
          externalPrice: price,
          externalTitle: product.title ?? product.name ?? null,

          currency: product.prices?.[0]?.currency ?? 'PLN',

          isMatched: true,
        };
      }
    }

    console.log(`[Selgros] EAN ${cleanBarcode} НЕ найден в units.eans`);

    return null;
  } catch (error) {
    console.error(`[Selgros Error] EAN ${cleanBarcode}:`, error.message);

    return null;
  }
}

/**
 * Корректно закрываем Chromium при остановке Node.js.
 */
async function closeBrowser() {
  if (browser) {
    console.log('[Selgros] Закрываем Chromium...');

    await browser.close();

    browser = null;
    context = null;
    page = null;
  }
}

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
