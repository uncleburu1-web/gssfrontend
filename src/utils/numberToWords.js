const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion'];

function threeDigitsToWords(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' hundred';
    n %= 100;
    if (n > 0) str += ' and ';
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)];
    if (n % 10 > 0) str += '-' + ONES[n % 10];
  } else if (n > 0) {
    str += ONES[n];
  }
  return str;
}

export function numberToWords(num) {
  num = Math.floor(Number(num) || 0);
  if (num === 0) return 'zero';
  const groups = [];
  let n = num;
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    let words = threeDigitsToWords(groups[i]);
    if (SCALES[i]) words += ' ' + SCALES[i];
    parts.push(words);
  }
  return parts.join(', ');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function amountToWords(amount) {
  const value = Number(amount) || 0;
  const naira = Math.floor(value);
  const kobo = Math.round((value - naira) * 100);
  let words = capitalize(numberToWords(naira)) + ' Naira';
  if (kobo > 0) {
    words += ' and ' + numberToWords(kobo) + ' Kobo';
  }
  return words + ' only';
}
