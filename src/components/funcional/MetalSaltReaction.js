// MetalSaltReaction.js
// Реакции замещения: металл + соль → новая соль + металл
// Работает по ряду активности: более активный металл вытесняет менее активный

import { ionFormula, balanceEquation, parseElectrolyte } from './ExchangeReaction';
import { isMetalSymbol } from './MetalAcidReaction';

// Ряд активности (тот же, что в MetalAcidReaction.js)
const SERIES = [
  'Li', 'Rb', 'K', 'Ba', 'Sr', 'Ca', 'Na', 'Mg', 'Al', 'Mn', 'Zn',
  'Cr', 'Fe', 'Cd', 'Co', 'Ni', 'Sn', 'Pb', 'H', 'Sb', 'Bi',
  'Cu', 'Hg', 'Ag', 'Pt', 'Au',
];

const idx = (m) => SERIES.indexOf(m);

function capMetal(s) {
  const t = String(s ?? '').trim();

  if (!t) return '';

  return t[0].toUpperCase() + t.slice(1).toLowerCase();
}

// =====================================================
// ГЛАВНАЯ ФУНКЦИЯ
// =====================================================
export function buildMetalSaltReaction(input1, input2) {
  const f1 = String(input1 ?? '').trim();
  const f2 = String(input2 ?? '').trim();

  // Определяем, кто металл, кто соль
  let metal = null;
  let saltFormula = null;

  if (isMetalSymbol(f1)) {
    const electrolyte = parseElectrolyte(f2);

    if (electrolyte && isMetalSymbol(electrolyte.cat)) {
      metal = capMetal(f1);
      saltFormula = electrolyte;
    }
  } else if (isMetalSymbol(f2)) {
    const electrolyte = parseElectrolyte(f1);

    if (electrolyte && isMetalSymbol(electrolyte.cat)) {
      metal = capMetal(f2);
      saltFormula = electrolyte;
    }
  }

  if (!metal || !saltFormula) return null;

  // Металл в соли
  const saltMetal = saltFormula.cat;
  const saltAnion = saltFormula.an;
  const saltAnionCharge = saltFormula.anCharge;

  // Позиции в ряду активности
  const metalPos = idx(metal);
  const saltMetalPos = idx(saltMetal);

  if (metalPos < 0 || saltMetalPos < 0) return null;

  // Проверка: металл-реагент должен быть ЛЕВЕЕ (активнее) металла в соли
  if (metalPos >= saltMetalPos) {
    return {
      occurs: false,
      reason: `${metal} стоит в ряду активности после ${saltMetal}, поэтому вытеснить его из соли не может — реакция не идёт.`,
    };
  }

  // Валентность нового металла в соли (берём из того же справочника, что для кислот)
  const VALENCE = {
    Li: 1, Rb: 1, K: 1, Ba: 2, Sr: 2, Ca: 2, Na: 1, Mg: 2, Al: 3,
    Mn: 2, Zn: 2, Cr: 2, Fe: 2, Cd: 2, Co: 2, Ni: 2, Sn: 2, Pb: 2,
    Sb: 3, Bi: 3, Cu: 2, Hg: 2, Ag: 1,
  };
  const metalCharge = VALENCE[metal] ?? 2;

  // Новая соль
  const newSalt = ionFormula(metal, metalCharge, saltAnion, saltAnionCharge);
  const rightF = [newSalt, saltMetal];
  const coeffs = balanceEquation([metal, f1 === metal ? f2 : f1], rightF, 12);

  if (!coeffs) return null;

  const saltDisplay = f1 === metal ? f2 : f1;
  const leftText = [metal, saltDisplay]
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
    reason: `${metal} активнее ${saltMetal} в ряду активности, поэтому вытесняет его из раствора соли.`,
  };
}