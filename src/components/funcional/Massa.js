import { getMolarMass } from './MolarMass';
import { KolichestvoV } from './KolichestvoV';
import { KolichestvoN } from './KolichestvoN';
import { MassaW } from './MassaW';
import { MassaRaznost } from './MassaRaznost';
import { MassaWPO } from './MassaWPO';
import { MassaVP } from './MassaVP';
import { AnalitikMassaVodaDolya } from './AnalitikMassaVodaDolya';
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

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function Massa(danoRows = [], formula, findRow, givenRow) {
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

  // =====================================================
  // ШАГ 1. Ищем количество вещества прямо в «Дано»
  // =====================================================
  let kolRow = null;

  if (
    givenRow &&
    normalizeText(givenRow.charText).includes('количество вещества') &&
    normalizeText(givenRow.formula) === normalizedFormula
  ) {
    kolRow = givenRow;
  } else {
    kolRow =
      [...rowsForFormula]
        .reverse()
        .find((row) =>
          normalizeText(row.charText).includes('количество вещества')
        ) || null;
  }

  // Сюда собираются тексты промежуточных шагов цепочки
  const chainSteps = [];

  // =====================================================
  // ШАГ 2. Если нет — пробуем получить n через объём
  // (вызываем KolichestvoV).
  // =====================================================
  if (!kolRow) {
    const kolAnswer = KolichestvoV(danoRows, formula, findRow, givenRow);

    if (kolAnswer.results.length > 0) {
      const virtualRow = resultToVirtualRow(
        kolAnswer.results[0],
        formula,
        'Количество вещества'
      );

      if (virtualRow) {
        kolRow = virtualRow;

        if (kolAnswer.results[0].text) {
          chainSteps.push(kolAnswer.results[0].text);
        }
      }
    }
  }

  // =====================================================
  // ШАГ 3. Если и через объём не получилось — через молекулы
  // (вызываем KolichestvoN)
  // =====================================================
  if (!kolRow) {
    const kolAnswerN = KolichestvoN(danoRows, formula, findRow, givenRow);

    if (
      kolAnswerN.results.length > 0 &&
      Number(kolAnswerN.results[0].amount) > 0
    ) {
      const virtualRow = resultToVirtualRow(
        kolAnswerN.results[0],
        formula,
        'Количество вещества'
      );

      if (virtualRow) {
        kolRow = virtualRow;

        if (kolAnswerN.results[0].text) {
          chainSteps.push(kolAnswerN.results[0].text);
        }
      }
    }
  }

  // =====================================================
  // ШАГ 3.1. Если количества вещества нет, НО в «Дано» есть
  // «плотность раствора», «объём раствора» и «массовая доля» —
  // считаем массу через w × ρ(раствора) × V(раствора)
  // =====================================================
  if (!kolRow) {
    const hasPlotnostRastvora = danoRows.some((row) =>
      normalizeText(row.charText).includes('плотность раствора')
    );

    const hasObyomRastvora = danoRows.some((row) =>
      normalizeText(row.charText).includes('объем раствора')
    );

    const hasMassDolya = danoRows.some((row) =>
      normalizeText(row.charText).includes('массовая доля')
    );

    if (hasPlotnostRastvora && hasObyomRastvora && hasMassDolya) {
      const wpoAnswer = MassaWPO(danoRows, formula, findRow, givenRow);

      if (wpoAnswer.results.length > 0) {
        return wpoAnswer;
      }
    }
  }

  // =====================================================
  // ШАГ 3.2. Если количество вещества получить не удалось —
  // пробуем посчитать массу напрямую через MassaVP
  // (объём вещества × плотность вещества)
  // =====================================================
  if (!kolRow) {
    const vpAnswer = MassaVP(danoRows, formula, findRow, givenRow);

    if (vpAnswer.results.length > 0) {
      return vpAnswer;
    }
  }

  // =====================================================
  // ШАГ 3.3. Если количество вещества получить не удалось —
  // пробуем посчитать массу как разность:
  // m(вещества) = m(раствора) − m(воды)
  // =====================================================
  if (!kolRow) {
    const raznostAnswer = MassaRaznost(danoRows, formula, findRow, givenRow);

    if (raznostAnswer.results.length > 0) {
      return raznostAnswer;
    }
  }

  // =====================================================
  // ШАГ 3.4. Если массы всё ещё нет — пробуем через
  // массу воды + массовую долю (система уравнений)
  // =====================================================
  if (!kolRow) {
    const vdAnswer = AnalitikMassaVodaDolya(danoRows, formula, findRow, givenRow);

    if (vdAnswer.results.length > 0) {
      return vdAnswer;
    }
  }

  // =====================================================
  // ШАГ 3.5. Если количество вещества получить не удалось —
  // пробуем посчитать массу напрямую через MassaW
  // (масса раствора × массовая доля)
  // =====================================================
  if (!kolRow) {
    const massWAnswer = MassaW(danoRows, formula, findRow, givenRow);

    if (massWAnswer.results.length > 0) {
      return massWAnswer;
    }

    // Промежуточные ошибки не пробрасываем — это диагностическая информация.
    // Пользователь увидит только финальную ошибку.
  }

  // =====================================================
  // ШАГ 3.6. Если количество вещества так и не получили —
  // выдаём финальную ошибку
  // =====================================================
  if (!kolRow) {
    errors.push(
      `Для вещества ${formula}: не удалось получить массу вещества.`
    );

    return { results, errors };
  }

  // =====================================================
  // ФИНАЛЬНЫЙ ШАГ. Количество вещества найдено — считаем массу
  // m = n × M
  // =====================================================
  const n = parseNumericValue(kolRow.value);

  if (Number.isNaN(n) || n <= 0) {
    errors.push(
      `Для вещества ${formula}: количество вещества указано некорректно.`
    );

    return { results, errors };
  }

  const molarMass = Number(getMolarMass(formula));

  if (Number.isNaN(molarMass) || molarMass <= 0) {
    errors.push(
      `Для вещества ${formula}: молярная масса не найдена.`
    );

    return { results, errors };
  }

  // Сначала считаем массу в граммах
  const massInGrams = n * molarMass;

  // 🔑 Переводим в единицу, которую просит пользователь в «Найти»
  let finalMass = massInGrams;
  let outputUnit = 'г';

  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'кг') {
    finalMass = massInGrams / 1000;
    outputUnit = 'кг';
  } else if (requestedUnit === 'мг') {
    finalMass = massInGrams * 1000;
    outputUnit = 'мг';
  }

  const roundedMass = Number(finalMass.toFixed(4));

  // Если был перевод — показываем оба значения, чтобы решение было понятным
  const massText =
    outputUnit !== 'г'
      ? `${formatNumber(massInGrams)} г = ${formatNumber(roundedMass)} ${outputUnit}`
      : `${formatNumber(roundedMass)} г`;

  const finalStep = `Вычислим массу вещества по формуле m = n × M. m(${formula}) = n(${formula}) × M(${formula}) = ${formatNumber(
    n
  )} моль × ${formatNumber(molarMass)} г/моль = ${massText}`;

  const fullText = joinSteps([...chainSteps, finalStep]);

  results.push({
    id: `massa-${formula}`,
    formula,
    n,
    molarMass,
    mass: roundedMass,
    massUnit: outputUnit,
    text: fullText,
  });

  return {
    results,
    errors,
  };
}