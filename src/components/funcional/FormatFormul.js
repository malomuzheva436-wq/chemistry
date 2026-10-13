const SUBSCRIPT_DIGITS = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

// Превращает все цифры в строке в нижние индексы
export function digitsToSubscript(value) {
  return String(value ?? '').replace(/\d/g, (d) => SUBSCRIPT_DIGITS[d]);
}

// Превращает в нижний индекс ТОЛЬКО цифры, которые стоят после буквы
// или закрывающей скобки, — то есть индексы внутри формул.
// Обычные числа в тексте решения (22,4; 10^23; = 3 моль) не трогаются.
export function formulaToSubscript(value) {
  return String(value ?? '').replace(
    /([A-Za-zА-Яа-яЁё)\]])(\d+)/g,
    (_, prefix, digits) => prefix + digitsToSubscript(digits)
  );
}