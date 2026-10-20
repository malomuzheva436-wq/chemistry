const ATOMIC_MASSES = {
  H:1, 
  He:4,
  Li:7,
  Be:9,
  B:11,
  C:12,
  N:14,
  O:16,
  F:19,
  Ne:20,
  Na:23,
  Mg:24,
  Al:27,
  Si:28,
  P:31,
  S:32,
  Cl:35.5,
  Ar:40,
  K:39,
  Ca:40,
  Ti:48,
  Cr:52,
  Mn:55,
  Fe:56,
  Co:59,
  Ni:59,
  Cu:64,
  Zn:65,
  As:75,
  Br:80,
  Ag:108,
  Sn:119,
  I:127,
  Ba:137,
  Au:197,
  Hg:201,
  Pb:207,
};

// Металлы — для определения неизвестного металла по молярной массе
const METALS = new Set([
  'Li', 'Na', 'K', 'Rb', 'Be', 'Mg', 'Ca', 'Sr', 'Ba',
  'Al', 'Ga', 'Sc',  'Cr', 'Mn', 'Fe', 'Co', 'Ni',
  'Cu', 'Zn', 'Ag', 'Cd', 'Sn', 'Pb', 'Hg', 'Pt', 'Au',
]);

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

// =====================================================
// Разбор части формулы в состав: Ca(OH)2 → { Ca: 1, O: 2, H: 2 }
// =====================================================
export function parsePartToAtoms(text) {
  if (!/^([A-Z][a-z]?\d*|[([]|[)\]]\d*)+$/.test(text)) return null;

  const stack = [{}];
  const regex = /([A-Z][a-z]?)(\d*)|([([])|([)\]])(\d*)/g;
  let m;

  while ((m = regex.exec(text)) !== null) {
    if (m[1]) {
      const symbol = m[1];

      if (!(symbol in ATOMIC_MASSES)) return null;

      const count = m[2] ? Number(m[2]) : 1;
      const top = stack[stack.length - 1];

      top[symbol] = (top[symbol] || 0) + count;
    } else if (m[3]) {
      stack.push({});
    } else if (m[4]) {
      if (stack.length === 1) return null;

      const mult = m[5] ? Number(m[5]) : 1;
      const inner = stack.pop();
      const top = stack[stack.length - 1];

      for (const [sym, cnt] of Object.entries(inner)) {
        top[sym] = (top[sym] || 0) + cnt * mult;
      }
    }
  }

  if (stack.length !== 1) return null;

  return stack[0];
}

// =====================================================
// Распространённые вещества для подбора по молярной массе.
// Храним ТОЛЬКО формулы — массы вычисляются автоматически.
// Список можно свободно пополнять.
// =====================================================
const CANDIDATE_FORMULAS = [
  // Газы и простые вещества
  'H2', 'He', 'N2', 'O2', 'O3', 'F2', 'Cl2', 'Br2', 'I2',
  'CH4', 'NH3', 'H2O', 'HF', 'HCl', 'H2S', 'PH3', 'SiH4',
  'CO', 'CO2', 'NO', 'NO2', 'N2O', 'SO2', 'SO3',
  'C2H2', 'C2H4', 'C2H6', 'C3H8', 'C4H10', 'C5H12',
  // Кислоты, основания, соли, оксиды
  'H2SO4', 'HNO3', 'H3PO4', 'H2CO3', 'H2SO3', 'CH3COOH',
  'NaOH', 'KOH', 'Ca(OH)2', 'Ba(OH)2',
  'CaO', 'MgO', 'CuO', 'ZnO', 'Fe2O3', 'Al2O3', 'Na2O', 'K2O',
  'NaCl', 'KCl', 'CaCO3', 'Na2CO3', 'K2CO3', 'BaSO4', 'AgNO3',
  'NH4Cl', 'NaNO3', 'KNO3', 'CuSO4', 'ZnSO4',
  // Органика
  'C6H6', 'C7H8', 'C6H12O6', 'C2H5OH', 'CH3OH', 'HCOOH',
];

// =====================================================
// Поиск ВСЕХ веществ с заданной молярной массой
// =====================================================
export function findFormulasByMolarMass(targetMass, tolerance = 1) {
  if (!Number.isFinite(targetMass) || targetMass <= 0) return [];

  const matches = [];

  for (const formula of CANDIDATE_FORMULAS) {
    const M = computeMolarMass(formula);

    if (!Number.isNaN(M) && Math.abs(M - targetMass) <= tolerance) {
      matches.push({ formula, M });
    }
  }

  return matches;
}

// =====================================================
// Вычисление молярной массы по формуле
// Понимает индексы, скобки ( ) и [ ], гидраты (· и *), коэффициенты
// =====================================================
export function computeMolarMass(formula) {
  const raw = String(formula ?? '').trim();

  if (!raw) return NaN;

  const parts = raw.split(/[·*•]/);
  let total = 0;

  for (let part of parts) {
    part = part.trim();

    if (!part) return NaN;

    let coeff = 1;
    const lead = /^(\d+)\s*(.+)$/.exec(part);

    if (lead) {
      coeff = Number(lead[1]);
      part = lead[2];
    }

    const atoms = parsePartToAtoms(part);

    if (!atoms) return NaN;

    let sum = 0;

    for (const [sym, cnt] of Object.entries(atoms)) {
      sum += ATOMIC_MASSES[sym] * cnt;
    }

    total += coeff * sum;
  }

  return total > 0 ? total : NaN;
}

// =====================================================
// Кэш, чтобы не разбирать одну и ту же формулу повторно
// =====================================================
const cache = new Map();

export function getMolarMass(formula) {
  const key = normalizeText(formula);

  if (cache.has(key)) {
    return cache.get(key);
  }

  const value = computeMolarMass(formula);

  cache.set(key, value);

  return value;
}

// =====================================================
// Поиск элемента по молярной массе (для определения металла)
// =====================================================
export function findElementByMolarMass(targetMass, tolerance = 2) {
  if (!Number.isFinite(targetMass) || targetMass <= 0) return null;

  let best = null;
  let bestDiff = Infinity;

  for (const symbol of METALS) {
    const diff = Math.abs(ATOMIC_MASSES[symbol] - targetMass);

    if (diff <= tolerance && diff < bestDiff) {
      best = symbol;
      bestDiff = diff;
    }
  }

  return best;
}