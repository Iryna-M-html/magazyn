import crypto from 'crypto';

// Без похожих символов (0/o, 1/l/i), только строчные — код удобно набирать на телефоне
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

// Криптостойкий код доступа, который администратор выдаёт сотруднику
export function generateAccessCode(length = 10) {
  let code = '';

  for (let i = 0; i < length; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }

  return code;
}
