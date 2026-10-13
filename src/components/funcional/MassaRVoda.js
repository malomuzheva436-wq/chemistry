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

// solveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function MassaRVoda(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);

  // ===== Масса вещества с нужной формулой =====
  const massRow =
    [...danoRows]
      .reverse()
      .find(
        (row) =>
          normalizeText(row.formula) === normalizedFormula &&
          normalizeText(row.charText).includes('масса вещества')
      ) || null;

  // ===== Масса воды =====
  // Вода может быть записана двумя способами:
  // 1) «Масса вещества: H2O = ...»
  // 2) отдельной характеристикой «Масса воды: ...» (если ты её добавишь)
  const waterRow =
    [...danoRows]
      .reverse()
      .find((row) => {
        const char = normalizeText(row.charText);
        const rowFormula = normalizeText(row.formula);

        return (
          char.includes('масса воды') ||
          (char.includes('масса вещества') &&
            (rowFormula === 'h2o' || rowFormula === 'вода'))
        );
      }) || null;

  if (!massRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы вещества. Добавьте её, чтобы рассчитать массу раствора.`
    );

    return { results, errors };
  }

  if (!waterRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы воды. Добавьте «Масса вещества: H2O = ...».`
    );

    return { results, errors };
  }

  // ===== Проверка значений =====
  const mass = parseNumericValue(massRow.value);

  if (Number.isNaN(mass) || mass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса вещества указана некорректно.`
    );

    return { results, errors };
  }

  const waterMass = parseNumericValue(waterRow.value);

  if (Number.isNaN(waterMass) || waterMass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса воды указана некорректно.`
    );

    return { results, errors };
  }

  // ===== Переводим в граммы и складываем =====
  const massInGrams = convertMassToGrams(mass, massRow.izmerenie);
  const waterInGrams = convertMassToGrams(waterMass, waterRow.izmerenie);

  let solutionMassInGrams = massInGrams + waterInGrams;
  let outputUnit = 'г';

  // Учитываем, в каких единицах просят ответ в блоке «Найти»
  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'кг') {
    solutionMassInGrams = solutionMassInGrams / 1000;
    outputUnit = 'кг';
  } else if (requestedUnit === 'мг') {
    solutionMassInGrams = solutionMassInGrams * 1000;
    outputUnit = 'мг';
  }

  const roundedMass = Number(solutionMassInGrams.toFixed(4));

  results.push({
    id: `massaRVoda-${formula}`,
    formula,
    massVeshchestva: mass,
    massVeshchestvaUnit: massRow.izmerenie || 'г',
    massVody: waterMass,
    massVodyUnit: waterRow.izmerenie || 'г',
    massaRastvora: roundedMass,
    massaRastvoraUnit: outputUnit,
    text: `Вычислим массу раствора по формуле m(раствора) = m(вещества) + m(воды).  m(раствора) = m(${formula}) + m(${waterRow.formula}) = ${formatNumber(
      massInGrams
    )} г + ${formatNumber(waterInGrams)} г = ${formatNumber(
      roundedMass
    )} ${outputUnit}`,
  });

  return {
    results,
    errors,
  };
}