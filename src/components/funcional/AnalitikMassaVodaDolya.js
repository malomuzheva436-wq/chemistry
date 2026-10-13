// MassaVodaDolya.js
// Вычисление массы вещества по массе воды и массовой доле.
//
// В основе — система уравнений:
//   x = y + m(воды)   (x — масса раствора, y — масса вещества)
//   y = w × x
//
// Её решение:
//   x = m(воды) / (1 − w)
//   y = w × x

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

  if (normalizedUnit === 'кг') return value * 1000;
  if (normalizedUnit === 'мг') return value / 1000;

  return value;
}

export function AnalitikMassaVodaDolya(danoRows = [], formula, findRow, givenRow) {
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

  // ===== Ищем массу воды (по всему «Дано») =====
  const waterRow =
    [...danoRows]
      .reverse()
      .find((row) => {
        const char = normalizeText(row.charText);
        const f = normalizeText(row.formula);

        return (
          char.includes('масса воды') ||
          (char.includes('масса вещества') && (f === 'h2o' || f === 'вода'))
        );
      }) || null;

  // ===== Ищем массовую долю =====
  const dolyaRow =
    [...rowsForFormula]
      .reverse()
      .find((row) => normalizeText(row.charText).includes('массовая доля')) ||
    [...danoRows]
      .reverse()
      .find((row) => normalizeText(row.charText).includes('массовая доля')) ||
    null;

  if (!waterRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы воды. Добавьте её, чтобы рассчитать массу вещества.`
    );
    return { results, errors };
  }

  if (!dolyaRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массовой доли. Добавьте её, чтобы рассчитать массу вещества.`
    );
    return { results, errors };
  }

  // ===== Масса воды =====
  const waterMass = parseNumericValue(waterRow.value);

  if (Number.isNaN(waterMass) || waterMass <= 0) {
    errors.push(`Для вещества ${formula}: масса воды указана некорректно.`);
    return { results, errors };
  }

  // ===== Массовая доля =====
  const dolyaPercent = parseNumericValue(dolyaRow.value);

  if (Number.isNaN(dolyaPercent) || dolyaPercent <= 0) {
    errors.push(`Для вещества ${formula}: массовая доля указана некорректно.`);
    return { results, errors };
  }

  if (dolyaPercent >= 100) {
    errors.push(
      `Для вещества ${formula}: массовая доля должна быть меньше 100% (иначе раствор невозможен).`
    );
    return { results, errors };
  }

  const w = dolyaPercent / 100;
  const waterInGrams = convertMassToGrams(waterMass, waterRow.izmerenie);

  // ===== Решаем систему: x = m(воды) / (1 − w); y = w × x =====
  const solutionMass = waterInGrams / (1 - w);   // x — масса раствора
  let substanceMass = w * solutionMass;          // y — масса вещества
  let outputUnit = 'г';

  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'кг') {
    substanceMass = substanceMass / 1000;
    outputUnit = 'кг';
  } else if (requestedUnit === 'мг') {
    substanceMass = substanceMass * 1000;
    outputUnit = 'мг';
  }

  const roundedSubstance = Number(substanceMass.toFixed(4));
  const roundedSolution = Number(solutionMass.toFixed(4));

  results.push({
    id: `massaVodaDolya-${formula}`,
    formula,
    massaVody: waterInGrams,
    massaVodyUnit: 'г',
    massovayaDolyaPercent: dolyaPercent,
    massovayaDolya: w,
    massaRastvora: roundedSolution,
    massaRastvoraUnit: 'г',
    mass: roundedSubstance,
    massUnit: outputUnit,
    text: `m(раствора) = m(воды) / (1 − w) = ${formatNumber(
      waterInGrams
    )} г / (1 − ${formatNumber(w)}) = ${formatNumber(
      roundedSolution
    )} г m(${formula}) = w × m(раствора) = ${formatNumber(
      w
    )} × ${formatNumber(roundedSolution)} г = ${formatNumber(
      roundedSubstance
    )} ${outputUnit}`,
  });

  return {
    results,
    errors,
  };
}