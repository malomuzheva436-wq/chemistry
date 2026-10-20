// ExchangeReaction.js
// Автоматическое составление реакций обмена по таблице растворимости:
// AB + CD → AD(↓/↑/H2O) + CB

import { parsePartToAtoms } from './MolarMass';

// =====================================================
// Справочник ионов
// =====================================================
const CATIONS = new Set([
  'H', 'Li', 'Na', 'K','NH4', 'Ag','Ca', 'Ba', 'Sr', 'Mg', 'Zn', 'Cu', 'Pb', 'Ni', 
  'Mn', 'Fe','Al', 'Cr','Hg','Sn',
]);

const ANIONS = {
  OH: 1, F: 1, Cl: 1, Br: 1, I: 1, NO3: 1, ClO4: 1, ClO3: 1,
  CH3COO: 1, HCO3: 1, HSO4: 1, NO2: 1,
  SO4: 2, SO3: 2, CO3: 2, S: 2, SiO3: 2,
  PO4: 3,
};

const ALKALI = new Set(['Li', 'Na', 'K', 'Rb', 'Cs', 'NH4']);

// =====================================================
// Разбор электролита на катион и анион: Fe2(SO4)3 → Fe(3+) + SO4(2-)
// =====================================================
export function parseElectrolyte(formula) {
  const raw = String(formula ?? '').trim();

  if (!raw) return null;

  // Уксусная кислота и ацетаты, записанные «анионом вперёд»
  if (raw.startsWith('CH3COO')) {
    const rest = raw.slice(6);
    const m = /^([A-Z][a-z]?)(\d*)$/.exec(rest);

    if (!m || !(m[1] in CATIONS)) return null;

    return { cat: m[1], catIdx: 1, an: 'CH3COO', anIdx: 1, catCharge: 1, anCharge: 1 };
  }

  // Катион в начале
  let cat = null;
  let catIdx = 1;
  let rest = raw;

  if (raw.startsWith('NH4')) {
    cat = 'NH4';
    rest = raw.slice(3);
  } else {
    const m = /^([A-Z][a-z]?)(\d*)/.exec(raw);

    if (!m) return null;

    cat = m[1];
    catIdx = m[2] ? Number(m[2]) : 1;
    rest = raw.slice(m[0].length);
  }

  if (!CATIONS.has(cat) || !rest) return null;

  // Анион: в скобках или подбором по справочнику (самое длинное совпадение)
  let an = null;
  let anIdx = 1;

  if (rest.startsWith('(')) {
    const m = /^\(([^)]+)\)(\d*)$/.exec(rest);

    if (!m) return null;

    an = m[1];
    anIdx = m[2] ? Number(m[2]) : 1;
  } else {
    for (const key of Object.keys(ANIONS).sort((a, b) => b.length - a.length)) {
      if (rest.startsWith(key)) {
        const tail = rest.slice(key.length);

        if (!/^\d*$/.test(tail)) continue;

        an = key;
        anIdx = tail ? Number(tail) : 1;
        break;
      }
    }
  }

  if (!an || !(an in ANIONS)) return null;

  const anCharge = ANIONS[an];
  const catCharge = (anCharge * anIdx) / catIdx;

  if (!Number.isInteger(catCharge) || catCharge < 1 || catCharge > 4) return null;

  return { cat, catIdx, an, anIdx, catCharge, anCharge };
}

