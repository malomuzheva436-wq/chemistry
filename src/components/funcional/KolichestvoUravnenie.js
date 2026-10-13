// KolichestvoUravnenie.js
// Количество вещества по уравнениям реакции + учёт выхода продукта (η)

import { KolichestvoM } from './KolichestvoM';
import { KolichestvoV } from './KolichestvoV';
import { KolichestvoN } from './KolichestvoN';
import { parseReaction } from './Uravnenia';
import { joinSteps } from './VirtualRow';
import { findYieldRow, parseYieldPercent, isProduct } from './Vyxod';
import { getMolarMass } from './MolarMass';

const MAX_DEPTH = 3;

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

// Металл-заглушка с валентностью (MeIII, Me(II) и т.п.) равен просто Me
function normalizeMetal(value) {
  const f = String(value ?? '').trim();

  return /^me\(?(i|ii|iii|iv|v|vi|vii)\)?$/.test(f) ? 'me' : f;
}

function sameFormula(a, b) {
  return normalizeMetal(normalizeText(a)) === normalizeMetal(normalizeText(b));
}

function getParsedReaction(row) {
  if (!row) return null;

  if (row.reactionKey) {
    const byKey = parseReaction(row.reactionKey);
    if (byKey) return byKey;
  }

  if (row.reactionText) {
    const byText = parseReaction(row.reactionText);
    if (byText) return byText;
  }

  if (row.reactionLeft && row.reactionRight) {
    return parseReaction(`${row.reactionLeft} --> ${row.reactionRight}`);
  }

  return null;
}

// =====================================================
// Количество вещества НАПРЯМУЮ из «Дано» (практические данные)
// =====================================================
export function getAmountDirect(danoRows, formula) {
  const fakeFind = {
    charText: 'Количество вещества',
    formula,
    izmerenie: 'моль',
  };

  const kolRow =
    [...danoRows]
      .reverse()
      .find(
        (r) =>
          sameFormula(r.formula, formula) &&
          normalizeText(r.charText).includes('количество вещества')
      ) || null;

  if (kolRow) {
    const n = parseNumericValue(kolRow.value);

    if (!Number.isNaN(n) && n > 0) {
      return { amount: n, steps: [] };
    }
  }

  const chains = [
    KolichestvoV(danoRows, formula, fakeFind, null),
    KolichestvoM(danoRows, formula, fakeFind, null),
    KolichestvoN(danoRows, formula, fakeFind, null),
  ];

  for (const ans of chains) {
    if (ans.results.length > 0 && Number(ans.results[0].amount) > 0) {
      return {
        amount: Number(ans.results[0].amount),
        steps: ans.results[0].text ? [ans.results[0].text] : [],
      };
    }
  }

  return null;
}

// =====================================================
// Количество вещества ПО УРАВНЕНИЯМ (рекурсивно, теоретическое)
// =====================================================
function getAmountByReaction(
  danoRows,
  uravneniaRows,
  formula,
  visited,
  depth,
  excludeRow = null,
  ignoreYield = false
) {
  if (depth > MAX_DEPTH) return null;

  const normalized = normalizeText(formula);
  if (visited.has(normalized)) return null;

  for (const row of uravneniaRows) {
    if (excludeRow && row === excludeRow) continue;

    const parsed = getParsedReaction(row);

    if (!parsed) continue;

    // Параметрические уравнения (с n в коэффициентах) не дают числовой стехиометрии
    if (
      [...parsed.left, ...parsed.right].some(
        (i) => !Number.isFinite(i.coefficient)
      )
    ) {
      continue;
    }

    const all = [...parsed.left, ...parsed.right];
    const targetItem = all.find((i) => sameFormula(i.formula, formula));

    if (!targetItem) continue;

    const nextVisited = new Set(visited);
    nextVisited.add(normalized);

    const knowns = [];

    for (const item of all) {
      if (sameFormula(item.formula, formula)) continue;

      let sub = getAmountDirect(danoRows, item.formula);

      // 🔑 Практические данные продукта → теоретическое количество через η
      if (sub && !ignoreYield) {
        const yRow = findYieldRow(danoRows, item.formula);
        const eta = parseYieldPercent(yRow);

        if (
          eta &&
          parsed.right.some((i) => sameFormula(i.formula, item.formula))
        ) {
          const teor = sub.amount / (eta / 100);

          sub = {
            amount: teor,
            steps: [
              ...sub.steps,
              `Учтём выход продукта: n(теор) = n(практ) / (η / 100) = ${formatNumber(
                sub.amount
              )} моль / (${formatNumber(eta)} / 100) = ${formatNumber(
                Number(teor.toFixed(4))
              )} моль`,
            ],
          };
        }
      }

      if (!sub) {
        sub = getAmountByReaction(
          danoRows,
          uravneniaRows,
          item.formula,
          nextVisited,
          depth + 1,
          row,
          ignoreYield
        );
      }

      if (sub) knowns.push({ item, ...sub });
    }

    if (knowns.length === 0) continue;

    let limiting = knowns[0];
    let limitingRatio = limiting.amount / limiting.item.coefficient;

    for (const k of knowns) {
      const r = k.amount / k.item.coefficient;

      if (r < limitingRatio - 1e-12) {
        limiting = k;
        limitingRatio = r;
      }
    }

    const steps = [...limiting.steps];

    if (knowns.length > 1) {
      const check = knowns
        .map(
          (k) =>
            `${k.item.formula}: ${formatNumber(k.amount)} / ${
              k.item.coefficient
            } = ${formatNumber(k.amount / k.item.coefficient)}`
        )
        .join('; ');

      steps.push(
        `Проверка на недостаток (n / коэфф.): ${check}. Расчёт ведём по ${limiting.item.formula}.`
      );
    }

    const amount = limitingRatio * targetItem.coefficient;
    const rounded = Number(amount.toFixed(4));

    steps.push(
      `Используем уравнение реакции: количества веществ пропорциональны коэффициентам. n(${formula}) = n(${
        limiting.item.formula
      }) × (${targetItem.coefficient}/${
        limiting.item.coefficient
      }) = ${formatNumber(limiting.amount)} моль × ${formatNumber(
        targetItem.coefficient / limiting.item.coefficient
      )} = ${formatNumber(rounded)} моль`
    );

    return { amount, steps };
  }

  return null;
}

