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

// Переводим объём в миллилитры
function convertVolumeToMl(value, unit) {
  const normalizedUnit = normalizeText(unit);

  if (normalizedUnit === 'л') {
    return value * 1000;
  }

  if (normalizedUnit === 'м³' || normalizedUnit === 'м3') {
    return value * 1000000;
  }

  return value; // уже миллилитры
}

// ===== Приводим плотность к г/мл =====
function convertDensityToGPerMl(value, unit) {
  const normalizedUnit = normalizeText(unit);

  // кг/м³ → делим на 1000  (1000 кг/м³ = 1 г/мл)
  if (
    normalizedUnit === 'кг/м³' ||
    normalizedUnit === 'кг/м3' ||
    normalizedUnit === 'кг/м^3'
  ) {
    return { value: value / 1000, unit: 'г/мл', converted: true };
  }

  // мг/мл → делим на 1000  (на всякий случай)
  if (normalizedUnit === 'мг/мл') {
    return { value: value / 1000, unit: 'г/мл', converted: true };
  }

  // г/мл, г/см³, кг/л — численно равны, перевода не требуется
  return { value, unit: 'г/мл', converted: false };
}

// Проверка: является ли формула водой
function isWaterFormula(formula) {
  const nf = normalizeText(formula);
  return nf === 'h2o' || nf === 'вода';
}

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function MassaVP(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  // Плотность воды — физическая константа
  const pH2O = 1; // г/мл

  const normalizedFormula = normalizeText(formula);
  const isWater = isWaterFormula(formula);

  const rowsForFormula = danoRows.filter(
    (row) => normalizeText(row.formula) === normalizedFormula
  );

  if (rowsForFormula.length === 0) {
    errors.push(`Для вещества ${formula}: в блоке «Дано» нет данных.`);

    return { results, errors };
  }

  // ===== Ищем строку с объёмом вещества =====
  const volumeRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('объем вещества') ||
        normalizeText(row.charText).includes('объём вещества')
      ) || null;

  if (!volumeRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет объёма вещества. Добавьте его, чтобы рассчитать массу вещества.`
    );

    return { results, errors };
  }

  // ===== Ищем строку с плотностью (только если это НЕ вода) =====
  let densityRow = null;

  if (!isWater) {
    densityRow =
      [...rowsForFormula]
        .reverse()
        .find((row) =>
          normalizeText(row.charText).includes('плотность вещества')
        ) ||
      [...danoRows]
        .reverse()
        .find((row) =>
          normalizeText(row.charText).includes('плотность вещества')
        ) ||
      null;
  }

  if (!isWater && !densityRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет плотности вещества. Добавьте её, чтобы рассчитать массу вещества.`
    );

    return { results, errors };
  }

  // ===== Объём =====
  const volume = parseNumericValue(volumeRow.value);

  if (Number.isNaN(volume) || volume <= 0) {
    errors.push(`Для вещества ${formula}: объём вещества указан некорректно.`);

    return { results, errors };
  }

  // ===== Плотность =====
  // Для воды — константа, для остальных — из «Дано» с нормализацией к г/мл
  let densityInGPerMl;
  let densityOriginal;
  let originalUnit;
  let densityFromConst = false;
  let densityConverted = false;

  if (isWater) {
    densityInGPerMl = pH2O;
    densityOriginal = pH2O;
    originalUnit = 'г/мл';
    densityFromConst = true;
  } else {
    const rawDensity = parseNumericValue(densityRow.value);

    if (Number.isNaN(rawDensity) || rawDensity <= 0) {
      errors.push(
        `Для вещества ${formula}: плотность вещества указана некорректно.`
      );

      return { results, errors };
    }

    originalUnit = densityRow.izmerenie || 'г/мл';
    densityOriginal = rawDensity;

    const {
      value: normalizedDensity,
      converted,
    } = convertDensityToGPerMl(rawDensity, originalUnit);

    densityInGPerMl = normalizedDensity;
    densityConverted = converted;
  }

  // Переводим объём в миллилитры
  const volumeInMl = convertVolumeToMl(volume, volumeRow.izmerenie);

  // m(вещества) = ρ × V  (в граммах, т.к. плотность в г/мл, объём в мл)
  let massInGrams = densityInGPerMl * volumeInMl;
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

  // Если объём пришлось переводить в мл, показываем это в решении
  const volumeText =
    volumeInMl !== volume
      ? `${formatNumber(volume)} ${volumeRow.izmerenie} = ${formatNumber(
          volumeInMl
        )} мл`
      : `${formatNumber(volumeInMl)} мл`;

  // Формируем текст плотности
  let densityText;

  if (densityFromConst) {
    // Вода — константа
    densityText = `ρ(${formula}) = ${formatNumber(pH2O)} г/мл (табл.)`;
  } else if (densityConverted) {
    // Плотность пришлось конвертировать — показываем перевод
    densityText = `${formatNumber(densityOriginal)} ${originalUnit} = ${formatNumber(
      densityInGPerMl
    )} г/мл`;
  } else {
    // Единицы уже в г/мл (или численно эквивалентны)
    densityText = `${formatNumber(densityInGPerMl)} ${originalUnit}`;
  }

  const text = `Вычислим массу вещества по формуле m(вещества)=p(вещества)*V(вещества). m(${formula}) = ρ(${formula}) × V(${formula}) = ${densityText} × ${volumeText} = ${formatNumber(
    roundedMass
  )} ${outputUnit}`;

  results.push({
    id: `massaVP-${formula}`,
    formula,
    plotnost: densityInGPerMl,
    plotnostOriginal: densityOriginal,
    plotnostUnit: densityFromConst ? 'г/мл' : originalUnit,
    obyom: volume,
    obyomUnit: volumeRow.izmerenie || 'мл',
    obyomMl: volumeInMl,
    mass: roundedMass,
    massUnit: outputUnit,
    text,
  });

  return {
    results,
    errors,
  };
}