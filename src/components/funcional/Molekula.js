// Molekula.js
// Вычисление числа молекул: N = n × Na

import { KolichestvoM } from './KolichestvoM';
import { KolichestvoV } from './KolichestvoV';
import { resultToVirtualRow, joinSteps } from './VirtualRow';

const AVOGADRO = 6.022e23; // 1/моль

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function parseNumericValue(value) {
  const normalized = String(value ?? '')
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '');

  if (!normalized) return NaN;
  return Number(normalized);
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 4,
  }).format(value);
}

// Красивый вывод больших чисел: 1,506 × 10^23
function formatScientific(value) {
  if (!Number.isFinite(value) || value === 0) return '0';

  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exp);

  return `${formatNumber(mantissa)} × 10^${exp}`;
}

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function Molekula(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);
  const chainSteps = [];

  // =====================================================
  // ШАГ 1. Ищем количество вещества напрямую в «Дано»
  // (сюда же попадают виртуальные строки из цепочек и уравнений)
  // =====================================================
  let kolRow = null;

  if (
    givenRow &&
    normalizeText(givenRow.charText).includes('количество вещества') &&
    normalizeText(givenRow.formula) === normalizedFormula
  ) {
    kolRow = givenRow;
  } else {
    kolRow =
      [...danoRows]
        .reverse()
        .find(
          (row) =>
            normalizeText(row.formula) === normalizedFormula &&
            normalizeText(row.charText).includes('количество вещества')
        ) || null;
  }

  // =====================================================
  // ШАГ 2. Если нет — через массу (KolichestvoM)
  // =====================================================
  if (!kolRow) {
    const mAnswer = KolichestvoM(danoRows, formula, findRow, givenRow);

    if (mAnswer.results.length > 0 && Number(mAnswer.results[0].amount) > 0) {
      const virtualRow = resultToVirtualRow(
        mAnswer.results[0],
        formula,
        'Количество вещества'
      );

      if (virtualRow) {
        kolRow = virtualRow;

        if (mAnswer.results[0].text) {
          chainSteps.push(mAnswer.results[0].text);
        }
      }
    }
  }

  // =====================================================
  // ШАГ 3. Если нет — через объём (KolichestvoV, для газов)
  // =====================================================
  if (!kolRow) {
    const vAnswer = KolichestvoV(danoRows, formula, findRow, givenRow);

    if (vAnswer.results.length > 0 && Number(vAnswer.results[0].amount) > 0) {
      const virtualRow = resultToVirtualRow(
        vAnswer.results[0],
        formula,
        'Количество вещества'
      );

      if (virtualRow) {
        kolRow = virtualRow;

        if (vAnswer.results[0].text) {
          chainSteps.push(vAnswer.results[0].text);
        }
      }
    }
  }

  // =====================================================
  // Ничего не подошло — ошибка
  // =====================================================
  if (!kolRow) {
    errors.push(
      `Для вещества ${formula}: не удалось получить количество вещества ни напрямую, ни через массу, ни через объём.`
    );

    return { results, errors };
  }

  // =====================================================
  // ШАГ 4. N = n × Na
  // =====================================================
  const n = parseNumericValue(kolRow.value);

  if (Number.isNaN(n) || n <= 0) {
    errors.push(
      `Для вещества ${formula}: количество вещества указано некорректно.`
    );

    return { results, errors };
  }

  const N = n * AVOGADRO;

  const finalStep = `Вычислим число молекул по формуле N = n × Na. N(${formula}) = n(${formula}) × Na = ${formatNumber(
    n
  )} моль × 6,022 × 10^23 1/моль = ${formatScientific(N)}`;

  results.push({
    id: `molekula-${formula}`,
    formula,
    n,
    N,
    text: joinSteps([...chainSteps, finalStep]),
  });

  return {
    results,
    errors,
  };
}