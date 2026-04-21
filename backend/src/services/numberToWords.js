// Spanish number-to-words conversion (Honduras / Lempiras format)

const ONES = [
  '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS',
  'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
];

const TENS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];

const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

/**
 * Converts a number less than 1000 to words in Spanish.
 * @param {number} n - Integer between 0 and 999
 * @returns {string}
 */
function convertHundreds(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const h = Math.floor(n / 100);
  const remainder = n % 100;

  let words = '';

  if (h > 0) {
    words += HUNDREDS[h];
  }

  if (remainder === 0) {
    return words.trim();
  }

  if (words) words += ' ';

  if (remainder < 30) {
    words += ONES[remainder];
  } else {
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;
    words += TENS[t];
    if (o > 0) {
      words += ' Y ' + ONES[o];
    }
  }

  return words.trim();
}

/**
 * Converts a non-negative integer to Spanish words.
 * @param {number} n - Non-negative integer
 * @returns {string}
 */
function convertInteger(n) {
  if (n === 0) return 'CERO';
  if (n === 1000) return 'MIL';

  let words = '';

  // Millions
  if (n >= 1000000) {
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    if (millions === 1) {
      words += 'UN MILLÓN';
    } else {
      words += convertHundreds(millions) + ' MILLONES';
    }
    if (rest > 0) {
      words += ' ' + convertInteger(rest);
    }
    return words.trim();
  }

  // Thousands
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    if (thousands === 1) {
      words += 'MIL';
    } else {
      words += convertHundreds(thousands) + ' MIL';
    }
    if (rest > 0) {
      words += ' ' + convertHundreds(rest);
    }
    return words.trim();
  }

  // Hundreds and below
  return convertHundreds(n);
}

/**
 * Converts a monetary amount to Spanish words in Honduras Lempiras format.
 * @param {number} amount - The monetary amount (e.g. 79350.00)
 * @returns {string} e.g. "SETENTA Y NUEVE MIL TRESCIENTOS CINCUENTA LEMPIRAS CON 00/100 CTVS"
 */
function numberToWords(amount) {
  const num = parseFloat(amount || 0)
  if (isNaN(num) || num < 0) return 'VALOR NO VÁLIDO'
  const rounded = Math.round(num * 100) / 100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);

  const intWords = convertInteger(intPart);
  const decStr = String(decPart).padStart(2, '0');

  return `${intWords} LEMPIRAS CON ${decStr}/100 CTVS`;
}

module.exports = { numberToWords };
