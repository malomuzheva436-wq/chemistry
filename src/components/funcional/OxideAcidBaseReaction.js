// OxideAcidBaseReaction.js
// Реакции оксидов с кислотами и щёлочами:
//  - основной оксид + кислота → соль + вода
//  - кислотный оксид + щёлочь → соль + вода

import { ionFormula, balanceEquation } from './ExchangeReaction';

// ===== Основные оксиды (оксиды металлов в низких степенях окисления) =====
const BASIC_OXIDES = new Set([
  'Li2O', 'Na2O', 'K2O', 'Rb2O', 'Cs2O',
  'MgO', 'CaO', 'SrO', 'BaO',
  'CuO', 'Cu2O', 'FeO', 'Fe2O3', 'MnO', 'CoO', 'NiO',
  'Ag2O', 'HgO', 'PbO', 'SnO', 'ZnO',
]);

// ===== Кислотные оксиды (оксиды неметаллов и металлов в высоких степенях окисления) =====
const ACIDIC_OXIDES = new Set([
  'CO2', 'SO2', 'SO3', 'P2O5', 'N2O5', 'N2O3', 'NO2',
  'SiO2', 'Cl2O7', 'CrO3', 'Mn2O7',
]);

// ===== Щёлочи (растворимые основания) =====
const ALKALI = new Set(['LiOH', 'NaOH', 'KOH', 'RbOH', 'CsOH', 'Ba(OH)2', 'Ca(OH)2']);

// Локальный справочник кислот (не зависим от других модулей)
const ACID_ANION = {
  H2SO4: ['SO4', 2],
  HNO3: ['NO3', 1],
  HCl: ['Cl', 1],
  HBr: ['Br', 1],
  H3PO4: ['PO4', 3],
};
// Кислотный оксид → анион соответствующей кислоты
const OXIDE_TO_ANION = {
  CO2: ['CO3', 2],
  SO2: ['SO3', 2],
  SO3: ['SO4', 2],
  P2O5: ['PO4', 3],
  N2O5: ['NO3', 1],
  N2O3: ['NO2', 1],
  SiO2: ['SiO3', 2],
  Cl2O7: ['ClO4', 1],
  CrO3: ['CrO4', 2],
  Mn2O7: ['MnO4', 1],
};

// Основной оксид → [металл, заряд катиона]
const OXIDE_TO_METAL = {
  'Li2O': ['Li', 1],
  'Na2O': ['Na', 1],
  'K2O': ['K', 1],
  'Rb2O': ['Rb', 1],
  'Cs2O': ['Cs', 1],
  'MgO': ['Mg', 2],
  'CaO': ['Ca', 2],
  'SrO': ['Sr', 2],
  'BaO': ['Ba', 2],
  'CuO': ['Cu', 2],
  'Cu2O': ['Cu', 1],
  'FeO': ['Fe', 2],
  'Fe2O3': ['Fe', 3],
  'MnO': ['Mn', 2],
  'CoO': ['Co', 2],
  'NiO': ['Ni', 2],
  'Ag2O': ['Ag', 1],
  'HgO': ['Hg', 2],
  'PbO': ['Pb', 2],
  'SnO': ['Sn', 2],
  'ZnO': ['Zn', 2],
};

function normalizeFormula(f) {
  const raw = String(f ?? '').trim();
  const up = raw.toUpperCase();
  const CANON = {
    // Основные оксиды
    LI2O: 'Li2O', NA2O: 'Na2O', K2O: 'K2O', RB2O: 'Rb2O', CS2O: 'Cs2O',
    MGO: 'MgO', CAO: 'CaO', SRO: 'SrO', BAO: 'BaO',
    CUO: 'CuO', CU2O: 'Cu2O', FEO: 'FeO', FE2O3: 'Fe2O3', MNO: 'MnO', COO: 'CoO', NIO: 'NiO',
    AG2O: 'Ag2O', HGO: 'HgO', PBO: 'PbO', SNO: 'SnO', ZNO: 'ZnO',
    // Кислотные оксиды
    CO2: 'CO2', SO2: 'SO2', SO3: 'SO3', P2O5: 'P2O5', N2O5: 'N2O5', N2O3: 'N2O3', NO2: 'NO2',
    SIO2: 'SiO2', CL2O7: 'Cl2O7', CRO3: 'CrO3', MN2O7: 'Mn2O7',
    // Щёлочи
    LIOH: 'LiOH', NAOH: 'NaOH', KOH: 'KOH', RBOH: 'RbOH', CSOH: 'CsOH',
    'BA(OH)2': 'Ba(OH)2', 'CA(OH)2': 'Ca(OH)2',
    // Кислоты
    H2SO4: 'H2SO4', HNO3: 'HNO3', HCL: 'HCl', HBR: 'HBr', H3PO4: 'H3PO4',
  };
  return CANON[up] || null;
}

