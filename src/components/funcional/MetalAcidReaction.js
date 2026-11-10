// MetalAcidReaction.js
// Реакции металлов с кислотами: окислительные (H2SO4k, HNO3)
// и вытеснение водорода (HCl, HBr, H3PO4, разб. H2SO4)

import { ionFormula, balanceEquation } from './ExchangeReaction';

const SERIES = [
  'Li', 'Rb', 'K', 'Ba', 'Sr', 'Ca', 'Na', 'Mg', 'Al', 'Mn', 'Zn',
  'Cr', 'Fe', 'Cd', 'Co', 'Ni', 'Sn', 'Pb', 'H', 'Sb', 'Bi',
  'Cu', 'Hg', 'Ag', 'Pt', 'Au',
];

const PASSIVATING = new Set(['Fe', 'Al', 'Cr', 'Co', 'Ni']);

// Кислоты-неокислители: с металлами до H дают соль + H2
const NONOX = new Set(['HCl', 'HBr', 'H3PO4']);

// Кислота → [анион, заряд аниона]
const ACID_ANION = {
  H2SO4: ['SO4', 2],
  HNO3: ['NO3', 1],
  HCl: ['Cl', 1],
  HBr: ['Br', 1],
  H3PO4: ['PO4', 3],
};

const VALENCE_OX = {
  Li: 1, Rb: 1, K: 1, Ba: 2, Sr: 2, Ca: 2, Na: 1, Mg: 2, Al: 3,
  Mn: 2, Zn: 2, Cr: 3, Fe: 3, Cd: 2, Co: 2, Ni: 2, Sn: 2, Pb: 2,
  Sb: 3, Bi: 3, Cu: 2, Hg: 2, Ag: 1,
};

// Для разбавленных / неокислительных кислот: Fe и Cr дают +2
const VALENCE_NONOX = { ...VALENCE_OX, Fe: 2, Cr: 2 };

const idx = (m) => SERIES.indexOf(m);

function capMetal(s) {
  const t = String(s ?? '').trim();

  if (!t) return '';

  return t[0].toUpperCase() + t.slice(1).toLowerCase();
}

export function isMetalSymbol(s) {
  const m = capMetal(s);

  return idx(m) >= 0 && m !== 'H';
}

// ===== Распознавание кислоты с суффиксами k / och_p =====
function parseAcid(f) {
  const raw = String(f ?? '').trim();
  let formula = raw;
  let concMarked = false;
  let veryDilMarked = false;

  if (/och_p$/i.test(raw)) {
    formula = raw.slice(0, -5);
    veryDilMarked = true;
  } else if (/k$/i.test(raw)) {
    formula = raw.slice(0, -1);
    concMarked = true;
  }

  const up = formula.toUpperCase();
  const CANON = { H2SO4: 'H2SO4', HNO3: 'HNO3', HCL: 'HCl', HBR: 'HBr', H3PO4: 'H3PO4' };
  const acid = CANON[up];

  if (!acid) return null;

  return {
    acid,
    displayFormula: acid + (veryDilMarked ? 'och_p' : concMarked ? 'k' : ''),
    concMarked,
    veryDilMarked,
  };
}

const HEAT = /(t|°|нагр)/;

