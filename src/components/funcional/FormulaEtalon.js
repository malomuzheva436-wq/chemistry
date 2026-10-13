// ===== Разбор формулы в состав: CH3COOH → {C:2, H:4, O:2} =====
export function parseFormulaToCounts(text) {
  const counts = {};
  const regex = /\(([^)]+)\)(\d*)|([A-Z][a-z]?)(\d*)/g;
  let m;

  const add = (symbol, mult) => {
    counts[symbol] = (counts[symbol] || 0) + mult;
  };

  while ((m = regex.exec(String(text))) !== null) {
    if (m[1] !== undefined) {
      // группа в скобках: Ca3(PO4)2
      const inner = parseFormulaToCounts(m[1]);
      const mult = m[2] ? Number(m[2]) : 1;

      for (const [s, c] of Object.entries(inner)) {
        add(s, c * mult);
      }
    } else if (m[3]) {
      add(m[3], m[4] ? Number(m[4]) : 1);
    }
  }

  return counts;
}

// ===== Ключ состава: элементы по алфавиту с индексами =====
export function compositionKey(counts) {
  return Object.keys(counts)
    .sort()
    .map((s) => `${s}${counts[s]}`)
    .join('');
}

// ===== Эталонные записи частых веществ (для красивого вывода) =====
const PRETTY_SOURCE = [
  'CH3COOH', 'HCOOH', 'CH3OH', 'C2H5OH', 'C6H6', 'C7H8',
  'H2O2', 'N2H4', 'C6H12O6', 'H3PO4', 'H2SO4', 'HNO3', 'H2CO3', 'H2SO3',
];

const PRETTY_FORMULAS = {};

for (const key of PRETTY_SOURCE) {
  const counts = parseFormulaToCounts(key);

  if (Object.keys(counts).length > 0) {
    const ck = compositionKey(counts);

    if (!PRETTY_FORMULAS[ck]) {
      PRETTY_FORMULAS[ck] = key;
    }
  }
}

// ===== Названия частых веществ (пополняй по желанию) =====
const SUBSTANCE_NAMES = {
  CH3COOH: 'уксусная кислота',
  HCOOH: 'муравьиная кислота',
  H2O2: 'пероксид водорода',
  H3PO4: 'ортофосфорная кислота',
  H2SO4: 'серная кислота',
  HNO3: 'азотная кислота',
  H2CO3: 'угольная кислота',
  H2SO3: 'сернистая кислота',
  NH3: 'аммиак',
  C6H6: 'бензол',
  C2H5OH: 'этанол',
};

// ===== Запасной порядок элементов (если вещества нет в словаре) =====
const METALS = new Set([
  'Li', 'Na', 'K', 'Rb', 'Cs', 'Ca', 'Mg', 'Ba', 'Sr',
  'Al', 'Fe', 'Cu', 'Zn', 'Ag', 'Pb', 'Mn', 'Cr', 'Ni',
]);

// С этими элементами водород пишется ПОСЛЕДИМ (NH3, PH3, SiH4)
const HYDRIDE_FIRST = new Set(['B', 'Si', 'C', 'N', 'P', 'As']);

function orderElements(symbols) {
  const has = (s) => symbols.includes(s);
  const metals = symbols.filter((s) => METALS.has(s)).sort();
  const rest = symbols.filter((s) => !METALS.has(s));

  // Органика: C, H, остальные по алфавиту, кислород в конце
  if (has('C')) {
    const org = ['C', 'H'].filter((s) => rest.includes(s));
    const others = rest
      .filter((s) => s !== 'C' && s !== 'H' && s !== 'O')
      .sort();
    const tail = has('O') ? ['O'] : [];

    return [...metals, ...org, ...others, ...tail];
  }

  const nonHydride = rest.filter((s) => s !== 'H');
  const hydrideCase =
    has('H') &&
    nonHydride.length > 0 &&
    nonHydride.every((s) => HYDRIDE_FIRST.has(s));

  // Летучие водородные соединения: водород последний
  if (hydrideCase) {
    return [...metals, ...nonHydride.sort(), 'H'];
  }

  // Кислоты и прочее: водород первый, кислород последний
  const others = nonHydride.filter((s) => s !== 'O').sort();
  const tail = has('O') ? ['O'] : [];

  return [...metals, ...(has('H') ? ['H'] : []), ...others, ...tail];
}

export function buildConventionalFormula(counts) {
  return orderElements(Object.keys(counts))
    .map((s) => `${s}${counts[s] === 1 ? '' : counts[s]}`)
    .join('');
}

// ===== Главная функция: привычная запись + название =====
export function prettyFormula(formulaText) {
  const counts = parseFormulaToCounts(formulaText);

  if (Object.keys(counts).length === 0) {
    return { formula: formulaText, name: null };
  }

  const pretty =
    PRETTY_FORMULAS[compositionKey(counts)] ||
    buildConventionalFormula(counts);

  return {
    formula: pretty,
    name: SUBSTANCE_NAMES[pretty] || null,
  };
}