// =====================================================
// Главная функция: количество вещества по уравнению
// =====================================================
export function KolichestvoUravnenie(
  danoRows = [],
  uravneniaRows = [],
  formula,
  findRow,
  options = {}
) {
  const { ignoreYield = false } = options;

  const results = [];
  const errors = [];

  const hasReaction = (uravneniaRows || []).some((row) => {
    const parsed = getParsedReaction(row);

    if (!parsed) return false;

    return [...parsed.left, ...parsed.right].some((i) =>
      sameFormula(i.formula, formula)
    );
  });

  if (!hasReaction) {
    errors.push(
      `Для вещества ${formula}: не найдено уравнение реакции с его участием.`
    );

    return { results, errors };
  }

  const direct = getAmountDirect(danoRows, formula);

  let found = direct;
  let fromReaction = false;

  if (!found) {
    found = getAmountByReaction(
      danoRows,
      uravneniaRows,
      formula,
      new Set(),
      0,
      null,
      ignoreYield
    );
    fromReaction = true;
  }

  // 🔑 Теоретическое количество продукта → практическое через η
  if (found && fromReaction && !ignoreYield) {
    const yRow = findYieldRow(danoRows, formula);
    const eta = parseYieldPercent(yRow);

    if (eta && isProduct(uravneniaRows, formula)) {
      const teorAmount = found.amount;
      const praktAmount = (teorAmount * eta) / 100;

      found = {
        amount: praktAmount,
        steps: [
          ...found.steps,
          `Учтём выход продукта: n(практ) = n(теор) × (η / 100) = ${formatNumber(
            teorAmount
          )} моль × (${formatNumber(eta)} / 100) = ${formatNumber(
            Number(praktAmount.toFixed(4))
          )} моль`,
        ],
      };
    }
  }

  if (!found) {
    errors.push(
      `Для вещества ${formula}: не удалось получить количество вещества ни из «Дано», ни по цепочке уравнений.`
    );

    return { results, errors };
  }

  const rounded = Number(found.amount.toFixed(4));

  results.push({
    id: `kolUravnenie-${formula}`,
    formula,
    amount: rounded,
    amountUnit: 'моль',
    text: found.steps.join('\n'),
  });

  return { results, errors };
}

// =====================================================
// ВЫХОД ПРОДУКТА РЕАКЦИИ
// η = m(практ)/m(теор) × 100% = V(практ)/V(теор) × 100% = n(практ)/n(теор) × 100%
// =====================================================

const MOLAR_VOLUME = 22.4;

function convertMassToGrams(value, unit) {
  const u = normalizeText(unit);
  if (u === 'кг') return value * 1000;
  if (u === 'мг') return value / 1000;
  return value;
}

function convertVolumeToLiters(value, unit) {
  const u = normalizeText(unit);
  if (u === 'мл') return value / 1000;
  if (u === 'м³' || u === 'м3') return value * 1000;
  return value;
}

// Определяем тип величины и находим практическую строку
function findPraktRow(rows) {
  const find = (cond) => [...rows].reverse().find(cond) || null;

  const massRow = find((r) => {
    const char = normalizeText(r.charText);
    return (
      (char.includes('масса вещества') || char.includes('масса практ')) &&
      !char.includes('теорет')
    );
  });
  if (massRow) return { row: massRow, type: 'mass' };

  const volumeRow = find((r) => {
    const char = normalizeText(r.charText);
    return (
      (char.includes('объем вещества') || char.includes('объём вещества') ||
        char.includes('объем практ')) &&
      !char.includes('теорет')
    );
  });
  if (volumeRow) return { row: volumeRow, type: 'volume' };

  const kolRow = find((r) => {
    const char = normalizeText(r.charText);
    return (
      char.includes('количество вещества') &&
      !char.includes('теорет')
    );
  });
  if (kolRow) return { row: kolRow, type: 'amount' };

  return null;
}

