// FormulaFinder.js
// Определение формулы неизвестного вещества:
//  - по массовым долям элементов (с уравнением и без);
//  - по продуктам сгорания (через уравнение);
//  - гомологический ряд алканов CnH2n+2 (три способа);
//  - неизвестный металл Me (в т.ч. с валентностью Me(III));
//  - формула «неизвестно» — поиск только по массовым долям.
// Дополнительно: проверка осуществимости по чётности валентностей,
// уточнение простейшей формулы до молекулярной (через M = m / n)
// и вывод формулы в привычной записи (CH3COOH, H3PO4) с названием.

import { getMolarMass, findElementByMolarMass } from './MolarMass';
import { KolichestvoUravnenie } from './KolichestvoUravnenie';
import { KolichestvoM } from './KolichestvoM';
import { KolichestvoV } from './KolichestvoV';
import { parseReaction } from './Uravnenia';
import { joinSteps } from './VirtualRow';
import { prettyFormula } from './FormulaEtalon';

// =====================================================
// Базовые помощники
// =====================================================
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

// Металл-заглушка с валентностью (MeIII, Me(II)...) равен просто Me
function normalizeMetal(value) {
  const f = String(value ?? '').trim();

  return /^me\(?(vii|vi|iii|iv|ii|i)\)?$/i.test(f) ? 'me' : f;
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
// Валентности для проверки осуществимости формулы
// =====================================================
const VALENCES = {
  H: 1, Li: 1, Na: 1, K: 1, F: 1, Cl: 1, Br: 1, I: 1,
  O: 2, S: 2, Mg: 2, Ca: 2, Ba: 2, Zn: 2, Cu: 2,
  N: 3, P: 3, Al: 3,
  C: 4, Si: 4,
};

function valenceSum(parts) {
  let sum = 0;

  for (const p of parts) {
    const v = VALENCES[p.symbol];

    if (!v) return null;

    sum += v * p.count;
  }

  return sum;
}

// =====================================================
// Приведение отношений к целым числам
// =====================================================
function toIntegers(values) {
  if (values.length === 0) return values;

  const min = Math.min(...values);

  if (min <= 0) return values.map(() => 0);

  const ratios = values.map((v) => v / min);
  const denominators = [1, 2, 3, 4, 5, 6];

  for (const d of denominators) {
    const scaled = ratios.map((r) => r * d);
    const allNearInt = scaled.every(
      (s) => Math.abs(s - Math.round(s)) < 0.1
    );

    if (allNearInt) {
      return scaled.map((s) => Math.round(s));
    }
  }

  return ratios.map((r) => Math.round(r));
}

// =====================================================
// Распознавание типа неизвестной формулы
// =====================================================
function parseFormulaType(formula) {
  const f = String(formula).trim();

  if (/^C[nNхx]H2[nNхx]\+2$/i.test(f)) {
    return { type: 'alkane' };
  }

  if (/^C[xNх].*H[yNх].*Cl[zNх]/i.test(f)) {
    return { type: 'org', atoms: ['C', 'H', 'Cl'] };
  }

  if (/^C[xNх].*H[yNх].*O[zNх]/i.test(f)) {
    return { type: 'org', atoms: ['C', 'H', 'O'] };
  }

  if (/^C[xNх]H[yNх]$/i.test(f)) {
    return { type: 'org', atoms: ['C', 'H'] };
  }

  if (
    /^me(\(?(vii|vi|iii|iv|ii|i)\)?)?$/i.test(f) ||
    /^ме(\(?(vii|vi|iii|iv|ii|i)\)?)?$/i.test(f) ||
    f === 'X'
  ) {
    return { type: 'metal' };
  }

  if (/^(неизвестно|неизв|unknown|\?)$/i.test(f)) {
    return { type: 'unknown' };
  }

  return null;
}

// =====================================================
// Количество вещества для любой формулы
// =====================================================
function getAmount(danoRows, uravneniaRows, formula) {
  const fakeFind = {
    charText: 'Количество вещества',
    formula,
    izmerenie: 'моль',
  };

  const direct =
    [...danoRows]
      .reverse()
      .find(
        (r) =>
          sameFormula(r.formula, formula) &&
          normalizeText(r.charText).includes('количество вещества')
      ) || null;

  if (direct) {
    const n = parseNumericValue(direct.value);

    if (!Number.isNaN(n) && n > 0) {
      return { amount: n, steps: [] };
    }
  }

  const vAns = KolichestvoV(danoRows, formula, fakeFind, null);

  if (vAns.results.length > 0 && Number(vAns.results[0].amount) > 0) {
    return {
      amount: Number(vAns.results[0].amount),
      steps: vAns.results[0].text ? [vAns.results[0].text] : [],
    };
  }

  const mAns = KolichestvoM(danoRows, formula, fakeFind, null);

  if (mAns.results.length > 0 && Number(mAns.results[0].amount) > 0) {
    return {
      amount: Number(mAns.results[0].amount),
      steps: mAns.results[0].text ? [mAns.results[0].text] : [],
    };
  }

  const uAns = KolichestvoUravnenie(danoRows, uravneniaRows, formula, fakeFind);

  if (uAns.results.length > 0 && Number(uAns.results[0].amount) > 0) {
    return {
      amount: Number(uAns.results[0].amount),
      steps: uAns.results[0].text ? uAns.results[0].text.split('\n') : [],
    };
  }

  return null;
}

// =====================================================
// Простейшая формула → молекулярная (через M = m / n)
// =====================================================
function parseEmpiricalFormula(text) {
  const parts = [];
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (!match[0]) {
      regex.lastIndex += 1;
      continue;
    }

    parts.push({
      symbol: match[1],
      count: match[2] ? Number(match[2]) : 1,
    });
  }

  return parts.length > 0 ? parts : null;
}

