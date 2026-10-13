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
export function MassaW(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);

  // Все строки «Дано» для этой формулы
  const rowsForFormula = danoRows.filter(
    (row) => normalizeText(row.formula) === normalizedFormula
  );

  if (rowsForFormula.length === 0) {
    errors.push(`Для вещества ${formula}: в блоке «Дано» нет данных.`);

    return {
      results,
      errors,
    };
  }

  // Ищем строку с МАССОЙ РАСТВОРА
  const solutionMassRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса раствора')
      ) || null;

  // Ищем строку с МАССОВОЙ ДОЛЕЙ
  const dolyaRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('массовая доля')
      ) || null;

  if (!solutionMassRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы раствора. Добавьте её, чтобы рассчитать массу вещества.`
    );

    return {
      results,
      errors,
    };
  }

  if (!dolyaRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массовой доли. Добавьте её, чтобы рассчитать массу вещества.`
    );

    return {
      results,
      errors,
    };
  }

  // ===== Масса раствора =====
  const solutionMass = parseNumericValue(solutionMassRow.value);

  if (Number.isNaN(solutionMass) || solutionMass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса раствора указана некорректно.`
    );

    return {
      results,
      errors,
    };
  }

  // ===== Массовая доля (в процентах) =====
  const dolyaPercent = parseNumericValue(dolyaRow.value);

  if (Number.isNaN(dolyaPercent) || dolyaPercent <= 0) {
    errors.push(
      `Для вещества ${formula}: массовая доля указана некорректно.`
    );

    return {
      results,
      errors,
    };
  }

  if (dolyaPercent > 100) {
    errors.push(
      `Для вещества ${formula}: массовая доля не может быть больше 100%.`
    );

    return {
      results,
      errors,
    };
  }

  // Переводим проценты в долю: 10% -> 0,1
  const dolya = dolyaPercent / 100;

  // Переводим массу раствора в граммы
  const solutionMassInGrams = convertMassToGrams(solutionMass, solutionMassRow.izmerenie);

  // m(вещества) = m(раствора) × w
  let substanceMassInGrams = solutionMassInGrams * dolya;
  let outputUnit = 'г';

  // Учитываем, в каких единицах просят ответ в блоке «Найти»
  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'кг') {
    substanceMassInGrams = substanceMassInGrams / 1000;
    outputUnit = 'кг';
  } else if (requestedUnit === 'мг') {
    substanceMassInGrams = substanceMassInGrams * 1000;
    outputUnit = 'мг';
  }

  const roundedMass = Number(substanceMassInGrams.toFixed(4));

  results.push({
    id: `massaW-${formula}`,
    formula,
    massaRastvora: solutionMass,
    massaRastvoraUnit: solutionMassRow.izmerenie || 'г',
    massovayaDolyaPercent: dolyaPercent,
    massovayaDolya: dolya,
    mass: roundedMass,
    massUnit: outputUnit,
    text: `Вычислим массу вещества по формуле m(вещества)=m(раствора) × W. m(${formula}) = m(раствора) × w = ${formatNumber(
      solutionMassInGrams
    )} г × (${formatNumber(dolyaPercent)}% / 100) = ${formatNumber(
      solutionMassInGrams
    )} г × ${formatNumber(dolya)} = ${formatNumber(roundedMass)} ${outputUnit}`,
  });

  return {
    results,
    errors,
  };
}