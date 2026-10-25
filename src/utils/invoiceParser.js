// Разбор текста фактуры (результат OCR) в строки товаров.
// OCR даёт только текст, поэтому строки таблицы ищутся эвристиками:
//   «1 KETCHUP ŁAG. PUDLISZKI 480G szt 12 5,49 65,88 8% 71,15»
// Всё, что удалось извлечь, пользователь проверяет и правит на фронтенде.

const UNIT_PATTERN = /^(szt|sztuk|szt\.|op|opak|opak\.|kg|l|but|kart|kpl|pcs|шт)\.?$/i;
const VAT_PATTERN = /^(\d{1,2})\s?%$/;
const MONEY_PATTERN = /^-?\d{1,3}(?:[ .]\d{3})*,\d{2}$|^-?\d+[.,]\d{2}$/;
const INTEGER_PATTERN = /^\d{1,5}$/;
const EAN_PATTERN = /^\d{8}$|^\d{12,14}$/;
// Вес / объём в названии: «480G», «0,5L», «1 kg», «330 ml»
const WEIGHT_PATTERN = /(\d+(?:[.,]\d+)?)\s?(kg|g|gr|ml|l)\b\.?/i;

// Строки «шапки» и итогов — не товары
const SKIP_PATTERN =
  /(razem|suma|do zapłaty|do zaplaty|w tym|podsumowanie|nabywca|sprzedawca|nip|regon|bank|konto|termin|płatno|platno|faktura|data|strona|wartość netto|wartosc netto|stawka|cena netto|nazwa towaru|lp\.)/i;

const toNumber = (value) => Number(String(value).replace(/\s/g, '').replace(',', '.'));

// «0,5L» → { quantity: 500, unit: 'ml' }, «480G» → { quantity: 480, unit: 'g' }
export function parseWeight(text) {
  const match = WEIGHT_PATTERN.exec(text);

  if (!match) {
    return null;
  }

  const value = toNumber(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'l') {
    return { quantity: Math.round(value * 1000), unit: 'ml' };
  }

  if (unit === 'gr') {
    return { quantity: value, unit: 'g' };
  }

  return { quantity: value, unit };
}

export function parseInvoiceNumber(text) {
  const match =
    /(?:faktura(?:\s+vat)?|fv|f-ra)\s*(?:nr|numer|no\.?)?\s*[:.]?\s*([A-Z0-9][A-Z0-9/\-_.]{2,})/i.exec(
      text,
    );

  return match ? match[1].replace(/[.,]$/, '') : '';
}

/**
 * Одна строка таблицы → позиция фактуры или null.
 * Цена нетто за штуку выбирается как пара денежных значений a, b, где a × количество ≈ b
 * (цена × количество = стоимость нетто) — так не важен порядок колонок у разных поставщиков.
 */
export function parseInvoiceLine(line) {
  const clean = line
    .replace(/[|¦]/g, ' ')
    .replace(/\s+/g, ' ')
    // «400 G» → «400G», «5 %» → «5%»: OCR и шаблоны фактур часто ставят пробел
    .replace(/(\d+(?:[.,]\d+)?) (kg|g|gr|ml|l)\b/gi, '$1$2')
    .replace(/(\d{1,2}) %/g, '$1%')
    .trim();

  if (clean.length < 6 || SKIP_PATTERN.test(clean)) {
    return null;
  }

  const tokens = clean.split(' ');

  let ean = null;
  let vatRate = null;
  let unitIndex = -1;
  const money = [];
  const integers = [];

  tokens.forEach((token, index) => {
    const bare = token.replace(/[;:]$/, '');

    if (EAN_PATTERN.test(bare)) {
      ean = bare;
    } else if (VAT_PATTERN.test(bare)) {
      vatRate = Number(VAT_PATTERN.exec(bare)[1]);
    } else if (UNIT_PATTERN.test(bare) && unitIndex === -1 && index > 0) {
      unitIndex = index;
    } else if (MONEY_PATTERN.test(bare)) {
      money.push({ index, value: toNumber(bare) });
    } else if (INTEGER_PATTERN.test(bare)) {
      integers.push({ index, value: Number(bare) });
    }
  });

  // Без хотя бы одной цены это не строка товара
  if (money.length === 0) {
    return null;
  }

  // Начало числовой части строки: единица измерения или первое число после названия
  const firstNumericIndex = Math.min(
    ...[unitIndex, money[0].index, ...integers.filter((n) => n.index > 0).map((n) => n.index)].filter(
      (index) => index > 0,
    ),
  );

  // Порядковый номер (Lp.) в начале строки — не часть названия
  const nameStart = INTEGER_PATTERN.test(tokens[0]) || /^\d+\.$/.test(tokens[0]) ? 1 : 0;
  const nameTokens = tokens
    .slice(nameStart, firstNumericIndex)
    .filter((token) => !EAN_PATTERN.test(token));
  const name = nameTokens.join(' ').trim();

  if (!/[A-Za-zÀ-žА-яЁё]{3,}/.test(name)) {
    return null;
  }

  // Количество: целое после названия (обычно рядом с единицей измерения)
  const quantityCandidates = integers.filter((n) => n.index >= firstNumericIndex);
  const quantityToken =
    quantityCandidates.find((n) => Math.abs(n.index - unitIndex) === 1) ?? quantityCandidates[0];
  // Количество может быть записано и как «12,00»
  let quantity = quantityToken?.value ?? null;

  let unitNetPrice = null;

  if (quantity) {
    for (let i = 0; i < money.length && unitNetPrice === null; i++) {
      for (let j = i + 1; j < money.length; j++) {
        if (Math.abs(money[i].value * quantity - money[j].value) <= 0.05) {
          unitNetPrice = money[i].value;
          break;
        }
      }
    }
  } else {
    // «12,00 5,49 65,88»: количество тоже с копейками
    for (let k = 0; k < money.length && unitNetPrice === null; k++) {
      for (let i = 0; i < money.length; i++) {
        for (let j = 0; j < money.length; j++) {
          if (i !== j && j !== k && i !== k && Number.isInteger(money[k].value) &&
              Math.abs(money[i].value * money[k].value - money[j].value) <= 0.05) {
            quantity = money[k].value;
            unitNetPrice = money[i].value;
          }
        }
      }
    }
  }

  return {
    line: clean,
    name,
    ean,
    weight: parseWeight(name),
    quantity: quantity ?? 1,
    unitNetPrice: unitNetPrice ?? money[0].value,
    vatRate,
    // true — цена найдена по проверке «цена × количество = стоимость», иначе это догадка
    priceVerified: unitNetPrice !== null,
  };
}

export function parseInvoiceText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = lines.map(parseInvoiceLine).filter(Boolean);

  return {
    invoiceNumber: parseInvoiceNumber(text),
    items,
  };
}
