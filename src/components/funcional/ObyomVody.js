// ObyomVody.js
// Вычисление объёма воды:
//
// V(H2O) = m(H2O) / ρ(H2O),   где ρ(H2O) = 1 г/мл
//
// Массу воды берём напрямую из «Дано» или через MassaVody
// (m(раствора) − m(вещества)).

import { MassaVody } from './MassaVody';
import { Massa } from './Massa';
import { joinSteps } from './VirtualRow';

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

export function ObyomVody(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const pH2O = 1; // г/мл

  const chainSteps = [];
  let waterMassInGrams = null;

  // =====================================================
  // ШАГ 1. Ищем массу воды напрямую в «Дано»
  // =====================================================
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

  if (waterRow) {
    const m = parseNumericValue(waterRow.value);

    if (!Number.isNaN(m) && m > 0) {
      waterMassInGrams = convertMassToGrams(m, waterRow.izmerenie);
    }
  } else {
    // =====================================================
    // ШАГ 2. Если нет — получаем через MassaVody
    // (m(раствора) − m(вещества))
    // =====================================================
    const vodaAnswer = MassaVody(danoRows, formula, findRow, givenRow);

    if (vodaAnswer.results.length > 0) {
      const res = vodaAnswer.results[0];
      const val = Number(res.mass ?? res.value);

      if (Number.isFinite(val) && val > 0) {
        waterMassInGrams = convertMassToGrams(val, res.massUnit || 'г');

        if (res.text) {
          chainSteps.push(res.text);
        }
      }
    }
  }
  
    // =====================================================
  // ШАГ 2.5. Если массы воды всё ещё нет — получаем её через Massa
  // (например, из количества вещества: m = n × M;
  //  сюда же приходит виртуальная строка из расчёта по уравнению)
  // =====================================================
  if (waterMassInGrams === null) {
    const massFindRow = {
      charText: 'Масса вещества',
      formula,
      izmerenie: 'г',
    };

    const massaAnswer = Massa(danoRows, formula, massFindRow, null);

    if (massaAnswer.results.length > 0) {
      const res = massaAnswer.results[0];
      const val = Number(res.mass ?? res.value);

      if (Number.isFinite(val) && val > 0) {
        waterMassInGrams = convertMassToGrams(val, res.massUnit || 'г');

        if (res.text) {
          chainSteps.push(res.text);
        }
      }
    }
  }

  if (waterMassInGrams === null) {
    errors.push(
      `Для вещества ${formula}: не удалось получить массу воды ни напрямую, ни через массу раствора и массу вещества.`
    );

    return { results, errors };
  }

  // =====================================================
  // ШАГ 3. V(H2O) = m(H2O) / ρ(H2O) → миллилитры
  // =====================================================
  const volumeInMl = waterMassInGrams / pH2O;

  let volume = volumeInMl;
  let outputUnit = 'мл';

  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'л') {
    volume = volumeInMl / 1000;
    outputUnit = 'л';
  } else if (requestedUnit === 'м³' || requestedUnit === 'м3') {
    volume = volumeInMl / 1000000;
    outputUnit = 'м³';
  }

  const roundedVolume = Number(volume.toFixed(4));

  const volumeText =
    outputUnit !== 'мл'
      ? `${formatNumber(volumeInMl)} мл = ${formatNumber(
          roundedVolume
        )} ${outputUnit}`
      : `${formatNumber(roundedVolume)} мл`;

  const finalStep = `Вычислим объём воды по формуле V(H2O) = m(H2O) / ρ(H2O). V(${formula}) = m(${formula}) / ρ(${formula}) = ${formatNumber(
    waterMassInGrams
  )} г / ${formatNumber(pH2O)} г/мл = ${volumeText}`;
  const fullText = joinSteps([...chainSteps, finalStep]);
  results.push({
    id: `obyomVody-${formula}`,
    formula,
    massaVody: waterMassInGrams,
    V: roundedVolume,
    volumeUnit: outputUnit,
    text: fullText,
  });

  return {
    results,
    errors,
  };
}