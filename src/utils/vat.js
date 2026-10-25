// Ставка VAT берётся из названия категории: «33 (Vat 8%)» → 8.
// Для категорий без ставки (например, «Другое») возвращается null.
export const parseVatRate = (categoryTitle) => {
  if (!categoryTitle) {
    return null;
  }

  const match = /vat\s*(\d+(?:[.,]\d+)?)\s*%/i.exec(categoryTitle);

  return match ? Number(match[1].replace(',', '.')) : null;
};

// Брутто = нетто × (1 + VAT), с округлением до грошей
export const calcPriceBrutto = (priceNetto, vatRate) => {
  if (priceNetto === null || priceNetto === undefined || vatRate === null) {
    return null;
  }

  return Math.round(priceNetto * (1 + vatRate / 100) * 100) / 100;
};