// =====================================================
// ГЛАВНАЯ ФУНКЦИЯ: строит ОДНО уравнение
// =====================================================
export function buildMetalAcidReaction(input1, input2, condition = '', userValence = null) {
  const cond = String(condition ?? '').toLowerCase();
  const f1 = String(input1 ?? '').trim();
  const f2 = String(input2 ?? '').trim();

  // ===== Определяем металл и кислоту =====
  let metal = null;
  let acidInfo = null;
  const a1 = parseAcid(f1);
  const a2 = parseAcid(f2);

  if (a1 && isMetalSymbol(f2)) {
    acidInfo = a1;
    metal = capMetal(f2);
  } else if (a2 && isMetalSymbol(f1)) {
    acidInfo = a2;
    metal = capMetal(f1);
  } else {
    return null;
  }

  if (metal === 'Pt' || metal === 'Au') {
    return {
      occurs: false,
      reason: `${metal} — благородный металл, с кислотами не реагирует.`,
    };
  }

  const pos = idx(metal);
  const beforeAl = pos < idx('Al');
  const beforeH = pos < idx('H');

  // ===== Уровень концентрации: суффикс решает =====
  const explicitVeryDil = cond.includes('оч');
  const explicitConc = cond.includes('конц');

  let concLevel;
  let note = '';

  if (explicitVeryDil || acidInfo.veryDilMarked) {
    concLevel = 'verydil';
    note = 'очень разбавленная кислота';
  } else if (explicitConc || acidInfo.concMarked) {
    concLevel = 'conc';
    note = 'концентрированная кислота';
  } else {
    concLevel = 'dil';
    note = 'разбавленная кислота';
  }

  const isNonOx = NONOX.has(acidInfo.acid);
  const isH2SO4 = acidInfo.acid === 'H2SO4';
  const isHNO3 = acidInfo.acid === 'HNO3';

  let products = null;

  // ================= ВЕТКА: СОЛЬ + ВОДОРОД =================
  // Работает для неокислителей (HCl, HBr, H3PO4) и разб. H2SO4
  if (isNonOx || (isH2SO4 && concLevel === 'dil')) {
    if (!beforeH) {
      return {
        occurs: false,
        reason: `${metal} стоит в ряду активности после водорода, поэтому водород из ${acidInfo.acid} не вытесняется — реакция не идёт.`,
      };
    }
    products = ['H2'];
    note = 'металл до водорода: идёт вытеснение H2';
  }
  // ================= H2SO4 конц. =================
  else if (isH2SO4 && concLevel === 'conc') {
    if (PASSIVATING.has(metal) && !HEAT.test(cond)) {
      return {
        occurs: false,
        reason: `${metal} пассивируется конц. H2SO4 на холоду. Добавьте t°.`,
      };
    }
    if (pos <= idx('Zn')) {
      products = [
        cond.includes('h2s') ? 'H2S' : cond.includes(' s') ? 'S' : 'H2S',
        'H2O',
      ];
    } else {
      products = ['SO2', 'H2O'];
    }
    note = 'концентрированная кислота: сера восстанавливается';
  }
  // ================= HNO3 =================
  else if (isHNO3) {
    if (concLevel === 'verydil') {
      products = ['NH4NO3', 'H2O'];
      note = 'очень разбавленная кислота: азот до аммония';
    } else if (concLevel === 'conc') {
      if (PASSIVATING.has(metal) && !HEAT.test(cond)) {
        return {
          occurs: false,
          reason: `${metal} пассивируется конц. HNO3 на холоду. Добавьте t°.`,
        };
      }
      products = [beforeAl ? 'N2O' : 'NO2', 'H2O'];
      note = 'концентрированная кислота';
    } else {
      products = [beforeAl ? (cond.includes('nh4') ? 'NH4NO3' : 'N2') : 'NO', 'H2O'];
      note = 'разбавленная кислота';
    }
  }

  if (!products) return null;

  // ===== Собираем соль и балансируем =====
  const [anion, anionCharge] = ACID_ANION[acidInfo.acid];
  const useNonOxValence = isNonOx || (isH2SO4 && concLevel === 'dil');
  const v = userValence ?? (useNonOxValence ? VALENCE_NONOX[metal] : VALENCE_OX[metal]) ?? 2;

  const salt = ionFormula(metal, v, anion, anionCharge);
  const rightF = [salt, ...products];
  const coeffs = balanceEquation([metal, acidInfo.acid], rightF, 12);

  if (!coeffs) return null;

  const leftText = [metal, acidInfo.displayFormula]
    .map((f, i) => (coeffs[i] > 1 ? `${coeffs[i]}${f}` : f))
    .join(' + ');
  const rightText = rightF
    .map((f, i) => (coeffs[2 + i] > 1 ? `${coeffs[2 + i]}${f}` : f))
    .join(' + ');

  return {
    occurs: true,
    molecular: `${leftText} --> ${rightText}`,
    leftText,
    rightText,
    reason: `Реакция составлена по схеме ${acidInfo.acid} + металл (${note}).`,
  };
}

// =====================================================
// ОБЁРТКА: массив успешных вариантов (для добавления строк)
// Теперь использует ТОТ ЖЕ код, что и одиночная функция.
// =====================================================
export function buildMetalAcidReactions(input1, input2, condition = '', userValence = null) {
  const result = buildMetalAcidReaction(input1, input2, condition, userValence);

  return result && result.occurs ? [result] : [];
}