function refineToMolecular(
  danoRows,
  uravneniaRows,
  formula,
  empiricalFormula
) {
  const extraSteps = [];

  const parts = parseEmpiricalFormula(empiricalFormula);

  if (!parts) {
    return { formula: empiricalFormula, changed: false, extraSteps };
  }

  let mEmp = 0;

  for (const p of parts) {
    const M = Number(getMolarMass(p.symbol));

    if (Number.isNaN(M) || M <= 0) {
      return { formula: empiricalFormula, changed: false, extraSteps };
    }

    mEmp += M * p.count;
  }

  const massRow =
    [...danoRows]
      .reverse()
      .find(
        (r) =>
          sameFormula(r.formula, formula) &&
          normalizeText(r.charText).includes('масса вещества')
      ) || null;

  if (!massRow) {
    return { formula: empiricalFormula, changed: false, extraSteps };
  }

  const nAns = getAmount(danoRows, uravneniaRows, formula);

  if (!nAns || !(nAns.amount > 0)) {
    return { formula: empiricalFormula, changed: false, extraSteps };
  }

  const mass = parseNumericValue(massRow.value);

  if (Number.isNaN(mass) || mass <= 0) {
    return { formula: empiricalFormula, changed: false, extraSteps };
  }

  extraSteps.push(...nAns.steps);

  const mTrue = mass / nAns.amount;
  const k = Math.round(mTrue / mEmp);

  extraSteps.push(
    `Вычислим молярную массу вещества: M = m / n = ${formatNumber(
      mass
    )} г / ${formatNumber(nAns.amount)} моль = ${formatNumber(
      Number(mTrue.toFixed(2))
    )} г/моль. M(простейшей формулы ${empiricalFormula}) = ${formatNumber(
      Number(mEmp.toFixed(2))
    )} г/моль. Множитель k = ${formatNumber(
      Number(mTrue.toFixed(2))
    )} / ${formatNumber(Number(mEmp.toFixed(2)))} = ${k}.`
  );

  if (k <= 1) {
    return { formula: empiricalFormula, changed: false, extraSteps };
  }

  const molecular = parts
    .map((p) => `${p.symbol}${p.count * k === 1 ? '' : p.count * k}`)
    .join('');

  return { formula: molecular, changed: true, extraSteps };
}

// =====================================================
// Красивый финальный шаг с формулой и названием
// =====================================================
function pushFormulaResult(results, steps, rawFormula, formula, label) {
  const pretty = prettyFormula(rawFormula);
  const nameSuffix = pretty.name ? ` (${pretty.name})` : '';

  const finalStep = `${label} ${pretty.formula}${nameSuffix}.`;

  results.push({
    id: `formula-${formula}`,
    formula: pretty.formula,
    formulaText: pretty.formula,
    text: joinSteps([...steps, finalStep]),
  });
}

// =====================================================
// Помощники для ветки металла
// =====================================================
const CHARGE = {
  O: 2, S: 2, Cl: 1, Br: 1, I: 1, F: 1,
  N: 3, C: 4, H: 1,
  SO4: 2, SO3: 2, NO3: 1, PO4: 3, CO3: 2, OH: 1,
};

const NONMETAL_MOL = {
  O: 'O2', S: 'S', Cl: 'Cl2', Br: 'Br2', I: 'I2', F: 'F2',
  N: 'N2', C: 'C', H: 'H2',
};

const NONMETAL_ATOMS = {
  O: 2, S: 1, Cl: 2, Br: 2, I: 2, F: 2,
  N: 2, C: 1, H: 2,
};

const ACID_RESIDUES = {
  SO4: 'H2SO4',
  SO3: 'H2SO3',
  NO3: 'HNO3',
  PO4: 'H3PO4',
  CO3: 'H2CO3',
};

const KNOWN_GROUPS = [
  'SO4', 'SO3', 'NO3', 'PO4', 'CO3', 'OH',
  'O', 'S', 'C', 'N', 'H', 'Cl', 'Br', 'I', 'F',
];

const NONMETAL_VAL = {
  O: 2, Cl: 1, S: 2, F: 1, Br: 1, I: 1, N: 3, C: 4, H: 1,
};

const ROMAN_TO_NUM = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

function gcd(...nums) {
  const g = (x, y) => (y === 0 ? x : g(y, x % y));

  return nums.reduce((acc, n) => g(acc, n));
}

