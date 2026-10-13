// MassaRaznost.js
// Вычисление массы вещества как разности:
//
// m(вещества) = m(раствора) − m(воды)

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

// Вода может быть записана двумя способами:
// 1) «Масса вещества: H2O = ...»
// 2) отдельной характеристикой «Масса воды: ...» (если ты её добавишь)
function isWaterRow(row) {
  const char = normalizeText(row.charText);
  const rowFormula = normalizeText(row.formula);

  return (
    char.includes('масса воды') ||
    (char.includes('масса вещества') &&
      (rowFormula === 'h2o' || rowFormula === 'вода'))
  );
}

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function MassaRaznost(danoRows = [], formula, findRow, givenRow) {
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

  // ===== Ищем строку с массой раствора =====
  // Сначала для той же формулы, а если нет — любую в «Дано»
  const rastvorRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса раствора')
      ) ||
    [...danoRows]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса раствора')
      ) ||
    null;

  // ===== Ищем строку с массой воды =====
  const waterRow =
    [...danoRows].reverse().find((row) => isWaterRow(row)) || null;

  if (!rastvorRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы раствора. Добавьте её, чтобы рассчитать массу вещества.`
    );

    return { results, errors };
  }

  if (!waterRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы воды. Добавьте «Масса вещества: H2O = ...».`
    );

    return { results, errors };
  }

  // ===== Масса раствора =====
  const solutionMass = parseNumericValue(rastvorRow.value);

  if (Number.isNaN(solutionMass) || solutionMass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса раствора указана некорректно.`
    );

    return { results, errors };
  }

  // ===== Масса воды =====
  const waterMass = parseNumericValue(waterRow.value);

  if (Number.isNaN(waterMass) || waterMass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса воды указана некорректно.`
    );

    return { results, errors };
  }

  // Переводим обе массы в граммы
  const solutionInGrams = convertMassToGrams(solutionMass, rastvorRow.izmerenie);
  const waterInGrams = convertMassToGrams(waterMass, waterRow.izmerenie);

  // Масса воды не может быть больше или равна массе раствора
  if (waterInGrams >= solutionInGrams) {
    errors.push(
      `Для вещества ${formula}: масса воды не может быть больше или равна массе раствора.`
    );

    return { results, errors };
  }

  // m(вещества) = m(раствора) − m(воды)
  let massInGrams = solutionInGrams - waterInGrams;
  let outputUnit = 'г';

  // Учитываем, в каких единицах просят ответ в блоке «Найти»
  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'кг') {
    massInGrams = massInGrams / 1000;
    outputUnit = 'кг';
  } else if (requestedUnit === 'мг') {
    massInGrams = massInGrams * 1000;
    outputUnit = 'мг';
  }

  const roundedMass = Number(massInGrams.toFixed(4));

  results.push({
    id: `massaRaznost-${formula}`,
    formula,
    massaRastvora: solutionMass,
    massaRastvoraUnit: rastvorRow.izmerenie || 'г',
    massaVody: waterMass,
    massaVodyUnit: waterRow.izmerenie || 'г',
    mass: roundedMass,
    massUnit: outputUnit,
    text: `Вычислим массу вещества по формуле m(вещества) = m(раствора) − m(воды). m(${formula}) = m(раствора) − m(${waterRow.formula}) = ${formatNumber(
      solutionInGrams
    )} г − ${formatNumber(waterInGrams)} г = ${formatNumber(
      roundedMass
    )} ${outputUnit}`,
  });

  return {
    results,
    errors,
  };
}