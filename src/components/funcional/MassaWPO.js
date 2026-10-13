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

// Переводим объём в миллилитры (плотность в г/мл)
function convertVolumeToMl(value, unit) {
  const normalizedUnit = normalizeText(unit);

  if (normalizedUnit === 'л') {
    return value * 1000;
  }

  if (normalizedUnit === 'м³' || normalizedUnit === 'м3') {
    return value * 1000000;
  }

  return value; // уже мл
}

export function MassaWPO(danoRows = [], formula, findRow, givenRow) {
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

  // ===== Ищем массовую долю =====
  const dolyaRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('массовая доля')
      ) || null;

  // ===== Ищем объём РАСТВОРА =====
  const volumeRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('объем раствора')
      ) || null;

  // ===== Ищем плотность РАСТВОРА =====
  const densityRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('плотность раствора')
      ) || null;

  if (!dolyaRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массовой доли. Добавьте её, чтобы рассчитать массу вещества.`
    );

    return { results, errors };
  }

  if (!densityRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет плотности раствора. Добавьте её, чтобы рассчитать массу вещества.`
    );

    return { results, errors };
  }

  if (!volumeRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет объёма раствора. Добавьте его, чтобы рассчитать массу вещества.`
    );

    return { results, errors };
  }

  // ===== Массовая доля (в процентах) =====
  const dolyaPercent = parseNumericValue(dolyaRow.value);

  if (Number.isNaN(dolyaPercent) || dolyaPercent <= 0) {
    errors.push(
      `Для вещества ${formula}: массовая доля указана некорректно.`
    );

    return { results, errors };
  }

  if (dolyaPercent > 100) {
    errors.push(
      `Для вещества ${formula}: массовая доля не может быть больше 100%.`
    );

    return { results, errors };
  }

  // ===== Плотность раствора =====
  const density = parseNumericValue(densityRow.value);

  if (Number.isNaN(density) || density <= 0) {
    errors.push(
      `Для вещества ${formula}: плотность раствора указана некорректно.`
    );

    return { results, errors };
  }

  // ===== Объём раствора =====
  const volume = parseNumericValue(volumeRow.value);

  if (Number.isNaN(volume) || volume <= 0) {
    errors.push(
      `Для вещества ${formula}: объём раствора указан некорректно.`
    );

    return { results, errors };
  }

  // Переводим проценты в долю: 10% -> 0,1
  const dolya = dolyaPercent / 100;

  // Переводим объём раствора в миллилитры
  const volumeInMl = convertVolumeToMl(volume, volumeRow.izmerenie);

  // m(вещества) = w × ρ(раствора) × V(раствора) → получаем граммы
  let massInGrams = dolya * density * volumeInMl;
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
      ? `${formatNumber(volume)} ${volumeRow.izmerenie} = ${formatNumber(volumeInMl)} мл`
      : `${formatNumber(volumeInMl)} мл`;

  results.push({
    id: `massaWPO-${formula}`,
    formula,
    massovayaDolyaPercent: dolyaPercent,
    plotnostRastvora: density,
    plotnostUnit: densityRow.izmerenie || 'г/мл',
    obyomRastvora: volume,
    obyomUnit: volumeRow.izmerenie || 'мл',
    mass: roundedMass,
    massUnit: outputUnit,
    text: `Вычислим массу вещества по формуле m(вещества)=W×ρ(раствора) × V(раствора). m(${formula}) = w × ρ(раствора) × V(раствора) = (${formatNumber(
      dolyaPercent
    )}% / 100) × ${formatNumber(density)} г/мл × ${volumeText} = ${formatNumber(
      roundedMass
    )} ${outputUnit}`,
  });

  return {
    results,
    errors,
  };
}