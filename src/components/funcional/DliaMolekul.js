export function parseScientificValue(input) {
  let str = String(input ?? '').trim();

  if (!str) {
    return NaN;
  }

  // Если вдруг пользователь написал единицу измерения вместе со значением
  str = str.replace(/(молекул|молекулы|молекула|шт\.?)/gi, '');

  // Убираем пробелы
  str = str.replace(/\s+/g, '');

  // Заменяем запятую на точку
  str = str.replace(/,/g, '.');

  // Если пользователь написал ** как степень, например 10**23
  str = str.replace(/\*\*/g, '^');

  // Заменяем разные знаки умножения на обычный *
  str = str.replace(/[×xх*·⋅]/gi, '*');

  // Проверяем формат: 9*10^23, 9.5*10^-23 и т.д.
  const match = str.match(/^(-?\d+(?:\.\d+)?)\*10\^([+-]?\d+)$/i);

  if (match) {
    const base = Number(match[1]);
    const power = Number(match[2]);

    if (!Number.isFinite(base) || !Number.isFinite(power)) {
      return NaN;
    }

    return base * Math.pow(10, power);
  }

  // Если запись обычная или в формате e, например 9e23
  const cleaned = str.replace(/[^0-9.eE+-]/g, '');

  if (!cleaned) {
    return NaN;
  }

  const num = Number(cleaned);

  return Number.isFinite(num) ? num : NaN;
}