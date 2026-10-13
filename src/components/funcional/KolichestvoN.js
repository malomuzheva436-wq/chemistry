import { parseScientificValue } from './DliaMolekul';

// ===== Вспомогательные функции =====

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '';
  }
  if (value === 0) {
    return '0';
  }

  const abs = Math.abs(value);

  if (abs >= 1_000_000 || abs < 0.000001) {
    return value.toExponential(4).replace('.', ',');
  }

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 4,
  }).format(value);
}

const Na = 6.022e23;

// ===== Главная функция =====
// SolveTask вызывает её с аргументами: (danoRows, formula, findRow, givenRow)
export function KolichestvoN(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);

  // =====================================================
  // ШАГ 1. Ищем строку, где характеристика — количество молекул
  // =====================================================
  let molekulaRow = null;

  if (
    givenRow &&
    normalizeText(givenRow.charText).includes('молекул') &&
    normalizeText(givenRow.formula) === normalizedFormula
  ) {
    molekulaRow = givenRow;
  } else {
    molekulaRow =
      [...danoRows]
        .reverse()
        .find(
          (row) =>
            normalizeText(row.formula) === normalizedFormula &&
            normalizeText(row.charText).includes('молекул')
        ) || null;
  }

  if (!molekulaRow) {
    errors.push(`Для вещества ${formula}: в «Дано» нет количества молекул.`);
    return { results, errors };
  }

  // =====================================================
  // ШАГ 2. Парсим значение (поддерживает запись вида 9*10^23)
  // =====================================================
  const molekula = parseScientificValue(molekulaRow.value);

  if (Number.isNaN(molekula) || molekula <= 0) {
    errors.push(
      `Для вещества ${formula}: количество молекул указано некорректно.`
    );
    return { results, errors };
  }

  // =====================================================
  // ШАГ 3. Считаем количество вещества: n = N / Na
  // =====================================================
  const amount = molekula / Na;

  // Важно: используем toPrecision(4), а не toFixed(4).
  // toFixed превращает маленькие числа (например, 1.66e-22) в '0.0000',
  // а toPrecision оставляет 4 значащие цифры: 1.660e-22.
  const roundedAmount = Number(amount.toPrecision(4));

  // ===== Текст решения: пояснение + формула =====
  const finalStep = `Вычислим количество вещества по формуле n = N / Na. n(${formula}) = N / Na = ${formatNumber(
    molekula
  )} / 6,022·10²³ 1/моль = ${formatNumber(roundedAmount)} моль`;

  // =====================================================
  // ШАГ 4. Формируем результат
  // =====================================================
  results.push({
    id: `kolichestvoN-${formula}`,
    formula,
    molekula,
    Na,
    amount: roundedAmount,
    amountUnit: 'моль',
    text: finalStep,
  });

  return {
    results,
    errors,
  };
}