const coef = (n) => (n === 1 ? '' : n);

// ===== Состав соединения металла: Me2(SO4)3 → { a: 2, X: 'SO4', b: 3 } =====
function parseMetalCompound(formula) {
  const m = /^Me(?:\(?(?:VII|VI|III|IV|II|I)\)?)?(\d*)(\([^)]+\)|[A-Z][a-z]?)(\d*)$/i.exec(
    String(formula).trim()
  );

  if (!m || !m[2]) return null;

  let raw = m[2];

  if (raw.startsWith('(')) {
    raw = raw.slice(1, -1);
  }

  const known = KNOWN_GROUPS.find(
    (k) => k.toLowerCase() === raw.toLowerCase()
  );

  let X;

  if (known) {
    X = known;
  } else if (raw.length <= 2) {
    X = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  } else {
    return null;
  }

  return {
    a: m[1] ? Number(m[1]) : 1,
    X,
    b: m[3] ? Number(m[3]) : 1,
  };
}

// ===== Молярная масса группы (элемента или SO4, NO3...) =====
function getGroupMass(group) {
  const counts = {};
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let m;

  while ((m = regex.exec(group)) !== null) {
    const sym = m[1];
    const cnt = m[2] ? Number(m[2]) : 1;

    counts[sym] = (counts[sym] || 0) + cnt;
  }

  let sum = 0;

  for (const [el, cnt] of Object.entries(counts)) {
    const M = Number(getMolarMass(el));

    if (Number.isNaN(M) || M <= 0) return NaN;

    sum += M * cnt;
  }

  return sum;
}

// ===== Конструктор уравнения: Me + неметалл ИЛИ Me + кислота =====
function buildMetalReaction(comp, originalFormula) {
  const { a, X, b } = comp;

  // ----- Соль с кислотным остатком: Me + кислота → соль + H2 -----
  if (ACID_RESIDUES[X]) {
    const r = CHARGE[X];

    let x = 2 * a;
    let y = 2 * b;
    let z = 2;
    let w = r * b;

    const d = gcd(x, y, z, w);

    x /= d;
    y /= d;
    z /= d;
    w /= d;

    return {
      leftText: `${coef(x)}Me + ${coef(y)}${ACID_RESIDUES[X]}`,
      rightText: `${coef(z)}${originalFormula} + ${coef(w)}H2`,
      meCoeff: x,
      otherCoeff: y,
      mol: ACID_RESIDUES[X],
      kind: 'acid',
    };
  }

  // ----- Бинарное соединение с неметаллом -----
  const k = NONMETAL_ATOMS[X];
  const mol = NONMETAL_MOL[X];

  if (!k || !mol) return null;

  let x = a * k;
  let y = b;
  let z = k;

  const d = gcd(x, y, z);

  x /= d;
  y /= d;
  z /= d;

  return {
    leftText: `${coef(x)}Me + ${coef(y)}${mol}`,
    rightText: `${coef(z)}${originalFormula}`,
    meCoeff: x,
    otherCoeff: y,
    mol,
    kind: 'nonmetal',
  };
}

// ===== Конкретное уравнение сгорания алкана CxHy =====
function alkaneCombustionReaction(x, y) {
  let c1 = 1;
  let c2 = (4 * x + y) / 4;
  let c3 = x;
  let c4 = y / 2;

  if (!Number.isInteger(c2) || !Number.isInteger(c4)) {
    c1 = 2;
    c2 = (4 * x + y) / 2;
    c3 = 2 * x;
    c4 = y;
  }

  if (!Number.isInteger(c2) || !Number.isInteger(c4)) {
    c1 = 4;
    c2 = 4 * x + y;
    c3 = 4 * x;
    c4 = 2 * y;
  }

  return {
    leftText: `${c1 === 1 ? '' : c1}C${x}H${y} + ${c2 === 1 ? '' : c2}O2`,
    rightText: `${c3 === 1 ? '' : c3}CO2 + ${c4 === 1 ? '' : c4}H2O`,
  };
}

