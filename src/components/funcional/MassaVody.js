// MassaVody.js
// Вычисление массы воды:
//
// m(H2O) = m(раствора) − m(вещества)
//
// Масса раствора — напрямую или через MassaR,
// масса вещества — напрямую или через Massa
// (формула вещества берётся из «растворных» строк «Дано»).

import { Massa } from './Massa';
import { MassaR } from './MassaR';
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

function isWaterFormula(f) {
  const nf = normalizeText(f);
  return nf === 'h2o' || nf === 'вода';
}

export function MassaVody(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const chainSteps = [];

  // =====================================================
  // ШАГ 1. Масса раствора (напрямую или через MassaR)
  // =====================================================
  let rastvorRow =
    [...danoRows]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса раствора')
      ) || null;

  if (!rastvorRow) {
    const massaRAnswer = MassaR(danoRows, formula, findRow, givenRow);

    if (massaRAnswer.results.length > 0) {
      const res = massaRAnswer.results[0];
      const val = Number(res.massaRastvora ?? res.mass);
      const unit = res.massaRastvoraUnit ?? res.massUnit ?? 'г';

      if (Number.isFinite(val) && val > 0) {
        rastvorRow = {
          charText: 'Масса раствора',
          // 🔑 берём формулу раствора из результата MassaR
          formula: res.solutionFormula || formula,
          value: String(val),
          izmerenie: unit,
          isVirtual: true,
        };

        if (res.text) chainSteps.push(res.text);
      }
    }
  }

  if (!rastvorRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы раствора, и вычислить её тоже не удалось.`
    );
    return { results, errors };
  }

  const solutionMass = parseNumericValue(rastvorRow.value);

  if (Number.isNaN(solutionMass) || solutionMass <= 0) {
    errors.push(`Для вещества ${formula}: масса раствора указана некорректно.`);
    return { results, errors };
  }

  const solutionInGrams = convertMassToGrams(solutionMass, rastvorRow.izmerenie);

  // =====================================================
  // ШАГ 2. Формула растворённого вещества —
  // берём из «растворных» строк «Дано» (не вода!)
  // =====================================================
  const substanceFormula =
    [...danoRows]
      .reverse()
      .find((row) => {
        const char = normalizeText(row.charText);

        return (
          !isWaterFormula(row.formula) &&
          (char.includes('масса раствора') ||
            char.includes('объем раствора') ||
            char.includes('плотность раствора') ||
            char.includes('массовая доля') ||
            char.includes('масса вещества'))
        );
      })?.formula || null;

  // =====================================================
  // ШАГ 3. Масса вещества (напрямую или через Massa)
  // =====================================================
  let substanceInGrams = null;
  let substanceFormulaUsed = null;

  const massRow =
    [...danoRows]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса вещества') &&
        !isWaterFormula(row.formula)
      ) || null;

  if (massRow) {
    const m = parseNumericValue(massRow.value);

    if (!Number.isNaN(m) && m > 0) {
      substanceInGrams = convertMassToGrams(m, massRow.izmerenie);
      substanceFormulaUsed = massRow.formula;
    }
  }

  if (substanceInGrams === null && substanceFormula) {
    const candidateFindRow = {
      charText: 'Масса вещества',
      formula: substanceFormula,
      izmerenie: 'г',
    };

    const massAnswer = Massa(
      danoRows,
      substanceFormula,
      candidateFindRow,
      null
    );

    if (massAnswer.results.length > 0) {
      const res = massAnswer.results[0];
      const val = Number(res.mass ?? res.value);

      if (Number.isFinite(val) && val > 0) {
        substanceInGrams = convertMassToGrams(val, res.massUnit || 'г');
        substanceFormulaUsed = substanceFormula;

        if (res.text) chainSteps.push(res.text);
      }
    }
  }

  if (substanceInGrams === null) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы вещества, и вычислить её тоже не удалось.`
    );
    return { results, errors };
  }
  
    // =====================================================
  // ШАГ 3.5. Если массу вещества получить не удалось,
  // но есть массовая доля — считаем воду напрямую:
  // m(H2O) = m(раствора) × (1 − w)
  // =====================================================
  if (substanceInGrams === null) {
    const dolyaRow =
      [...danoRows]
        .reverse()
        .find((row) =>
          normalizeText(row.charText).includes('массовая доля')
        ) || null;

    if (dolyaRow) {
      const dolyaPercent = parseNumericValue(dolyaRow.value);

      if (
        !Number.isNaN(dolyaPercent) &&
        dolyaPercent > 0 &&
        dolyaPercent < 100
      ) {
        const w = dolyaPercent / 100;

        let waterInGrams = solutionInGrams * (1 - w);
        let outputUnit = 'г';

        const requestedUnit = normalizeText(findRow?.izmerenie);

        if (requestedUnit === 'кг') {
          waterInGrams = waterInGrams / 1000;
          outputUnit = 'кг';
        } else if (requestedUnit === 'мг') {
          waterInGrams = waterInGrams * 1000;
          outputUnit = 'мг';
        }

        const roundedWater = Number(waterInGrams.toFixed(4));
        const finalStep = `Вычислим массу воды по формуле m(H2O) = m(раствора) × (1 − w). m(${formula}) = m(раствора) × (1 − w) = ${formatNumber(
            solutionInGrams
          )} г × (1 − ${formatNumber(w)}) = ${formatNumber(
            roundedWater
          )} ${outputUnit}`;
        const fullText = joinSteps([...chainSteps, finalStep]);
        results.push({
          id: `massaVody-${formula}`,
          formula,
          massaRastvora: solutionMass,
          massaRastvoraUnit: rastvorRow.izmerenie || 'г',
          massovayaDolyaPercent: dolyaPercent,
          mass: roundedWater,
          massUnit: outputUnit,
          text: fullText,
        });

        return { results, errors };
      }
    }
  }

  // =====================================================
  // ШАГ 4. m(H2O) = m(раствора) − m(вещества)
  // =====================================================
  if (substanceInGrams >= solutionInGrams) {
    errors.push(
      `Для вещества ${formula}: масса вещества не может быть больше или равна массе раствора.`
    );
    return { results, errors };
  }

  let waterInGrams = solutionInGrams - substanceInGrams;
  let outputUnit = 'г';

  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'кг') {
    waterInGrams = waterInGrams / 1000;
    outputUnit = 'кг';
  } else if (requestedUnit === 'мг') {
    waterInGrams = waterInGrams * 1000;
    outputUnit = 'мг';
  }

  const roundedWater = Number(waterInGrams.toFixed(4));

  const finalStep = `Вычислим массу воды по формуле m(H2O) = m(раствора) − m(вещества). m(${formula}) = m(раствора) − m(${substanceFormulaUsed}) = ${formatNumber(
    solutionInGrams
  )} г − ${formatNumber(substanceInGrams)} г = ${formatNumber(
    roundedWater
  )} ${outputUnit}`;
  const fullText = joinSteps([...chainSteps, finalStep]);
  results.push({
    id: `massaVody-${formula}`,
    formula,
    massaRastvora: solutionMass,
    massaRastvoraUnit: rastvorRow.izmerenie || 'г',
    massaVeshchestva: Number(substanceInGrams.toFixed(4)),
    massaVeshchestvaUnit: 'г',
    mass: roundedWater,
    massUnit: outputUnit,
    text: fullText,
  });

  return {
    results,
    errors,
  };
}