// =====================================================
// Таблица растворимости (школьные правила)
// S — растворимо, I — осадок, sl — малорастворимо,
// G — газ, W — слабый электролит / вода
// =====================================================
export function getSolubility(cat, an) {
  if (cat === 'NH4' && an === 'OH') return 'G';
  if (cat === 'H' && an === 'OH') return 'W';
  if (cat === 'H' && an === 'CH3COO') return 'W';
  if (cat === 'H' && (an === 'CO3' || an === 'SO3')) return 'G';
  if (cat === 'H' && an === 'S') return 'G';
  if (cat === 'H' && an === 'SiO3') return 'I';
  if (an === 'NO3' || an === 'ClO4') return 'S';
  if (ALKALI.has(cat)) return 'S';
  if (an === 'OH') {
    if (cat === 'Ba' || cat === 'Sr') return 'S';
    if (cat === 'Ca') return 'sl';
    return 'I';
  }
  if (an === 'Cl' || an === 'Br' || an === 'I') {
    if (cat === 'Ag' || cat === 'Pb') return 'I';
    return 'S';
  }
  if (an === 'F') {
    if (cat === 'Ca' || cat === 'Mg' || cat === 'Pb' || cat === 'Ba') return 'I';
    return 'S';
  }
  if (an === 'SO4') {
    if (cat === 'Ba' || cat === 'Pb' || cat === 'Sr') return 'I';
    if (cat === 'Ca' || cat === 'Ag') return 'sl';
    return 'S';
  }
  if (an === 'CH3COO' || an === 'HCO3' || an === 'HSO4' || an === 'ClO3') return 'S';

  return 'I'; // CO3, SO3, S, SiO3, PO4 и пр.
}

// =====================================================
// Служебные функции
// =====================================================
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export function ionFormula(cat, catCharge, an, anCharge) {
  const g = gcd(catCharge, anCharge);
  const catIdx = anCharge / g;
  const anIdx = catCharge / g;
  const catIsMono = /^[A-Z][a-z]?$/.test(cat);
  const anIsMono = /^[A-Z][a-z]?$/.test(an);
  const catPart = catIdx > 1 ? (catIsMono ? `${cat}${catIdx}` : `(${cat})${catIdx}`) : cat;
  const anPart = anIdx > 1 ? (anIsMono ? `${an}${anIdx}` : `(${an})${anIdx}`) : an;

  return catPart + anPart;
}

const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const CHARGE_SUP = { 1: '⁺', 2: '²⁺', 3: '³⁺', 4: '⁴⁺', '-1': '⁻', '-2': '²⁻', '-3': '³⁻' };

function subscripts(formula) {
  return String(formula).replace(/\d/g, (d) => SUB[d]);
}

function cationText(cat, charge) {
  return subscripts(cat) + CHARGE_SUP[charge];
}

function anionText(an, charge) {
  return subscripts(an) + CHARGE_SUP['-' + charge];
}

// Подбор коэффициентов перебором 1..6 (переиспользуем разбор атомов)
export function balanceEquation(leftF, rightF, max = 6) {
  const L = leftF.map((f) => parsePartToAtoms(f));
  const R = rightF.map((f) => parsePartToAtoms(f));

  if (L.some((x) => !x) || R.some((x) => !x)) return null;

  const atoms = [...new Set([...L, ...R].flatMap((o) => Object.keys(o)))];
  const vars = [...L, ...R];
  const coeffs = new Array(vars.length).fill(1);

  const matches = () =>
    atoms.every((a) => {
      let l = 0;
      let r = 0;

      L.forEach((o, i) => { l += (o[a] || 0) * coeffs[i]; });
      R.forEach((o, i) => { r += (o[a] || 0) * coeffs[L.length + i]; });

      return l === r;
    });

  const rec = (i) => {
    if (i === vars.length) return matches() ? [...coeffs] : null;

    for (let k = 1; k <= max; k++) {
      coeffs[i] = k;
      const res = rec(i + 1);

      if (res) return res;
    }

    return null;
  };

  return rec(0);
}

