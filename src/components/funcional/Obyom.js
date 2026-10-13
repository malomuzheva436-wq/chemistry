// Obyom.js
// Вычисление объёма вещества (газа) при н.у.:
//
// V = n × Vm,   где Vm = 22,4 л/моль
//
// Если количества вещества в «Дано» нет, функция пытается вычислить его:
//   - через массу вещества      → вызывает KolichestvoM (n = m / M)
//   - через количество молекул  → вызывает KolichestvoN (n = N / Na)

import { KolichestvoM } from './KolichestvoM';
import { KolichestvoN } from './KolichestvoN';
import { MassaWPO } from './MassaWPO';
import {ObyomVody} from './ObyomVody';
import { resultToVirtualRow, joinSteps } from './VirtualRow';

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
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

const MOLAR_VOLUME = 22.4; // л/моль

function isWaterFormula(f) {
  const nf = normalizeText(f);
  return nf === 'h2o' || nf === 'вода';
}

export function Obyom(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];
  const normalizedFormula = normalizeText(formula);

    // =====================================================
  // ШАГ 0. Исключение для воды
  // =====================================================
  // Если формула = H2O и в «Дано» НЕТ строки «Объём вещества» для неё,
  // значит вода в жидком виде — передаём расчёт в ObyomVody.
  // Если же объём вещества H2O есть в «Дано» — это водяной пар,
  // считаем как обычный газ через V = n × Vm.
  if (isWaterFormula(formula)) {
    const hasVolumeRow = danoRows.some((row) => {
      const char = normalizeText(row.charText);
      const f = normalizeText(row.formula);

      return (
        (f === 'h2o' || f === 'вода') &&
        (char.includes('объем вещества') || char.includes('объём вещества'))
      );
    });

    if (!hasVolumeRow) {
      return ObyomVody(danoRows, formula, findRow, givenRow);
    }
  }

  // Для всех остальных веществ: если пользователь запросил объём,
  // значит он считает вещество газом — считаем V = n × Vm.
  // =====================================================
  // ШАГ 1. Ищем количество вещества напрямую в «Дано»
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
      [...danoRows]
        .reverse()
        .find(
          (row) =>
            normalizeText(row.formula) === normalizedFormula &&
            normalizeText(row.charText).includes('количество вещества')
        ) || null;
  }

  // Сюда собираем тексты промежуточных шагов цепочки
  const chainSteps = [];

  // =====================================================
  // ШАГ 2. Если нет — пробуем получить n через массу
  // (вызываем KolichestvoM)
  // =====================================================
  if (!kolRow) {
    const kolAnswer = KolichestvoM(danoRows, formula, findRow, givenRow);

    if (
      kolAnswer.results.length > 0 &&
      Number(kolAnswer.results[0].amount) > 0
    ) {
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
  // ШАГ 3. Если и через массу не получилось — через молекулы
  // (вызываем KolichestvoN)
  // =====================================================
  if (!kolRow) {
    const kolAnswer2 = KolichestvoN(danoRows, formula, findRow, givenRow);

    if (
      kolAnswer2.results.length > 0 &&
      Number(kolAnswer2.results[0].amount) > 0
    ) {
      const virtualRow = resultToVirtualRow(
        kolAnswer2.results[0],
        formula,
        'Количество вещества'
      );

      if (virtualRow) {
        kolRow = virtualRow;

        if (kolAnswer2.results[0].text) {
          chainSteps.push(kolAnswer2.results[0].text);
        }
      }
    }
  }

  // =====================================================
  // ШАГ 4. Если количество вещества так и не получили —
  // достаём массу вещества через MassaWPO
  // (массовая доля × плотность раствора × объём раствора),
  // а из массы получаем количество вещества через KolichestvoM
  // =====================================================
  if (!kolRow) {
    const wpoAnswer = MassaWPO(danoRows, formula, findRow, givenRow);

    if (wpoAnswer.results.length > 0) {
      // Превращаем найденную массу в виртуальную строку «Дано»
      const massVirtualRow = resultToVirtualRow(
        wpoAnswer.results[0],
        formula,
        'Масса вещества'
      );

      if (massVirtualRow) {
        // Из массы получаем количество вещества
        const kolAnswerM = KolichestvoM(
          [...danoRows, massVirtualRow],
          formula,
          findRow,
          massVirtualRow
        );

        if (
          kolAnswerM.results.length > 0 &&
          Number(kolAnswerM.results[0].amount) > 0
        ) {
          const kolVirtualRow = resultToVirtualRow(
            kolAnswerM.results[0],
            formula,
            'Количество вещества'
          );

          if (kolVirtualRow) {
            kolRow = kolVirtualRow;

            // Собираем тексты обоих промежуточных шагов
            if (wpoAnswer.results[0].text) {
              chainSteps.push(wpoAnswer.results[0].text);
            }

            if (kolAnswerM.results[0].text) {
              chainSteps.push(kolAnswerM.results[0].text);
            }
          }
        }
      }
    }
  }

  // =====================================================
  // ШАГ 5. Финальная проверка: получили ли мы количество?
  // =====================================================
  if (!kolRow) {
    errors.push(
      `Для вещества ${formula}: не удалось получить количество вещества ни напрямую, ни через массу, ни через молекулы, ни через раствор.`
    );

    return { results, errors };
  }

  // =====================================================
  // ШАГ 6. Парсим n и считаем объём: V = n × Vm
  // =====================================================
  const n = parseNumericValue(kolRow.value);

  if (Number.isNaN(n) || n <= 0) {
    errors.push(
      `Для вещества ${formula}: количество вещества указано некорректно.`
    );

    return { results, errors };
  }

  let V = n * MOLAR_VOLUME;
  let outputUnit = 'л';

  // Учитываем единицу, которую просит пользователь в блоке «Найти»
  const requestedUnit = normalizeText(findRow?.izmerenie);

  if (requestedUnit === 'мл') {
    V = V * 1000;
    outputUnit = 'мл';
  } else if (requestedUnit === 'м³' || requestedUnit === 'м3') {
    V = V / 1000;
    outputUnit = 'м³';
  }

  const roundedV = Number(V.toFixed(4));

  // =====================================================
  // ШАГ 7. Формируем итоговый текст решения
  // все шаги цепочки + финальная формула
  // =====================================================
  const finalStep = `Вычислим объём газа по формуле V = n × Vm. V(${formula}) = n(${formula}) × Vm = ${formatNumber(
    n
  )} моль × ${formatNumber(MOLAR_VOLUME)} л/моль = ${formatNumber(
    roundedV
  )} ${outputUnit}`;

  const fullText = joinSteps([...chainSteps, finalStep]);

  results.push({
    id: `obyom-${formula}`,
    formula,
    n,
    Vm: MOLAR_VOLUME,
    V: roundedV,
    volumeUnit: outputUnit,
    text: fullText,
  });

  return {
    results,
    errors,
  };
}