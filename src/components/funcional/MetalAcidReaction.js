// MetalAcidReaction.js
// Автоматическое составление реакций металлов с H2SO4 и HNO3
// с поддержкой суффикса 'k' для концентрированных кислот

import { ionFormula, balanceEquation } from './ExchangeReaction';

// Ряд активности
const SERIES = [
  'Li', 'Rb', 'K', 'Ba', 'Sr', 'Ca', 'Na', 'Mg', 'Al', 'Mn', 'Zn',
  'Cr', 'Fe', 'Cd', 'Co', 'Ni', 'Sn', 'Pb', 'H', 'Sb', 'Bi',
  'Cu', 'Hg', 'Ag', 'Pt', 'Au',
];

const PASSIVATING = new Set(['Fe', 'Al', 'Cr', 'Co', 'Ni']);

const VALENCE_OX = {
  Li: 1, Rb: 1, K: 1, Ba: 2, Sr: 2, Ca: 2, Na: 1, Mg: 2, Al: 3,
  Mn: 2, Zn: 2, Cr: 3, Fe: 3, Cd: 2, Co: 2, Ni: 2, Sn: 2, Pb: 2,
  Sb: 3, Bi: 3, Cu: 2, Hg: 2, Ag: 1,
};
const VALENCE_DIL = { ...VALENCE_OX, Fe: 2 };

const idx = (m) => SERIES.indexOf(m);

export function isMetalSymbol(s) {
  return idx(s) >= 0 && s !== 'H';
}

// ===== Распознавание кислоты с учётом суффикса k =====
function parseAcid(f) {
  const raw = String(f ?? '').trim();
  let formula = raw;
  let concMarked = false;
  let veryDilMarked = false;

  // Проверяем суффиксы от самого длинного к короткому,
  // чтобы 'och_p' (5 символов) распознался раньше, чем случайный 'p'.
  if (/och_p$/i.test(raw)) {
    formula = raw.slice(0, -5);
    veryDilMarked = true;
  } else if (/k$/i.test(raw)) {
    formula = raw.slice(0, -1);
    concMarked = true;
  }

  if (formula === 'H2SO4') return { acid: 'H2SO4', displayFormula: raw, concMarked, veryDilMarked };
  if (formula === 'HNO3')  return { acid: 'HNO3',  displayFormula: raw, concMarked, veryDilMarked };

  return null;
}

const HEAT = /(t|°|нагр)/;

// =====================================================
// ГЛАВНАЯ ФУНКЦИЯ
// =====================================================
export function buildMetalAcidReaction(input1, input2, condition = '', userValence = null) {
  const cond = String(condition ?? '').toLowerCase();
  const f1 = String(input1 ?? '').trim();
  const f2 = String(input2 ?? '').trim();

  // Кто металл, кто кислота (кислота теперь в виде H2SO4k/HNO3k)
  let metal = null;
  let acidInfo = null;
  const a1 = parseAcid(f1);
  const a2 = parseAcid(f2);

  if (a1 && isMetalSymbol(f2)) { acidInfo = a1; metal = f2; }
  else if (a2 && isMetalSymbol(f1)) { acidInfo = a2; metal = f1; }
  else return null;

  if (metal === 'Pt' || metal === 'Au') {
    return { occurs: false, reason: `${metal} с этой кислотой не реагирует.` };
  }

  const pos = idx(metal);
  const beforeAl = pos < idx('Al');
  const beforeH  = pos < idx('H');

    // ===== ОПРЕДЕЛЕНИЕ КОНЦЕНТРАЦИИ =====
  // Приоритет: явное условие > суффикс och_p > суффикс k > значение по умолчанию
  const explicitVeryDil = cond.includes('оч');
  const explicitConc = cond.includes('конц');
  const explicitDil = cond.includes('разб') && !cond.includes('оч');

  let concLevel; // 'conc' | 'dil' | 'verydil'
  let note = '';

  if (explicitVeryDil) {
    concLevel = 'verydil';
    note = 'очень разбавленная кислота (указано в условии)';
  } else if (acidInfo.veryDilMarked) {
    concLevel = 'verydil';
    note = `очень разбавленная кислота (маркировка "${acidInfo.displayFormula}")`;
  } else if (explicitConc) {
    concLevel = 'conc';
    note = 'концентрированная кислота (указано в условии)';
  } else if (acidInfo.concMarked) {
    concLevel = 'conc';
    note = `концентрированная кислота (маркировка "${acidInfo.displayFormula}")`;
  } else if (explicitDil) {
    concLevel = 'dil';
    note = 'разбавленная кислота (указано в условии)';
  } else {
    // Значения по умолчанию
    if (acidInfo.acid === 'H2SO4') {
      concLevel = 'dil';
      note = 'принята разбавленной (для конц. используйте H2SO4k)';
    } else {
      concLevel = 'dil';
      note = 'принята разбавленной (для оч. разб. используйте HNO3och_p)';
    }
  }

  let products = null;
  let anion = null;
  let anionCharge = 0;

  // ================= H2SO4 =================
  if (acidInfo.acid === 'H2SO4') {
    anion = 'SO4';
    anionCharge = 2;

    if (concLevel === 'conc') {
      if (PASSIVATING.has(metal) && !HEAT.test(cond)) {
        return {
          occurs: false,
          reason: `${metal} пассивируется концентрированной H2SO4 на холоду. Добавьте условие t°.`,
        };
      }
      if (pos <= idx('Zn')) {
        products = [cond.includes('h2s') ? 'H2S' : cond.includes(' s') ? 'S' : 'H2S', 'H2O'];
      } else {
        products = ['SO2', 'H2O'];
      }
    } else {
      if (!beforeH) {
        return { occurs: false, reason: `${metal} стоит после водорода — с разбавленной H2SO4 не реагирует.` };
      }
      products = ['H2'];
    }
  }
  // ================= HNO3 =================
  else {
    anion = 'NO3';
    anionCharge = 1;

    if (concLevel === 'verydil') {
      products = ['NH4NO3', 'H2O'];
    } else if (concLevel === 'conc') {
      if (PASSIVATING.has(metal) && !HEAT.test(cond)) {
        return {
          occurs: false,
          reason: `${metal} пассивируется концентрированной HNO3 на холоду. Добавьте условие t°.`,
        };
      }
      products = [beforeAl ? 'N2O' : 'NO2', 'H2O'];
    } else {
      // dil
      if (beforeAl) {
        products = [cond.includes('nh4') ? 'NH4NO3' : 'N2', 'H2O'];
      } else {
        products = ['NO', 'H2O'];
      }
    }
  }

  // Валентность в соли
  const diluteH2SO4 = acidInfo.acid === 'H2SO4' && concLevel === 'dil';
  const v = userValence ?? (diluteH2SO4 ? VALENCE_DIL[metal] : VALENCE_OX[metal]) ?? 2;

  const salt = ionFormula(metal, v, anion, anionCharge);

  // ВАЖНО: в левой части уравнения используем исходную формулу с 'k',
  // чтобы пользователь видел, что реакция идёт с концентрированной кислотой.
  const acidDisplay = acidInfo.displayFormula;

  const rightF = [salt, ...products];
  const coeffs = balanceEquation([metal, acidInfo.acid], rightF, 12);

  if (!coeffs) return null;

  const leftText = [metal, acidDisplay]
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
    reason: `Реакция составлена по схеме взаимодействия ${acidInfo.acid} с металлами (${note}).`,
  };
}