// =====================================================
// ГЛАВНАЯ ФУНКЦИЯ: составить реакцию обмена
// =====================================================
export function buildExchangeReaction(formula1, formula2) {
  const e1 = parseElectrolyte(formula1);
  const e2 = parseElectrolyte(formula2);

  if (!e1 || !e2) return null;
  if (e1.cat === e2.cat || e1.an === e2.an) return null; // обмениваться нечем

  const p1 = { cat: e1.cat, catCharge: e1.catCharge, an: e2.an, anCharge: e2.anCharge };
  const p2 = { cat: e2.cat, catCharge: e2.catCharge, an: e1.an, anCharge: e1.anCharge };

  const s1 = getSolubility(p1.cat, p1.an);
  const s2 = getSolubility(p2.cat, p2.an);

  const driving = [s1, s2].some((s) => s === 'I' || s === 'G' || s === 'W');

  if (!driving) {
    return {
      occurs: false,
      reason: 'Оба продукта растворимы — реакция обмена не идёт.',
    };
  }

  // Разложение неустойчивых продуктов на газ / воду
  const expand = (p, s) => {
    if (s === 'W') return [p.cat === 'H' && p.an === 'OH' ? 'H2O' : ionFormula(p.cat, p.catCharge, p.an, p.anCharge)];
    if (s === 'G') {
      if (p.cat === 'H' && p.an === 'CO3') return ['H2O', 'CO2'];
      if (p.cat === 'H' && p.an === 'SO3') return ['H2O', 'SO2'];
      if (p.cat === 'H' && p.an === 'S') return ['H2S'];
      if (p.cat === 'NH4' && p.an === 'OH') return ['NH3', 'H2O'];
    }
    return [ionFormula(p.cat, p.catCharge, p.an, p.anCharge)];
  };

  // Правая часть без дубликатов
  const rightMap = new Map();

  for (const f of [...expand(p1, s1), ...expand(p2, s2)]) {
    rightMap.set(f, (rightMap.get(f) || 0) + 1);
  }

  // Если вода «удвоилась», перебор коэффициентов сам всё уладит —
  // но дубликаты веществ в списке убираем
  const rightF = [...rightMap.keys()];
  const coeffs = balanceEquation([formula1, formula2], rightF);

  if (!coeffs) return null;

  const leftText = [formula1, formula2]
    .map((f, i) => (coeffs[i] > 1 ? `${coeffs[i]}${f}` : f))
    .join(' + ');
  const rightText = rightF
    .map((f, i) => (coeffs[2 + i] > 1 ? `${coeffs[2 + i]}${f}` : f))
    .join(' + ');

  // Причина (движущая сила)
  const reasons = [];

  [[p1, s1], [p2, s2]].forEach(([p, s]) => {
    const f = ionFormula(p.cat, p.catCharge, p.an, p.anCharge);

    if (s === 'I') reasons.push(`образуется нерастворимое вещество ${f}`);
    if (s === 'G') reasons.push(`выделяется газ`);
    if (s === 'W') reasons.push(`образуется слабый электролит (вода)`);
  });

  // ---------- Ионные уравнения ----------
  const collectIons = (formulas, startIdx) => {
    const ions = new Map();
    const molecules = [];

    formulas.forEach((f, i) => {
      const coeff = coeffs[startIdx + i];
      const e = parseElectrolyte(f);
      const sol = e ? getSolubility(e.cat, e.an) : null;

      if (e && sol === 'S') {
        const ct = cationText(e.cat, e.catCharge);
        const at = anionText(e.an, e.anCharge);

        ions.set(ct, (ions.get(ct) || 0) + e.catIdx * coeff);
        ions.set(at, (ions.get(at) || 0) + e.anIdx * coeff);
      } else {
        molecules.push({ text: subscripts(f), count: coeff });
      }
    });

    return { ions, molecules };
  };

  const left = collectIons([formula1, formula2], 0);
  const right = collectIons(rightF, 2);

  const fullIonic = `${sideToString(left)} = ${sideToString(right)}`;

  // Сокращение spectator-ионов
  const netLeft = new Map(left.ions);
  const netRight = new Map(right.ions);

  for (const ion of [...netLeft.keys()]) {
    const cancel = Math.min(netLeft.get(ion) || 0, netRight.get(ion) || 0);

    netLeft.set(ion, netLeft.get(ion) - cancel);
    netRight.set(ion, netRight.get(ion) - cancel);
  }

  const netIonic = `${sideToString({ ions: netLeft, molecules: left.molecules })} = ${sideToString({ ions: netRight, molecules: right.molecules })}`;

  return {
    occurs: true,
    molecular: `${leftText} --> ${rightText}`,
    leftText,
    rightText,
    fullIonic,
    netIonic,
    reason: `Реакция возможна: ${reasons.join('; ')}.`,
  };
}

function sideToString(side) {
  const parts = [];

  for (const [ion, count] of side.ions) {
    if (count > 0) parts.push(`${count > 1 ? count : ''}${ion}`);
  }

  for (const m of side.molecules) {
    parts.push(`${m.count > 1 ? m.count : ''}${m.text}`);
  }

  return parts.join(' + ');
}