function findTeorRow(rows, type) {
  const word =
    type === 'mass' ? 'масса теорет' : type === 'volume' ? 'объем теорет' : 'количество вещества теорет';

  return (
    [...rows]
      .reverse()
      .find((r) => normalizeText(r.charText).includes(word)) || null
  );
}

export function VyxedProdukta(
  danoRows = [],
  uravneniaRows = [],
  formula,
  findRow
) {
  const results = [];
  const errors = [];
  const steps = [];

  const rows = danoRows.filter((r) => sameFormula(r.formula, formula));

  // ===== ШАГ 1. Практическое значение и тип величины =====
  const prakt = findPraktRow(rows);

  if (!prakt) {
    errors.push(
      `Для вещества ${formula}: в «Дано» нет практических данных продукта (масса, объём или количество вещества).`
    );

    return { results, errors };
  }

  const { row: praktRow, type } = prakt;

  const praktValue =
    type === 'mass'
      ? convertMassToGrams(parseNumericValue(praktRow.value), praktRow.izmerenie)
      : type === 'volume'
      ? convertVolumeToLiters(parseNumericValue(praktRow.value), praktRow.izmerenie)
      : parseNumericValue(praktRow.value);

  if (Number.isNaN(praktValue) || praktValue <= 0) {
    errors.push(`Для вещества ${formula}: практическое значение указано некорректно.`);
    return { results, errors };
  }

  const sym = type === 'mass' ? 'm' : type === 'volume' ? 'V' : 'n';
  const unit = type === 'mass' ? 'г' : type === 'volume' ? 'л' : 'моль';

  steps.push(
    `Из условия задачи: ${sym}(практ)(${formula}) = ${formatNumber(praktValue)} ${unit}.`
  );

  // ===== ШАГ 2. Теоретическое значение =====
  let teorValue = null;

  // 2.1. Если теоретическое значение дано прямо в «Дано»
  const teorRow = findTeorRow(rows, type);

  if (teorRow) {
    teorValue =
      type === 'mass'
        ? convertMassToGrams(parseNumericValue(teorRow.value), teorRow.izmerenie)
        : type === 'volume'
        ? convertVolumeToLiters(parseNumericValue(teorRow.value), teorRow.izmerenie)
        : parseNumericValue(teorRow.value);

    steps.push(
      `Из условия задачи: ${sym}(теор)(${formula}) = ${formatNumber(teorValue)} ${unit}.`
    );
  } else {
    // 2.2. Иначе — ТОЛЬКО по уравнению реакции (через реагент),
    //      игнорируя собственные строки продукта
    const teor = getAmountByReaction(
      danoRows,
      uravneniaRows,
      formula,
      new Set(),
      0,
      null,
      true
    );

    if (!teor) {
      errors.push(
        `Для вещества ${formula}: не удалось вычислить теоретическое количество по уравнению реакции.`
      );

      return { results, errors };
    }

    steps.push(...teor.steps);

    const nTeor = teor.amount;

    if (type === 'amount') {
      teorValue = nTeor;
    } else if (type === 'mass') {
      const M = Number(getMolarMass(formula));

      if (Number.isNaN(M) || M <= 0) {
        errors.push(
          `Для вещества ${formula}: молярная масса не найдена в словаре.`
        );

        return { results, errors };
      }

      teorValue = nTeor * M;

      steps.push(
        `Теоретическая масса продукта: m(теор)(${formula}) = n(теор) × M(${formula}) = ${formatNumber(
          nTeor
        )} моль × ${formatNumber(M)} г/моль = ${formatNumber(
          Number(teorValue.toFixed(4))
        )} г`
      );
    } else {
      teorValue = nTeor * MOLAR_VOLUME;

      steps.push(
        `Теоретический объём продукта: V(теор)(${formula}) = n(теор) × Vm = ${formatNumber(
          nTeor
        )} моль × ${formatNumber(MOLAR_VOLUME)} л/моль = ${formatNumber(
          Number(teorValue.toFixed(4))
        )} л`
      );
    }
  }

  if (Number.isNaN(teorValue) || teorValue <= 0) {
    errors.push(`Для вещества ${formula}: теоретическое значение указано некорректно.`);
    return { results, errors };
  }

  // ===== ШАГ 3. η = практ / теор × 100% =====
  const eta = Number(((praktValue / teorValue) * 100).toFixed(4));

  const finalStep = `Вычислим выход продукта по формуле η = ${sym}(практ) / ${sym}(теор) × 100%. η(${formula}) = ${formatNumber(
    praktValue
  )} ${unit} / ${formatNumber(teorValue)} ${unit} × 100% = ${formatNumber(eta)} %`;

  results.push({
    id: `vyxod-${formula}`,
    formula,
    vyxod: eta,
    vyxodUnit: '%',
    text: joinSteps([...steps, finalStep]),
  });

  return { results, errors };
}