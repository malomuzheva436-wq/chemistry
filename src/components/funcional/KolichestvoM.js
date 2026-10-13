// Если массы вещества в «Дано» нет, функция вызывает MassaW,
// чтобы вычислить массу через массу раствора и массовую долю,
// и только потом считает количество вещества.

import { getMolarMass } from './MolarMass';
import { MassaW } from './MassaW';
import { MassaWPO } from './MassaWPO';
import { resultToVirtualRow, joinSteps } from './VirtualRow';

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

  if (!normalized) {
    return NaN;
  }

  return Number(normalized);
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 4,
  }).format(value);
}

// Переводим массу в граммы
function convertMassToGrams(value, unit) {
  const normalizedUnit = normalizeText(unit);

  if (normalizedUnit === 'кг') {
    return value * 1000;
  }

  if (normalizedUnit === 'мг') {
    return value / 1000;
  }

  return value; // уже граммы
}

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function KolichestvoM(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);

  const rowsForFormula = danoRows.filter(
    (row) => normalizeText(row.formula) === normalizedFormula
  );

  if (rowsForFormula.length === 0) {
    errors.push(`Для вещества ${formula}: в блоке «Дано» нет данных.`);

    return { results, errors };
  }
  
    // =====================================================
  // ШАГ 0. Количество вещества дано напрямую в «Дано»
  // (сюда же попадают виртуальные строки из цепочек и уравнений)
  // =====================================================
  const kolRow =
    (givenRow &&
      normalizeText(givenRow.charText).includes('количество вещества') &&
      normalizeText(givenRow.formula) === normalizedFormula &&
      givenRow) ||
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('количество вещества')
      ) ||
    null;

  if (kolRow) {
    const n = parseNumericValue(kolRow.value);

    if (!Number.isNaN(n) && n > 0) {
      const rounded = Number(n.toFixed(4));

      results.push({
        id: `kolichestvoM-${formula}`,
        formula,
        amount: rounded,
        amountUnit: 'моль',
        text: `n(${formula}) = ${formatNumber(rounded)} моль`,
      });

      return { results, errors };
    }
  }

  // =====================================================
  // ШАГ 1. Ищем массу вещества в «Дано»
  // =====================================================
  let massRow = null;

  // Если диспетчер уже передал подходящую строку — используем её
  if (
    givenRow &&
    normalizeText(givenRow.charText).includes('масса вещества') &&
    normalizeText(givenRow.formula) === normalizedFormula
  ) {
    massRow = givenRow;
  } else {
    massRow =
      [...rowsForFormula]
        .reverse()
        .find((row) =>
          normalizeText(row.charText).includes('масса вещества')
        ) || null;
  }

  // Сюда собираются тексты промежуточных шагов цепочки
  const chainSteps = [];

  // =====================================================
  // ШАГ 2. МЕХАНИЗМ «ФУНКЦИЯ ВЫЗЫВАЕТ ФУНКЦИЮ»
  // Массы в «Дано» нет → пробуем вычислить её через MassaW
  // (масса раствора + массовая доля)
  // =====================================================
  if (!massRow) {
    const massAnswer = MassaW(danoRows, formula, findRow, givenRow);

    if (massAnswer.results.length > 0) {
      const virtualRow = resultToVirtualRow(
        massAnswer.results[0],
        formula,
        'Масса вещества'
      );

      if (virtualRow) {
        massRow = virtualRow; // дальше работаем как с обычной строкой «Дано»

        if (massAnswer.results[0].text) {
          chainSteps.push(massAnswer.results[0].text);
        }
      }
    } else if (massAnswer.errors.length > 0) {
      // Запоминаем ошибки дочерней функции —
      // покажем их, если посчитать не получится
      errors.push(...massAnswer.errors);
    }
  }

    // =====================================================
  // ШАГ. Если массы всё ещё нет — пробуем получить её через
  // массовую долю × плотность раствора × объём раствора
  // (вызываем MassaWPO)
  // =====================================================
  if (!massRow) {
    const wpoAnswer = MassaWPO(danoRows, formula, findRow, givenRow);

    if (wpoAnswer.results.length > 0) {
      const virtualRow = resultToVirtualRow(
        wpoAnswer.results[0],
        formula,
        'Масса вещества'
      );

      if (virtualRow) {
        massRow = virtualRow;

        if (wpoAnswer.results[0].text) {
          chainSteps.push(wpoAnswer.results[0].text);
        }
      }
    }
  }

  if (!massRow) {
    if (errors.length === 0) {
      errors.push(
        `Для вещества ${formula}: в «Дано» нет массы вещества, и вычислить её через массу раствора и массовую долю тоже не удалось.`
      );
    }

    return { results, errors };
  }

  // =====================================================
  // ШАГ 3. Считаем количество вещества: n = m / M
  // =====================================================
  const mass = parseNumericValue(massRow.value);

  if (Number.isNaN(mass) || mass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса вещества указана некорректно.`
    );

    return { results, errors };
  }

  const molarMass = Number(getMolarMass(formula));

  if (Number.isNaN(molarMass) || molarMass <= 0) {
    errors.push(
      `Для вещества ${formula}: молярная масса не найдена.`
    );

    return { results, errors };
  }

  const massInGrams = convertMassToGrams(mass, massRow.izmerenie);

  const amount = massInGrams / molarMass;
  const roundedAmount = Number(amount.toFixed(4));

  // =====================================================
  // ШАГ 4. Собираем итоговый текст решения:
  // все шаги цепочки + финальная формула
  // =====================================================
  const finalStep = `Вычислим количество вещества по формуле n = m / M. n(${formula}) = m(${formula}) / M(${formula}) = ${formatNumber(
    massInGrams
  )} г / ${formatNumber(molarMass)} г/моль = ${formatNumber(
    roundedAmount
  )} моль`;

  const fullText = joinSteps([...chainSteps, finalStep]);

  results.push({
    id: `kolichestvoM-${formula}`,
    formula,
    amount: roundedAmount,
    amountUnit: 'моль',
    text: fullText,
  });

  return {
    results,
    errors,
  };
}