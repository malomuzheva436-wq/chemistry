// PlotnostR.js
// Вычисление плотности раствора:
//
// ρ(раствора) = m(раствора) / V(раствора)
//
// Если массы раствора в «Дано» нет — функция вызывает MassaR
// (которая умеет получать её через: m(вещества)/w, ρ×V, m+m(H2O),
//  m(H2O)/(1−w), или через цепочку с Massa).

import { MassaR } from './MassaR';

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

// Переводим объём в миллилитры
function convertVolumeToMl(value, unit) {
  const normalizedUnit = normalizeText(unit);

  if (normalizedUnit === 'л') return value * 1000;
  if (normalizedUnit === 'м³' || normalizedUnit === 'м3') return value * 1000000;

  return value; // уже миллилитры
}

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function PlotnostR(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  // Сюда собираем тексты промежуточных шагов цепочки
  const chainSteps = [];

  // =====================================================
  // ШАГ 1. Ищем массу раствора
  // =====================================================
  let solutionRow =
    [...danoRows]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса раствора')
      ) || null;

  // Если массы раствора нет — вычисляем её через MassaR
  if (!solutionRow) {
    const massaRAnswer = MassaR(danoRows, formula, findRow, givenRow);

    if (massaRAnswer.results.length > 0) {
      const res = massaRAnswer.results[0];
      const solutionMassValue = res.massaRastvora ?? res.mass;
      const solutionMassUnit = res.massaRastvoraUnit ?? res.massUnit ?? 'г';

      if (Number.isFinite(solutionMassValue) && solutionMassValue > 0) {
        solutionRow = {
          charText: 'Масса раствора',
          formula,
          value: String(solutionMassValue),
          izmerenie: solutionMassUnit,
          isVirtual: true,
        };

        if (res.text) {
          chainSteps.push(res.text);
        }
      }
    }
  }

  // =====================================================
  // ШАГ 2. Ищем объём раствора
  // =====================================================
  const volumeRow =
    [...danoRows]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('объем раствора') ||
        normalizeText(row.charText).includes('объём раствора')
      ) || null;

  // =====================================================
  // ШАГ 3. Проверки наличия данных
  // =====================================================
  if (!solutionRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы раствора, и вычислить её тоже не удалось.`
    );
    return { results, errors };
  }

  if (!volumeRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет объёма раствора. Добавьте его, чтобы рассчитать плотность.`
    );
    return { results, errors };
  }

  // =====================================================
  // ШАГ 4. Парсим значения
  // =====================================================
  const solutionMass = parseNumericValue(solutionRow.value);

  if (Number.isNaN(solutionMass) || solutionMass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса раствора указана некорректно.`
    );
    return { results, errors };
  }

  const volume = parseNumericValue(volumeRow.value);

  if (Number.isNaN(volume) || volume <= 0) {
    errors.push(
      `Для вещества ${formula}: объём раствора указан некорректно.`
    );
    return { results, errors };
  }

  // Переводим массу в граммы и объём в миллилитры
  // (базовая плотность получается в г/мл)
  const solutionMassUnit = normalizeText(solutionRow.izmerenie || 'г');
  let solutionMassInGrams = solutionMass;

  if (solutionMassUnit === 'кг') solutionMassInGrams = solutionMass * 1000;
  else if (solutionMassUnit === 'мг') solutionMassInGrams = solutionMass / 1000;

  const volumeInMl = convertVolumeToMl(volume, volumeRow.izmerenie);

  // =====================================================
  // ШАГ 5. Считаем плотность: ρ = m / V  (в г/мл)
  // =====================================================
  let density = solutionMassInGrams / volumeInMl;
  let outputUnit = 'г/мл';

  // Учитываем, в каких единицах просят ответ в блоке «Найти»
  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'кг/м³' || requestedUnit === 'кг/м3') {
    // 1 г/мл = 1000 кг/м³
    density = density * 1000;
    outputUnit = 'кг/м³';
  } else if (requestedUnit === 'кг/л') {
    // 1 г/мл = 1 кг/л — численно то же самое
    outputUnit = 'кг/л';
  } else if (requestedUnit === 'г/см³' || requestedUnit === 'г/см3') {
    // 1 г/мл = 1 г/см³ — численно то же самое
    outputUnit = 'г/см³';
  }
  // по умолчанию: г/мл

  const roundedDensity = Number(density.toFixed(4));

  // =====================================================
  // ШАГ 6. Формируем итоговый текст
  // =====================================================
  const volumeText =
    volumeInMl !== volume
      ? `${formatNumber(volume)} ${volumeRow.izmerenie} = ${formatNumber(
          volumeInMl
        )} мл`
      : `${formatNumber(volumeInMl)} мл`;

  const finalStep = `Вычислим плотность раствора по формуле ρ = m / V. ρ(раствора) = m(раствора) / V(раствора) = ${formatNumber(
    solutionMassInGrams
  )} г / ${volumeText} = ${formatNumber(roundedDensity)} ${outputUnit}`;

  const fullText = [...chainSteps, finalStep].join('\n');

  results.push({
    id: `plotnostR-${formula}`,
    formula,
    massaRastvora: solutionMass,
    massaRastvoraUnit: solutionRow.izmerenie || 'г',
    obyomRastvora: volume,
    obyomRastvoraUnit: volumeRow.izmerenie || 'мл',
    density: roundedDensity,
    densityUnit: outputUnit,
    text: fullText,
  });

  return {
    results,
    errors,
  };
}