// =====================================================
// ГЛАВНАЯ ФУНКЦИЯ
// =====================================================
export function buildOxideReaction(input1, input2) {
  const f1 = normalizeFormula(input1);
  const f2 = normalizeFormula(input2);

  if (!f1 || !f2) return null;

  // ===== Вариант 1: основной оксид + кислота =====
  if (BASIC_OXIDES.has(f1) && ACID_ANION[f2]) {
    const [metal, metalCharge] = OXIDE_TO_METAL[f1];
    const [anion, anionCharge] = ACID_ANION[f2];
    const salt = ionFormula(metal, metalCharge, anion, anionCharge);
    const rightF = [salt, 'H2O'];
    const coeffs = balanceEquation([f1, f2], rightF, 12);

    if (!coeffs) return null;

    const leftText = [f1, f2]
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
      reason: `Основной оксид реагирует с кислотой: образуется соль и вода.`,
    };
  }

  if (BASIC_OXIDES.has(f2) && ACID_ANION[f1]) {
    const [metal, metalCharge] = OXIDE_TO_METAL[f2];
    const [anion, anionCharge] = ACID_ANION[f1];
    const salt = ionFormula(metal, metalCharge, anion, anionCharge);
    const rightF = [salt, 'H2O'];
    const coeffs = balanceEquation([f2, f1], rightF, 12);

    if (!coeffs) return null;

    const leftText = [f2, f1]
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
      reason: `Основной оксид реагирует с кислотой: образуется соль и вода.`,
    };
  }

  // ===== Вариант 2: кислотный оксид + щёлочь =====
  if (ACIDIC_OXIDES.has(f1) && ALKALI.has(f2)) {
    const [anion, anionCharge] = OXIDE_TO_ANION[f1];
    const alkaliMetal = f2.startsWith('Ba') ? 'Ba' :
                        f2.startsWith('Ca') ? 'Ca' :
                        f2.replace('OH', '');
    const metalCharge = alkaliMetal === 'Ba' || alkaliMetal === 'Ca' ? 2 : 1;
    const salt = ionFormula(alkaliMetal, metalCharge, anion, anionCharge);
    const rightF = [salt, 'H2O'];
    const coeffs = balanceEquation([f1, f2], rightF, 12);

    if (!coeffs) return null;

    const leftText = [f1, f2]
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
      reason: `Кислотный оксид реагирует со щёлочью: образуется соль и вода.`,
    };
  }

  if (ACIDIC_OXIDES.has(f2) && ALKALI.has(f1)) {
    const [anion, anionCharge] = OXIDE_TO_ANION[f2];
    const alkaliMetal = f1.startsWith('Ba') ? 'Ba' :
                        f1.startsWith('Ca') ? 'Ca' :
                        f1.replace('OH', '');
    const metalCharge = alkaliMetal === 'Ba' || alkaliMetal === 'Ca' ? 2 : 1;
    const salt = ionFormula(alkaliMetal, metalCharge, anion, anionCharge);
    const rightF = [salt, 'H2O'];
    const coeffs = balanceEquation([f2, f1], rightF, 12);

    if (!coeffs) return null;

    const leftText = [f2, f1]
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
      reason: `Кислотный оксид реагирует со щёлочью: образуется соль и вода.`,
    };
  }

  return null;
}

// Обёртка для интерфейса (как в других модулях)
export function buildOxideReactions(input1, input2) {
  const r = buildOxideReaction(input1, input2);

  return r && r.occurs ? [r] : [];
}