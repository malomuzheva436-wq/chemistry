import { MassaR } from './MassaR';
import { Massa } from './Massa';
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

export function MassDolya(danoRows = [], formula, findRow, givenRow) {
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

  // Сюда собираем тексты промежуточных шагов цепочки
  const chainSteps = [];

  // =====================================================
  // ШАГ 1. Ищем строку с массой вещества
  // =====================================================
  let massRow =
    [...rowsForFormula]
      .reverse()
      .find((row) =>
        normalizeText(row.charText).includes('масса вещества')
      ) || null;

  // ===== Если массы нет — вызываем Massa (один раз!) =====
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

        if (massaAnswer.results[0].text) {
          chainSteps.push(massaAnswer.results[0].text);
        }
      }
    }
  }

  // =====================================================
  // ШАГ 2. Ищем строку с массой раствора (смеси)
  // =====================================================
  let solutionRow =
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

  // ===== Если массы раствора нет — вычисляем через MassaR =====
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
  // ШАГ 3. Проверки наличия данных
  // =====================================================
  if (!massRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы вещества, и вычислить её тоже не удалось.`
    );

    return { results, errors };
  }

  if (!solutionRow) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет массы раствора (смеси), и вычислить её тоже не удалось.`
    );

    return { results, errors };
  }

  // =====================================================
  // ШАГ 4. Парсим значения
  // =====================================================
  const mass = parseNumericValue(massRow.value);

  if (Number.isNaN(mass) || mass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса вещества указана некорректно.`
    );

    return { results, errors };
  }

  const solutionMass = parseNumericValue(solutionRow.value);

  if (Number.isNaN(solutionMass) || solutionMass <= 0) {
    errors.push(
      `Для вещества ${formula}: масса раствора (смеси) указана некорректно.`
    );

    return { results, errors };
  }

  // Переводим обе массы в граммы
  const massInGrams = convertMassToGrams(mass, massRow.izmerenie);
  const solutionMassInGrams = convertMassToGrams(
    solutionMass,
    solutionRow.izmerenie
  );

  // Масса вещества не может быть больше массы раствора (смеси)
  if (massInGrams > solutionMassInGrams) {
    errors.push(
      `Для вещества ${formula}: масса вещества не может быть больше массы раствора (смеси).`
    );

    return { results, errors };
  }

  const dolya = massInGrams / solutionMassInGrams;

  // Учитываем, в каких единицах просят ответ в блоке «Найти»
  const requestedUnit = normalizeText(findRow?.izmerenie);

  let value;
  let outputUnit;

  if (requestedUnit === '%' || requestedUnit === '') {
    value = dolya * 100;
    outputUnit = '%';
  } else {
    value = dolya;
    outputUnit = '';
  }

  const roundedValue = Number(value.toFixed(4));

  // =====================================================
  // ШАГ 5. Формируем итоговый текст: пояснение + формула
  // =====================================================
  const finalStep =
    outputUnit === '%'
      ? `Вычислим массовую долю по формуле w = m(вещества) / m(раствора). w(${formula}) = m(${formula}) / m(раствора) = ${formatNumber(
          massInGrams
        )} г / ${formatNumber(solutionMassInGrams)} г = ${formatNumber(
          dolya
        )} = ${formatNumber(roundedValue)} %`
      : `Вычислим массовую долю по формуле w = m(вещества) / m(раствора). w(${formula}) = m(${formula}) / m(раствора) = ${formatNumber(
          massInGrams
        )} г / ${formatNumber(solutionMassInGrams)} г = ${formatNumber(
          roundedValue
        )}`;

  const fullText = joinSteps([...chainSteps, finalStep]);

  results.push({
    id: `massDolya-${formula}`,
    formula,
    massVeshchestva: mass,
    massVeshchestvaUnit: massRow.izmerenie || 'г',
    massaRastvora: solutionMass,
    massaRastvoraUnit: solutionRow.izmerenie || 'г',
    massovayaDolya: roundedValue,
    massovayaDolyaUnit: outputUnit,
    text: fullText,
  });

  return {
    results,
    errors,
  };
}