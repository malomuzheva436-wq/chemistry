// ObyomP.js
// Вычисление объёма раствора через массу раствора и плотность:
//
// V(раствора) = m(раствора) / ρ
//
// Плотность измеряется в г/мл,
// поэтому при делении объём получается в миллилитрах.

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

// Переводим массу раствора в граммы
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

// ===== НОВАЯ ФУНКЦИЯ: приводим плотность к г/мл =====
// Возвращает объект { value, unit, converted }
//   value    — плотность в г/мл (число)
//   unit     — итоговая единица ('г/мл')
//   converted — была ли конвертация
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

  // г/мл, г/см³, кг/л — численно равны
  return { value, unit: 'г/мл', converted: false };
}

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function ObyomP(danoRows = [], formula, findRow, givenRow) {
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

  // ===== Ищем строку с плотностью раствора =====
  const densityRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('плотность раствора')
      ) ||
    [...danoRows]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('плотность раствора')
      ) ||
    null;

  if (!rastvorRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы раствора. Добавьте её, чтобы рассчитать объём.`
    );

    return { results, errors };
  }

  if (!densityRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет плотности раствора. Добавьте её, чтобы рассчитать объём.`
    );

    return { results, errors };
  }

  // ===== Масса раствора =====
  const mass = parseNumericValue(rastvorRow.value);

  if (Number.isNaN(mass) || mass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса раствора указана некорректно.`
    );

    return { results, errors };
  }

  // ===== Плотность =====
  const rawDensity = parseNumericValue(densityRow.value);

  if (Number.isNaN(rawDensity) || rawDensity <= 0) {
    errors.push(`Для вещества ${formula}: плотность указана некорректно.`);

    return { results, errors };
  }

  // ===== Нормализуем плотность к г/мл =====
  const {
    value: densityInGPerMl,
    converted: densityConverted,
  } = convertDensityToGPerMl(rawDensity, densityRow.izmerenie || 'г/мл');

  // ===== Масса в граммах =====
  const massInGrams = convertMassToGrams(mass, rastvorRow.izmerenie);

  // ===== V(раствора) = m(раствора) / ρ  → получаем миллилитры =====
  const volumeInMl = massInGrams / densityInGPerMl;

  // ===== Переводим в единицу из блока «Найти» =====
  const requestedUnit = normalizeText(findRow?.izmerenie);

  let volume = volumeInMl;
  let outputUnit = 'мл';

  if (requestedUnit === 'л') {
    volume = volumeInMl / 1000;
    outputUnit = 'л';
  } else if (requestedUnit === 'м³' || requestedUnit === 'м3') {
    volume = volumeInMl / 1000000;
    outputUnit = 'м³';
  }

  const roundedVolume = Number(volume.toFixed(4));

  // ===== Формируем текст решения =====
  // Если плотность пришлось конвертировать — показываем перевод
  const densityText = densityConverted
    ? `${formatNumber(rawDensity)} ${densityRow.izmerenie} = ${formatNumber(
        densityInGPerMl
      )} г/мл`
    : `${formatNumber(densityInGPerMl)} ${densityRow.izmerenie || 'г/мл'}`;

  // Если объём переводился в л или м³ — показываем это
  const volumeText =
    outputUnit !== 'мл'
      ? `${formatNumber(volumeInMl)} мл = ${formatNumber(
          roundedVolume
        )} ${outputUnit}`
      : `${formatNumber(roundedVolume)} мл`;

  results.push({
    id: `obyomP-${formula}`,
    formula,
    massaRastvora: mass,
    massaRastvoraUnit: rastvorRow.izmerenie || 'г',
    plotnost: densityInGPerMl,
    plotnostOriginal: rawDensity,
    plotnostUnit: densityRow.izmerenie || 'г/мл',
    obyom: roundedVolume,
    obyomUnit: outputUnit,
    text: `Вычислим объём раствора по формуле V(раствора) = m(раствора) / ρ. V(раствора) = m(раствора) / ρ(раствора) = ${formatNumber(
      massInGrams
    )} г / ${densityText} = ${volumeText}`,
  });

  return {
    results,
    errors,
  };
}