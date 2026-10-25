// «  Jan   KOWALSKI » → «jan kowalski»: имя для входа без учёта регистра и лишних пробелов
export const toLoginName = (fullName = '') =>
  fullName.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
