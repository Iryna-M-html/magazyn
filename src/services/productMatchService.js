import axios from 'axios';
import { Product } from '../models/product.js';
import { parseWeight } from '../utils/invoiceParser.js';

// Сопоставление строки фактуры с товарами: своя база + Open Food Facts.
// В фактурах названия сокращены («KETCHUP ŁAG. PUDLISZKI 480G»), поэтому слова сравниваются
// без диакритики и по префиксу («łag» ~ «łagodny»), а совпадение веса и бренда добавляет баллы.

const STOP_WORDS = new Set(['szt', 'op', 'opak', 'kg', 'g', 'ml', 'l', 'gr', 'the', 'and', 'z', 'w', 'i', 'do', 'na']);

const normalize = (text = '') =>
  text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/(\d+(?:[.,]\d+)?)\s?(kg|g|gr|ml|l)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const tokenize = (text) =>
  normalize(text)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));

// «lag» и «lagodny» — одно слово (сокращение), минимум 3 буквы
const tokensMatch = (a, b) =>
  a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

const toGrams = (weight) => {
  if (!weight) {
    return null;
  }

  return weight.unit === 'kg' ? weight.quantity * 1000 : weight.quantity;
};

/** 0–100: насколько товар похож на строку фактуры */
export function scoreCandidate(query, candidate) {
  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(`${candidate.name} ${candidate.brand ?? ''}`);

  if (queryTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const matched = queryTokens.filter((token) =>
    candidateTokens.some((candidateToken) => tokensMatch(token, candidateToken)),
  ).length;

  // Доля совпавших слов фактуры — главное; лишние слова в названии товара штрафуют слабее
  let score = (matched / queryTokens.length) * 70 + (matched / candidateTokens.length) * 15;

  const queryWeight = parseWeight(query);
  const candidateWeight =
    candidate.productQuantity && candidate.productQuantityUnit
      ? { quantity: candidate.productQuantity, unit: candidate.productQuantityUnit.toLowerCase() }
      : parseWeight(candidate.name);

  if (queryWeight && candidateWeight) {
    // Вес совпал — +15, явно другой вес — −20
    score += toGrams(queryWeight) === toGrams(candidateWeight) ? 15 : -20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Кандидаты из своей базы */
export async function matchInDatabase(query, limit = 5) {
  const tokens = tokenize(query).filter((token) => token.length >= 3);

  if (tokens.length === 0) {
    return [];
  }

  // Предварительный отбор по началу любого слова (без диакритики сравнить в Mongo нельзя,
  // поэтому берём первые 3 буквы — они реже содержат диакритику), окончательный — scoreCandidate
  const prefixes = [...new Set(tokens.map((token) => token.slice(0, 3)))];
  const regex = new RegExp(prefixes.map(escapeRegex).join('|'), 'i');

  const products = await Product.find({ $or: [{ name: regex }, { brand: regex }] })
    .limit(300)
    .lean();

  return products
    .map((product) => ({
      source: 'db',
      productId: String(product._id),
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      productQuantity: product.productQuantity,
      productQuantityUnit: product.productQuantityUnit,
      category: product.category,
    }))
    .map((candidate) => ({ ...candidate, score: scoreCandidate(query, candidate) }))
    .filter((candidate) => candidate.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Open Food Facts ограничивает поиск ~10 запросами в минуту — повторные запросы берём из кеша
const offCache = new Map();
const OFF_CACHE_TTL = 60 * 60 * 1000;

/** Кандидаты из Open Food Facts (поиск по названию) */
export async function matchInOpenFoodFacts(query, limit = 5) {
  // Полнотекстовый поиск OFF не понимает сокращений («ŁAG.») — в запрос идут только полные слова;
  // в оценке сходства (scoreCandidate) сокращения по-прежнему учитываются
  const searchTerms = query
    .split(/\s+/)
    .filter((word) => !word.endsWith('.'))
    .map((word) => normalize(word))
    .filter((word) => word.length >= 3 && !/^\d/.test(word))
    .join(' ');

  if (!searchTerms) {
    return [];
  }

  const cached = offCache.get(searchTerms);

  if (cached && Date.now() - cached.at < OFF_CACHE_TTL) {
    return cached.results;
  }

  // Новый поисковый API (search-a-licious); старый cgi/search.pl отвечает 503 анонимным клиентам
  const response = await axios.get('https://search.openfoodfacts.org/search', {
    params: {
      q: searchTerms,
      page_size: 20,
      fields:
        'code,product_name,product_name_pl,brands,quantity,product_quantity,product_quantity_unit,image_front_small_url',
    },
    headers: { 'User-Agent': 'MagazynApp/1.0 (contact@example.com)' },
    timeout: 10000,
  });

  const results = (response.data?.hits ?? [])
    .filter((product) => product.code && (product.product_name_pl || product.product_name))
    .map((product) => {
      const brands = Array.isArray(product.brands)
        ? product.brands
        : String(product.brands ?? '').split(',');
      const quantity = Number(product.product_quantity);
      // Если нет числового веса — берём из строки «480 g»
      const parsed = parseWeight(String(product.quantity ?? ''));

      return {
        source: 'off',
        productId: null,
        barcode: product.code,
        name: product.product_name_pl || product.product_name,
        brand: (brands[0] ?? '').trim(),
        imageUrl: product.image_front_small_url ?? '',
        productQuantity:
          Number.isFinite(quantity) && quantity > 0 ? quantity : (parsed?.quantity ?? null),
        productQuantityUnit: product.product_quantity_unit || parsed?.unit || '',
      };
    })
    .map((candidate) => ({ ...candidate, score: scoreCandidate(query, candidate) }))
    .filter((candidate) => candidate.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  offCache.set(searchTerms, { at: Date.now(), results });

  return results;
}