// =====================================================
// Определение формулы ПО МАССОВЫМ ДОЛЯМ (без уравнения)
// =====================================================
function solveByMassFractions(danoRows, uravneniaRows, parsed, formula) {
  const results = [];
  const errors = [];
  const steps = [];

  const atoms = parsed.atoms;

  const fractions = {};
  let sum = 0;
  const givenAtoms = [];

  for (const a of atoms) {
    const row =
      [...danoRows]
        .reverse()
        .find(
          (r) =>
            sameFormula(r.formula, a) &&
            normalizeText(r.charText).includes('массовая доля')
        ) || null;

    if (row) {
      const w = parseNumericValue(row.value);

      if (!Number.isNaN(w) && w > 0) {
        fractions[a] = w;
        sum += w;
        givenAtoms.push(a);
      }
    }
  }

  if (givenAtoms.length === 0) return null;

  const missing = atoms.filter((a) => !(a in fractions));

  if (missing.length === 1) {
    const rest = 100 - sum;

    if (rest <= 0.0001) {
      errors.push(
        `Для вещества ${formula}: суммы массовых долей уже дают 100%, на ${missing[0]} ничего не остаётся.`
      );

      return { results, errors };
    }

    fractions[missing[0]] = rest;

    steps.push(
      `Вычислим массовую долю ${missing[0]}: ω(${missing[0]}) = 100% − ${givenAtoms
        .map((a) => `ω(${a})`)
        .join(' − ')} = 100% − ${givenAtoms
        .map((a) => `${formatNumber(fractions[a])}%`)
        .join(' − ')} = ${formatNumber(rest)}%.`
    );
  } else if (missing.length > 1) {
    errors.push(
      `Для вещества ${formula}: не хватает массовых долей для элементов ${missing.join(
        ', '
      )} (неизвестных больше одного, остатком до 100% их не разделить).`
    );

    return { results, errors };
  }

  const values = [];
  const symbols = [];

  for (const a of atoms) {
    const M = Number(getMolarMass(a));

    if (Number.isNaN(M) || M <= 0) {
      errors.push(
        `Для элемента ${a}: не удалось вычислить молярную массу. Проверьте, что формула записана правильно и элемент есть в таблице атомных масс.`
      );

      return { results, errors };
    }

    values.push(fractions[a] / M);
    symbols.push(a);
  }

  const rawRatios = values.map((v) => Number(v.toFixed(4)));

  steps.push(
    `Найдём отношение количеств атомов: ${symbols
      .map((s) => `n(${s})`)
      .join(' : ')} = ${symbols
      .map((s) => `ω(${s}) / M(${s})`)
      .join(' : ')} = ${symbols
      .map(
        (s, i) =>
          `${formatNumber(fractions[s])} / ${formatNumber(
            Number(getMolarMass(s))
          )}`
      )
      .join(' : ')} = ${rawRatios.map((v) => formatNumber(v)).join(' : ')}.`
  );

  const min = Math.min(...values);
  const byMin = values.map((v) => Number((v / min).toFixed(4)));
  const ints = toIntegers(values);

  steps.push(
    `Приведём отношение к целым числам: ${rawRatios
      .map((v) => formatNumber(v))
      .join(' : ')} = ${byMin.map((v) => formatNumber(v)).join(' : ')} = ${ints
      .map((v) => v)
      .join(' : ')}.`
  );

  const resultFormula = symbols
    .map((s, i) => `${s}${ints[i] === 1 ? '' : ints[i]}`)
    .join('');

  const refine = refineToMolecular(
    danoRows,
    uravneniaRows,
    formula,
    resultFormula
  );

  steps.push(...refine.extraSteps);

  pushFormulaResult(
    results,
    steps,
    refine.formula,
    formula,
    refine.changed ? 'Молекулярная формула вещества:' : 'Формула вещества:'
  );

  return { results, errors };
}

