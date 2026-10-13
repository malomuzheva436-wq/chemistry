// MassaR.js
// Вычисление массы раствора тремя способами:
//
// 1. m(раствора) = m(вещества) / w
// 2. m(раствора) = ρ(раствора) × V(раствора)
// 3. m(раствора) = m(вещества) + m(воды)
//
// Масса вещества берётся напрямую или через Massa,
// масса воды — напрямую или через MassaVP (для H2O).

import { Massa } from './Massa';
import { MassaVP } from './MassaVP';
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

  if (normalizedUnit === 'кг') return value * 1000;
  if (normalizedUnit === 'мг') return value / 1000;

  return value;
}

function convertVolumeToMl(value, unit) {
  const normalizedUnit = normalizeText(unit);

  if (normalizedUnit === 'л') return value * 1000;
  if (normalizedUnit === 'м³' || normalizedUnit === 'м3') return value * 1000000;

  return value;
}

export function MassaR(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);

  const rowsForFormula = danoRows.filter(
    (row) => normalizeText(row.formula) === normalizedFormula
  );


  const chainSteps = [];

  // ============ МАССА ВЕЩЕСТВА: напрямую или через Massa ============
  let massRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса вещества')
      ) || null;

  if (!massRow) {
    const massaAnswer = Massa(danoRows, formula, findRow, givenRow);

    if (massaAnswer.results.length > 0) {
      const virtualRow = resultToVirtualRow(
        massaAnswer.results[0],
        formula,
        'Масса вещества'
      );

      if (virtualRow) {
        massRow = virtualRow;
        if (massaAnswer.results[0].text) chainSteps.push(massaAnswer.results[0].text);
      }
    }
  }

  // ============ МАССОВАЯ ДОЛЯ ============
  const dolyaRow =
    [...rowsForFormula]
      .reverse()
      .find((row) => normalizeText(row.charText).includes('массовая доля')) || null;

    // ============ ПЛОТНОСТЬ И ОБЪЁМ РАСТВОРА ============
  // Раствор может быть описан строками с ЛЮБОЙ формулой
  // (например, с формулой растворителя C6H6),
  // поэтому ищем сначала для своей формулы, а потом по всему «Дано»
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

  const volumeRastvorRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('объем раствора')
      ) ||
    [...danoRows]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('объем раствора')
      ) ||
    null;

  // ============ МАССА ВОДЫ: напрямую или через MassaVP (H2O) ============
  let waterRow =
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

  // 🔑 НОВОЕ: если массы воды нет — получаем её из объёма воды
  if (!waterRow) {
    const vpAnswer = MassaVP(danoRows, 'H2O', findRow, givenRow);

    if (vpAnswer.results.length > 0) {
      const res = vpAnswer.results[0];
      const val = Number(res.mass ?? res.value);

      if (Number.isFinite(val) && val > 0) {
        waterRow = {
          charText: 'Масса воды',
          formula: 'H2O',
          value: String(val),
          izmerenie: res.massUnit || 'г',
          isVirtual: true,
        };

        if (res.text) chainSteps.push(res.text);
      }
    }
  }

  // ============ СПОСОБ 1: m(раствора) = m(вещества) / w ============
  if (massRow && dolyaRow) {
    const mass = parseNumericValue(massRow.value);
    const dolyaPercent = parseNumericValue(dolyaRow.value);

    if (
      !Number.isNaN(mass) && mass > 0 &&
      !Number.isNaN(dolyaPercent) && dolyaPercent > 0 && dolyaPercent <= 100
    ) {
      const massInGrams = convertMassToGrams(mass, massRow.izmerenie);
      let solutionMass = massInGrams / (dolyaPercent / 100);
      let outputUnit = 'г';

      const requestedUnit = normalizeText(findRow?.izmerenie);
      if (requestedUnit === 'кг') { solutionMass /= 1000; outputUnit = 'кг'; }
      else if (requestedUnit === 'мг') { solutionMass *= 1000; outputUnit = 'мг'; }

      const rounded = Number(solutionMass.toFixed(4));
      const finalStep = `Вычислим массу раствора по формуле m(раствора) = m(вещества) / w. m(раствора) = m(${formula}) / w = ${formatNumber(massInGrams)} г / (${formatNumber(dolyaPercent)}% / 100) = ${formatNumber(rounded)}`;
      const fullText = joinSteps([...chainSteps, finalStep]);
      results.push({
        id: `massaR-${formula}`,
        formula,
        massaRastvora: rounded,
        massaRastvoraUnit: outputUnit,
        text: fullText,
      });

      return { results, errors };
    }
  }

  // ============ СПОСОБ 2: m(раствора) = ρ(раствора) × V(раствора) ============
  if (densityRow && volumeRastvorRow) {
    const density = parseNumericValue(densityRow.value);
    const volume = parseNumericValue(volumeRastvorRow.value);

    if (!Number.isNaN(density) && density > 0 && !Number.isNaN(volume) && volume > 0) {
      const volumeInMl = convertVolumeToMl(volume, volumeRastvorRow.izmerenie);
      let solutionMass = density * volumeInMl;
      let outputUnit = 'г';

      const requestedUnit = normalizeText(findRow?.izmerenie);
      if (requestedUnit === 'кг') { solutionMass /= 1000; outputUnit = 'кг'; }
      else if (requestedUnit === 'мг') { solutionMass *= 1000; outputUnit = 'мг'; }

      const rounded = Number(solutionMass.toFixed(4));

      const volumeText =
        volumeInMl !== volume
          ? `${formatNumber(volume)} ${volumeRastvorRow.izmerenie} = ${formatNumber(volumeInMl)} мл`
          : `${formatNumber(volumeInMl)} мл`;
      
      const finalStep = `Вычислим массу раствора по формуле m = ρ × V. m(раствора) = ρ(раствора) × V(раствора) = ${formatNumber(density)} г/мл × ${volumeText} = ${formatNumber(rounded)}мл`;
      const fullText = joinSteps([...chainSteps, finalStep]);

      results.push({
        id: `massaR-${formula}`,
        solutionFormula:
          (densityRow && densityRow.formula) ||
          (volumeRastvorRow && volumeRastvorRow.formula) ||
          formula,
        massaRastvora: rounded,
        massaRastvoraUnit: outputUnit,
        text: fullText,
      });

      return { results, errors };
    }
  }

  // ============ СПОСОБ 3: m(раствора) = m(вещества) + m(воды) ============
  if (massRow && waterRow) {
    const mass = parseNumericValue(massRow.value);
    const waterMass = parseNumericValue(waterRow.value);

    if (!Number.isNaN(mass) && mass > 0 && !Number.isNaN(waterMass) && waterMass > 0) {
      const massInGrams = convertMassToGrams(mass, massRow.izmerenie);
      const waterInGrams = convertMassToGrams(waterMass, waterRow.izmerenie);

      let solutionMass = massInGrams + waterInGrams;
      let outputUnit = 'г';

      const requestedUnit = normalizeText(findRow?.izmerenie);
      if (requestedUnit === 'кг') { solutionMass /= 1000; outputUnit = 'кг'; }
      else if (requestedUnit === 'мг') { solutionMass *= 1000; outputUnit = 'мг'; }

      const rounded = Number(solutionMass.toFixed(4));
      const finalStep = `Вычислим массу раствора по формуле m(раствора) = m(вещества) + m(воды). m(раствора) = m(${formula}) + m(H2O) = ${formatNumber(massInGrams)} г + ${formatNumber(waterInGrams)} г = ${formatNumber(rounded)}`;
      const fullText = joinSteps([...chainSteps, finalStep]);
      results.push({
        id: `massaR-${formula}`,
        formula,
        massaRastvora: rounded,
        massaRastvoraUnit: outputUnit,
        text: fullText,
      });

      return { results, errors };
    }
  }
  
    // ============ СПОСОБ 4: m(раствора) = m(воды) / (1 − w) ============
  if (waterRow && dolyaRow) {
    const waterMass = parseNumericValue(waterRow.value);
    const dolyaPercent = parseNumericValue(dolyaRow.value);

    if (
      !Number.isNaN(waterMass) && waterMass > 0 &&
      !Number.isNaN(dolyaPercent) && dolyaPercent > 0 && dolyaPercent < 100
    ) {
      const w = dolyaPercent / 100;
      const waterInGrams = convertMassToGrams(waterMass, waterRow.izmerenie);
      const solutionMass = waterInGrams / (1 - w);
      const rounded = Number(solutionMass.toFixed(4));
      const finalStep = `Вычислим массу раствора по формуле m(раствора) = m(воды) / (1 − w). m(раствора) = m(воды) / (1 − w) = ${formatNumber(waterInGrams)} г / (1 − ${formatNumber(w)}) = ${formatNumber(rounded)} г`;
      const fullText = joinSteps([...chainSteps, finalStep]);
      results.push({
        id: `massaR-${formula}`,
        formula,
        massaRastvora: rounded,
        massaRastvoraUnit: 'г',
        text: fullText,
      });

      return { results, errors };
    }
  }

  errors.push(
    `Для вещества ${formula}: не удалось рассчитать массу раствора. Добавьте в «Дано» массовую долю, либо плотность и объём раствора, либо объём или массу воды.`
  );

  return { results, errors };
}