// MolarFormula.js
// Вычисление молярной массы вещества:
//
// M = m / n
//
// Если количества вещества в «Дано» нет, функция пробует получить его:
//   - через объём газа    → KolichestvoV (n = V / Vm)
//   - через число молекул → KolichestvoN (n = N / Na)

import { KolichestvoV } from './KolichestvoV';
import { KolichestvoN } from './KolichestvoN';
import { findFormulasByMolarMass } from './MolarMass';
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

  if (!normalized) return NaN;
  return Number(normalized);
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 4,
  }).format(value);
}

function convertMassToGrams(value, unit) {
  const normalizedUnit = normalizeText(unit);

  if (normalizedUnit === 'кг') {
    return value * 1000;
  }

  if (normalizedUnit === 'мг') {
    return value / 1000;
  }

  return value;
}

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function MolarFormula(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);

  // =====================================================
  // ШАГ 1. Ищем МАССУ вещества в «Дано»
  // =====================================================
  const massRow =
    [...danoRows]
      .reverse()
      .find(
        (row) =>
          normalizeText(row.formula) === normalizedFormula &&
          normalizeText(row.charText).includes('масса вещества')
      ) || null;

  if (!massRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы вещества.`
    );
    return { results, errors };
  }

  // =====================================================
  // ШАГ 2. Ищем КОЛИЧЕСТВО вещества в «Дано»
  // =====================================================
  let kolRow =
    [...danoRows]
      .reverse()
      .find(
        (row) =>
          normalizeText(row.formula) === normalizedFormula &&
          normalizeText(row.charText).includes('количество вещества')
      ) || null;

  const chainSteps = [];

  // Если n нет — пробуем получить через объём (KolichestvoV)
  if (!kolRow) {
    const kolAnswer = KolichestvoV(danoRows, formula, findRow, givenRow);

    if (
      kolAnswer.results.length > 0 &&
      Number(kolAnswer.results[0].amount) > 0
    ) {
      const virtualRow = resultToVirtualRow(
        kolAnswer.results[0],
        formula,
        'Количество вещества'
      );

      if (virtualRow) {
        kolRow = virtualRow;
        if (kolAnswer.results[0].text) {
          chainSteps.push(kolAnswer.results[0].text);
        }
      }
    }
  }

  // Если и через объём не получилось — через молекулы (KolichestvoN)
  if (!kolRow) {
    const kolAnswerN = KolichestvoN(danoRows, formula, findRow, givenRow);

    if (
      kolAnswerN.results.length > 0 &&
      Number(kolAnswerN.results[0].amount) > 0
    ) {
      const virtualRow = resultToVirtualRow(
        kolAnswerN.results[0],
        formula,
        'Количество вещества'
      );

      if (virtualRow) {
        kolRow = virtualRow;
        if (kolAnswerN.results[0].text) {
          chainSteps.push(kolAnswerN.results[0].text);
        }
      }
    }
  }

  if (!kolRow) {
    errors.push(
      `Для вещества ${formula}: не удалось получить количество вещества ни напрямую, ни через объём, ни через молекулы.`
    );
    return { results, errors };
  }

  // =====================================================
  // ШАГ 3. Вычисляем молярную массу: M = m / n
  // =====================================================
  const mass = parseNumericValue(massRow.value);
  const n = parseNumericValue(kolRow.value);

  if (Number.isNaN(mass) || mass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса вещества указана некорректно.`
    );
    return { results, errors };
  }

  if (Number.isNaN(n) || n <= 0) {
    errors.push(
      `Для вещества ${formula}: количество вещества указано некорректно.`
    );
    return { results, errors };
  }

  const massInGrams = convertMassToGrams(mass, massRow.izmerenie);
  const computedM = massInGrams / n;
  const roundedM = Number(computedM.toFixed(2));

  // =====================================================
  // ШАГ 4. Подбираем формулу(ы) по молярной массе
  // =====================================================
  const matches = findFormulasByMolarMass(roundedM, 1);

  if (matches.length === 0) {
    errors.push(
      `Для вещества ${formula}: не удалось подобрать формулу. Вычисленная молярная масса ${formatNumber(roundedM)} г/моль не совпадает ни с одним веществом из списка кандидатов.`
    );
    return { results, errors };
  }

  // =====================================================
  // ШАГ 5. Формируем итоговый текст
  // =====================================================
  const calculationStep = `Вычислим молярную массу вещества по формуле M = m / n. M = m(${formula}) / n(${formula}) = ${formatNumber(
    massInGrams
  )} г / ${formatNumber(n)} моль = ${formatNumber(roundedM)} г/моль.`;

  let formulaStep;

  if (matches.length === 1) {
    formulaStep = `Формула вещества: ${matches[0].formula} (M = ${formatNumber(matches[0].M)} г/моль).`;
  } else {
    formulaStep = `Этой молярной массе соответствуют несколько веществ: ${matches
      .map((m) => m.formula)
      .join(', ')} (M = ${formatNumber(matches[0].M)} г/моль). Для однозначного ответа нужны дополнительные данные задачи.`;
  }

  const fullText = joinSteps([...chainSteps, calculationStep, formulaStep]);

  results.push({
    id: `molarFormula-${formula}`,
    formula: matches.length === 1 ? matches[0].formula : formula,
    candidates: matches.map((m) => m.formula),
    amount: roundedM,
    izmerenie: 'г/моль',
    text: fullText,
  });

  return {
    results,
    errors,
  };
}