// =====================================================
// ГЛАВНАЯ ФУНКЦИЯ
// =====================================================
export function FormulaFinder(
  danoRows = [],
  uravneniaRows = [],
  formula,
  findRow
) {
  const results = [];
  const errors = [];
  const steps = [];

  const parsed = parseFormulaType(formula);

  if (!parsed) {
    errors.push(
      `Неизвестный тип формулы «${formula}». Поддерживаются: CxHy, CxHyOz, CxHyClz, CnH2n+2, Me (в т.ч. MeII, Me(III)), «неизвестно».`
    );

    return { results, errors };
  }

  // ===================================================
  // СЛУЧАЙ 0. Формула НЕИЗВЕСТНА: только массовые доли
  // ===================================================
  if (parsed.type === 'unknown') {
    const fractionRows = danoRows.filter((r) =>
      normalizeText(r.charText).includes('массовая доля')
    );

    if (fractionRows.length < 2) {
      errors.push(
        `Для поиска неизвестной формулы нужны массовые доли хотя бы двух элементов в «Дано».`
      );

      return { results, errors };
    }

    const symbols = [];
    const values = [];

    for (const row of fractionRows) {
      const w = parseNumericValue(row.value);
      const M = Number(getMolarMass(row.formula));

      if (Number.isNaN(w) || w <= 0) {
        errors.push(
          `Массовая доля элемента ${row.formula} указана некорректно.`
        );

        return { results, errors };
      }

      if (Number.isNaN(M) || M <= 0) {
        errors.push(
          `Для элемента ${row.formula}: не удалось вычислить молярную массу. Проверьте, что формула записана правильно и элемент есть в таблице атомных масс.`
        );

        return { results, errors };
      }

      symbols.push(row.formula);
      values.push(w / M);
    }

    steps.push(
      `Найдём отношения количеств атомов: ${symbols
        .map(
          (s, i) =>
            `n(${s}) = ω(${s}) / M(${s}) = ${formatNumber(
              parseNumericValue(fractionRows[i].value)
            )} / ${formatNumber(Number(getMolarMass(s)))} = ${formatNumber(
              Number(values[i].toFixed(4))
            )}`
        )
        .join('; ')}.`
    );

    const min = Math.min(...values);
    const byMin = values.map((v) => Number((v / min).toFixed(4)));
    const ints = toIntegers(values);

    steps.push(
      `Разделим всё на наименьшее значение: ${byMin
        .map((v) => formatNumber(v))
        .join(' : ')} = ${ints.join(' : ')}.`
    );

    let parts = symbols.map((s, i) => ({ symbol: s, count: ints[i] }));

    const empirical = parts
      .map((p) => `${p.symbol}${p.count === 1 ? '' : p.count}`)
      .join('');

    const MEmp = Number(getMolarMass(empirical));
    const isKnown = Number.isFinite(MEmp) && MEmp > 0;

    if (!isKnown) {
      const vSum = valenceSum(parts);

      if (vSum !== null && vSum % 2 !== 0) {
        parts = parts.map((p) => ({ ...p, count: p.count * 2 }));

        steps.push(
          `Проверка: вещества ${empirical} нет в списке известных, и сумма валентностей равна ${vSum} — нечётное число, такого вещества не существует. Умножаем индексы на 2.`
        );
      }
    }

    const rawFormula = parts
      .map((p) => `${p.symbol}${p.count === 1 ? '' : p.count}`)
      .join('');

    const refine = refineToMolecular(
      danoRows,
      uravneniaRows,
      formula,
      rawFormula
    );

    steps.push(...refine.extraSteps);

    pushFormulaResult(
      results,
      steps,
      refine.formula,
      formula,
      refine.changed ? 'Молекулярная формула вещества:' : 'Формула вещества:'
    );

    return { results, errors };
  }

  // ===================================================
  // СЛУЧАЙ 1. Алкан CnH2n+2 — четыре способа
  // ===================================================
  if (parsed.type === 'alkane') {
    if (
      danoRows.some((r) => normalizeText(r.charText).includes('массовая доля'))
    ) {
      const frac = solveByMassFractions(
        danoRows,
        uravneniaRows,
        { atoms: ['C', 'H'] },
        formula
      );

      if (frac && frac.errors.length > 0 && frac.results.length === 0) {
        return frac;
      }

      if (frac && frac.results.length > 0) {
        const empirical = frac.results[0].formulaText;
        const m = String(empirical).match(/^C(\d+)H(\d+)$/i);

        if (!m) {
          return {
            results: [],
            errors: [
              `Для вещества ${formula}: не удалось разобрать полученную формулу ${empirical}.`,
            ],
          };
        }

        const x = Number(m[1]);
        const y = Number(m[2]);

        if (y !== 2 * x + 2) {
          return {
            results: [],
            errors: [
              `Полученная формула ${empirical} не соответствует ряду алканов CnH2n+2 (должно выполняться y = 2n + 2).`,
            ],
          };
        }

        const extraStep = `Полученная формула соответствует гомологическому ряду алканов CnH2n+2 при n = ${x}.`;
        const disc = alkaneCombustionReaction(x, y);
        const eqStep = `Горение алкана идёт по уравнению: ${disc.leftText} → ${disc.rightText}.`;

        return {
          results: [
            {
              ...frac.results[0],
              text: joinSteps([frac.results[0].text, extraStep, eqStep]),
            },
          ],
          errors: frac.errors,
          discoveredReaction: disc,
        };
      }
    }

    const massRow =
      [...danoRows]
        .reverse()
        .find(
          (r) =>
            sameFormula(r.formula, formula) &&
            normalizeText(r.charText).includes('масса вещества')
        ) || null;

    const mass = massRow ? parseNumericValue(massRow.value) : NaN;
    const co2 = getAmount(danoRows, uravneniaRows, 'CO2');
    const h2o = getAmount(danoRows, uravneniaRows, 'H2O');

    const MAns =
      massRow && !Number.isNaN(mass) && mass > 0
        ? getAmount(danoRows, uravneniaRows, formula)
        : null;

    if (MAns && MAns.amount > 0) {
      if (MAns.steps.length > 0) steps.push(...MAns.steps);

      const M = mass / MAns.amount;
      const n = Math.round((M - 2) / 14);

      if (n >= 1 && n <= 20) {
        steps.push(
          `Вычислим молярную массу алкана: M = m / n = ${formatNumber(
            mass
          )} г / ${formatNumber(MAns.amount)} моль = ${formatNumber(
            Number(M.toFixed(2))
          )} г/моль.`
        );

        steps.push(
          `Молярная масса алкана: M = 14n + 2. Найдём n: n = (M − 2) / 14 = (${formatNumber(
            Number(M.toFixed(2))
          )} − 2) / 14 = ${n}.`
        );

        const disc = alkaneCombustionReaction(n, 2 * n + 2);

        steps.push(
          `Горение алкана идёт по уравнению: ${disc.leftText} → ${disc.rightText}.`
        );

        pushFormulaResult(
          results,
          steps,
          `C${n}H${2 * n + 2}`,
          formula,
          'Формула алкана:'
        );

        return {
          results,
          errors,
          discoveredReaction: disc,
        };
      }
    }

    if (co2 && h2o) {
      steps.push(
        `Горение алканов идёт по общему уравнению. CnH2n+2 + (3n+1)/2 O2 → n CO2 + (n+1) H2O`
      );
      if (co2.steps.length > 0) steps.push(...co2.steps);
      if (h2o.steps.length > 0) steps.push(...h2o.steps);

      const nC = co2.amount;
      const nH = h2o.amount * 2;

      steps.push(
        `Вычислим количества атомов: n(C) = n(CO₂) = ${formatNumber(
          nC
        )} моль; n(H) = 2 × n(H₂O) = ${formatNumber(nH)} моль.`
      );

      const ints = toIntegers([nC, nH]);
      const x = ints[0];
      const y = ints[1];

      steps.push(
        `Отношение атомов: C : H = ${formatNumber(nC)} : ${formatNumber(
          nH
        )} = ${x} : ${y}.`
      );

      if (y !== 2 * x + 2) {
        errors.push(
          `Полученное отношение C : H = ${x} : ${y} не соответствует ряду алканов CnH2n+2.`
        );

        return { results, errors };
      }

      const disc = alkaneCombustionReaction(x, y);

      steps.push(
        `Подставим найденное n = ${x} в общее уравнение. ${disc.leftText} → ${disc.rightText}.`
      );

      pushFormulaResult(
        results,
        steps,
        `C${x}H${y}`,
        formula,
        'Формула алкана:'
      );

      return {
        results,
        errors,
        discoveredReaction: disc,
      };
    }

    if (!Number.isNaN(mass) && mass > 0 && (co2 || h2o)) {
      steps.push(
        `Горение алканов идёт по общему уравнению. CnH2n+2 + (3n+1)/2 O2 → n CO2 + (n+1) H2O`
      );
      let amountAlkane = null;
      let n = null;

      if (co2) {
        const nC = co2.amount;

        if (co2.steps.length > 0) steps.push(...co2.steps);

        amountAlkane = (mass - 14 * nC) / 2;

        steps.push(
          `Для алкана CnH2n+2: m = n(алкана) × (14n + 2) и n(C) = n(алкана) × n, поэтому m = 14 × n(C) + 2 × n(алкана). Найдём количество алкана: n(алкана) = (m − 14 × n(C)) / 2 = (${formatNumber(
            mass
          )} − 14 × ${formatNumber(nC)}) / 2 = ${formatNumber(
            Number(amountAlkane.toFixed(4))
          )} моль.`
        );

        if (amountAlkane > 1e-9) {
          n = nC / amountAlkane;
        }
      } else {
        const nH = h2o.amount * 2;

        if (h2o.steps.length > 0) steps.push(...h2o.steps);

        amountAlkane = (7 * nH - mass) / 12;

        steps.push(
          `Для алкана CnH2n+2: n(H) = n(алкана) × (2n + 2) и m = n(алкана) × (14n + 2), поэтому 7 × n(H) = m + 12 × n(алкана). Найдём количество алкана: n(алкана) = (7 × n(H) − m) / 12 = (7 × ${formatNumber(
            nH
          )} − ${formatNumber(mass)}) / 12 = ${formatNumber(
            Number(amountAlkane.toFixed(4))
          )} моль.`
        );

        if (amountAlkane > 1e-9) {
          n = (nH / amountAlkane - 2) / 2;
        }
      }

      if (amountAlkane > 1e-9 && n !== null) {
        const nInt = Math.round(n);
        const disc = alkaneCombustionReaction(nInt, 2 * nInt + 2);

        steps.push(
          `Подставим найденное n = ${nInt} в общее уравнение. ${disc.leftText} → ${disc.rightText}.`
        );

        if (Math.abs(n - nInt) < 0.05 && nInt >= 1 && nInt <= 20) {
          steps.push(
            `Найдём n: n = ${formatNumber(Number(n.toFixed(4)))} ≈ ${nInt}.`
          );

          pushFormulaResult(
            results,
            steps,
            `C${nInt}H${2 * nInt + 2}`,
            formula,
            'Формула алкана:'
          );

          return {
            results,
            errors,
            discoveredReaction: disc,
          };
        }
      }
    }

    errors.push(
      `Для алкана CnH2n+2 недостаточно данных: нужны массовые доли элементов, либо масса и объём/количество алкана, либо продукты сгорания CO₂ и H₂O, либо масса алкана вместе с одним из продуктов сгорания.`
    );

    return { results, errors };
  }

  // ===================================================
  // СЛУЧАЙ 2. Неизвестный металл Me (в т.ч. с валентностью)
  // Уравнение реакции программа строит САМА по составу
  // соединения из «Дано» — ручное уравнение не нужно
  // ===================================================
  if (parsed.type === 'metal') {
    // ----- Масса металла -----
    const massRow =
      [...danoRows]
        .reverse()
        .find(
          (r) =>
            sameFormula(r.formula, formula) &&
            normalizeText(r.charText).includes('масса вещества')
        ) || null;

    if (!massRow) {
      errors.push(
        `Для определения металла нужна масса вещества ${formula} в «Дано».`
      );

      return { results, errors };
    }

    const mMe = parseNumericValue(massRow.value);

    if (Number.isNaN(mMe) || mMe <= 0) {
      errors.push(`Масса металла указана некорректно.`);

      return { results, errors };
    }

    // ----- Соединение металла (оксид, соль) из «Дано» -----
    const isMetalCompound = (f) => {
      const nm = normalizeMetal(normalizeText(f));

      return nm.startsWith('me') && nm !== 'me';
    };

    const compoundRow =
      [...danoRows]
        .reverse()
        .find(
          (r) =>
            normalizeText(r.charText).includes('масса вещества') &&
            isMetalCompound(r.formula)
        ) || null;

    if (!compoundRow) {
      errors.push(
        `Для определения металла нужна масса соединения металла (оксида, соли), например Me2O3, Me2(SO4)3, MeCl3, — по его составу программа построит уравнение реакции сама.`
      );

      return { results, errors };
    }

    const comp = parseMetalCompound(compoundRow.formula);
    const built = comp
      ? buildMetalReaction(comp, compoundRow.formula)
      : null;

    if (!comp || !built) {
      errors.push(
        `Не удалось разобрать состав соединения ${compoundRow.formula}, чтобы построить уравнение реакции.`
      );

      return { results, errors };
    }

    // ----- Валентность из состава соединения -----
    const v = (comp.b * (NONMETAL_VAL[comp.X] || CHARGE[comp.X] || 0)) / comp.a;

    const askedRoman = /^me\(?(vii|vi|iii|iv|ii|i)\)?$/i.exec(
      normalizeText(formula)
    );

    if (askedRoman && ROMAN_TO_NUM[askedRoman[1]] !== v) {
      errors.push(
        `Валентность в «Найти» (${askedRoman[1].toUpperCase()}) не совпадает с валентностью по составу ${compoundRow.formula} (${v}).`
      );

      return { results, errors };
    }

    steps.push(
      `По составу соединения ${compoundRow.formula} определяем валентность металла: ${v}. Уравнение реакции: ${built.leftText} → ${built.rightText}.`
    );

    // ----- Масса элемента или кислотного остатка в соединении -----
    const groupMass = getGroupMass(comp.X);

    if (Number.isNaN(groupMass) || groupMass <= 0) {
      errors.push(
        `Не удалось определить молярную массу группы ${comp.X} `
      );

      return { results, errors };
    }

    const mComp = parseNumericValue(compoundRow.value);

    if (Number.isNaN(mComp) || mComp <= 0 || mComp <= mMe) {
      errors.push(
        `Масса ${compoundRow.formula} должна быть больше массы металла.`
      );

      return { results, errors };
    }

    const mX = mComp - mMe;

    steps.push(
      `По массе соединения и массе металла найдём массу ${
        ACID_RESIDUES[comp.X] ? 'кислотного остатка' : 'неметалла'
      } ${comp.X}: m(${comp.X}) = m(${compoundRow.formula}) − m(Me) = ${formatNumber(mComp)} г − ${formatNumber(mMe)} г = ${formatNumber(Number(mX.toFixed(4)))} г.`
    );

    const nX = mX / groupMass;

    steps.push(
      `Вычислим количество ${comp.X}: n = m / M = ${formatNumber(Number(mX.toFixed(4)))} г / ${formatNumber(Number(groupMass.toFixed(2)))} г/моль = ${formatNumber(Number(nX.toFixed(4)))} моль`
    );

    const nMe = (nX * comp.a) / comp.b;

    steps.push(
      `По формуле соединения ${compoundRow.formula}: n(Me) = n(${comp.X}) × (${comp.a}/${comp.b}) = ${formatNumber(Number(nX.toFixed(4)))} моль × ${formatNumber(Number((comp.a / comp.b).toFixed(4)))} = ${formatNumber(Number(nMe.toFixed(4)))} моль`
    );

    // ----- Молярная масса и определение элемента -----
    const M = mMe / nMe;

    steps.push(
      `Вычислим молярную массу металла: M(Me) = m(Me) / n(Me) = ${formatNumber(mMe)} г / ${formatNumber(Number(nMe.toFixed(4)))} моль = ${formatNumber(Number(M.toFixed(2)))} г/моль.`
    );

    const metalName = findElementByMolarMass(M);

    if (!metalName) {
      errors.push(
        `Не удалось найти металл с молярной массой ≈ ${formatNumber(Number(M.toFixed(2)))} г/моль.`
      );

      return { results, errors };
    }

    steps.push(`По молярной массе определяем металл: Me = ${metalName}.`);

    // ----- Подставляем найденный металл в уравнение -----
    const concreteLeft = built.leftText.replace(/Me/g, metalName);
    const concreteRight = built.rightText.replace(/Me/g, metalName);

    steps.push(
      `Реакция с найденным металлом: ${concreteLeft} → ${concreteRight}.`
    );

    results.push({
      id: `formula-${formula}`,
      formula: metalName,
      formulaText: metalName,
      text: joinSteps(steps),
    });

    return {
      results,
      errors,
      discoveredReaction: {
        leftText: concreteLeft,
        rightText: concreteRight,
      },
    };
  }

  // ===================================================
  // СЛУЧАЙ 3. Органика: сначала массовые доли...
  // ===================================================
  if (
    danoRows.some((r) => normalizeText(r.charText).includes('массовая доля'))
  ) {
    const fractionAnswer = solveByMassFractions(
      danoRows,
      uravneniaRows,
      parsed,
      formula
    );

    if (fractionAnswer) {
      return fractionAnswer;
    }
  }

  // ===================================================
  // ...затем продукты сгорания (через уравнение)
  // ===================================================
  let reaction = null;

  for (const row of uravneniaRows) {
    const p = getParsedReaction(row);

    if (!p) continue;

    const hasUnknown = [...p.left, ...p.right].some((i) =>
      sameFormula(i.formula, formula)
    );

    if (hasUnknown) {
      reaction = p;
      break;
    }
  }

  if (!reaction) {
    errors.push(
      `Для вещества ${formula}: не найдено уравнение реакции (обычно горение) с его участием.`
    );

    return { results, errors };
  }

  const co2 = getAmount(danoRows, uravneniaRows, 'CO2');

  if (!co2) {
    errors.push(
      `Для определения формулы органического вещества нужны данные по CO₂ (продукт горения).`
    );

    return { results, errors };
  }

  const nC = co2.amount;

  if (co2.steps.length > 0) steps.push(...co2.steps);

  steps.push(
    `Вычислим количество атомов углерода: n(C) = n(CO₂) = ${formatNumber(nC)} моль.`
  );

  let nH = 0;
  const h2o = getAmount(danoRows, uravneniaRows, 'H2O');

  if (h2o) {
    nH = h2o.amount * 2;

    if (h2o.steps.length > 0) steps.push(...h2o.steps);

    steps.push(
      `Вычислим количество атомов водорода: n(H) = 2 × n(H₂O) = 2 × ${formatNumber(h2o.amount)} моль = ${formatNumber(nH)} моль.`
    );
  }

  let nCl = 0;

  if (parsed.atoms.includes('Cl')) {
    const hcl = getAmount(danoRows, uravneniaRows, 'HCl');

    if (hcl) {
      nCl = hcl.amount;

      if (hcl.steps.length > 0) steps.push(...hcl.steps);

      steps.push(
        `Вычислим количество атомов хлора: n(Cl) = n(HCl) = ${formatNumber(nCl)} моль.`
      );
    }
  }

  let nO = 0;

  if (parsed.atoms.includes('O')) {
    const massRow =
      [...danoRows]
        .reverse()
        .find(
          (r) =>
            sameFormula(r.formula, formula) &&
            normalizeText(r.charText).includes('масса вещества')
        ) || null;

    if (!massRow) {
      errors.push(
        `Для нахождения кислорода в органическом веществе нужна его масса в «Дано».`
      );

      return { results, errors };
    }

    const mOrg = parseNumericValue(massRow.value);

    if (Number.isNaN(mOrg) || mOrg <= 0) {
      errors.push(`Масса органического вещества указана некорректно.`);

      return { results, errors };
    }

    const mC = nC * 12;
    const mH = nH * 1;
    const mCl = nCl * 35.5;
    const mO = mOrg - mC - mH - mCl;

    steps.push(
      `Вычислим массу кислорода в веществе: m(O) = m(вещества) − m(C) − m(H) = ${formatNumber(mOrg)} г − ${formatNumber(mC)} г − ${formatNumber(mH)} г = ${formatNumber(Number(mO.toFixed(4)))} г.`
    );

    if (mO < -0.0001) {
      errors.push(
        `Получена отрицательная масса кислорода (${formatNumber(mO)} г) — проверьте исходные данные.`
      );

      return { results, errors };
    }

    nO = Math.max(0, mO) / 16;

    steps.push(
      `Вычислим количество атомов кислорода: n(O) = m(O) / M(O) = ${formatNumber(Number(mO.toFixed(4)))} г / 16 г/моль = ${formatNumber(Number(nO.toFixed(4)))} моль.`
    );
  }

  const values = [];
  const symbols = [];

  for (const pair of [
    ['C', nC],
    ['H', nH],
    ['O', nO],
    ['Cl', nCl],
  ]) {
    if (parsed.atoms.includes(pair[0])) {
      symbols.push(pair[0]);
      values.push(pair[1]);
    }
  }

  const ints = toIntegers(values);

  steps.push(
    `Найдём соотношение атомов: ${symbols
      .map((s, i) => `${s} : ${formatNumber(values[i])}`)
      .join(' ; ')} → ${symbols
      .map((s, i) => `${s} : ${ints[i]}`)
      .join(' : ')}.`
  );

  const resultFormula = symbols
    .map((s, i) => `${s}${ints[i] === 1 ? '' : ints[i]}`)
    .join('');

  const refine = refineToMolecular(
    danoRows,
    uravneniaRows,
    formula,
    resultFormula
  );

  steps.push(...refine.extraSteps);

  pushFormulaResult(
    results,
    steps,
    refine.formula,
    formula,
    refine.changed
      ? 'Молекулярная формула вещества:'
      : 'Простейшая (эмпирическая) формула вещества:'
  );

  return { results, errors };
}