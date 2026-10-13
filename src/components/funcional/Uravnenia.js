// Uravnenia.js
// Список химических уравнений для решения задач.
//
// Коэффициенты обязательны: программа использует их
// как мольные соотношения веществ.
function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
} 

export const REACTION_CONDITIONS = {
  Cl2KOH60: '60 °C',
  KClO3O2: 'MnO2, t°',
  KClO3KClO4: 't° (без катализатора)',
  // пополняй по мере необходимости
};

export const REACTIONS = {
  // ПРОСТЫЕ РЕАКЦИИ (горение, разложение, нейтрализация)
  H2O2: '2H2 + O2 --> 2H2O',
  H2Cl2: 'H2 + Cl2 --> 2HCl',
  H2N2: '3H2 + N2 --> 2NH3',
  H2S: 'H2 + S --> H2S',
  CO2: 'C + O2 --> CO2',
  CO: '2C + O2 --> 2CO',
  CH4O2: 'CH4 + 2O2 --> CO2 + 2H2O',
  C2H6O2: '2C2H6 + 7O2 --> 4CO2 + 6H2O',
  C2H4O2: 'C2H4 + 3O2 --> 2CO2 + 2H2O',
  C2H2O2: '2C2H2 + 5O2 --> 4CO2 + 2H2O',
  // Разложение
  KNO3: '2KNO3 --> 2KNO2 + O2',
  KMnO4: '2KMnO4 --> K2MnO4 + MnO2 + O2',
  CaCO3: 'CaCO3 --> CaO + CO2',
  H2CO3: 'H2CO3 --> H2O + CO2',
  H2SO3: 'H2SO3 --> H2O + SO2',
  'Cu(OH)2': 'Cu(OH)2 --> CuO + H2O',
  'Fe(OH)3': '2Fe(OH)3 --> Fe2O3 + 3H2O',
  'Ca3(PO4)2': 'Ca3(PO4)2 --> 3CaO + P2O5',
  // Нейтрализация
  HClNaOH: 'HCl + NaOH --> NaCl + H2O',
  H2SO4NaOH: 'H2SO4 + 2NaOH --> Na2SO4 + 2H2O',
  HNO3KOH: 'HNO3 + KOH --> KNO3 + H2O',
  H3PO4NaOH: 'H3PO4 + 3NaOH --> Na3PO4 + 3H2O',
  // реакции обмена
  BaCl2H2SO4: 'BaCl2 + H2SO4 --> BaSO4 + 2HCl',
  CaCl2AgNO3: 'CaCl2 + 2AgNO3 --> Ca(NO3)2 + 2AgCl',
  NaClAgNO3: 'NaCl + AgNO3 --> AgCl + NaNO3',
  CaCO3HCl: 'CaCO3 + 2HCl --> CaCl2 + CO2 + H2O',
  P2O5NaOH: 'P2O5 + 5NaOH --> Na3PO4 + Na2HPO4 + 2H2O',
  // ХРОМ 
  K2CrO4HCl: '2K2CrO4 + 16HCl --> 2CrCl3 + 3Cl2 + 4KCl + 8H2O',
  K2CrO4H2SH2O: '2K2CrO4 + 3H2S + 2H2O --> 2Cr(OH)3 + 3S + 4KOH',
  K2Cr2O7HCl: 'K2Cr2O7 + 14HCl --> 2CrCl3 + 3Cl2 + 2KCl + 7H2O',
  K2Cr2O7KI: 'K2Cr2O7 + 6KI + 7H2SO4 --> Cr2(SO4)3 + 3I2 + 4K2SO4 + 7H2O',
  K2Cr2O7H2SH2SO4: 'K2Cr2O7 + 3H2S + 4H2SO4 --> Cr2(SO4)3 + 3S + K2SO4 + 7H2O',
  K2Cr2O7H2SH2O: 'K2Cr2O7 + 3H2S + H2O --> 2Cr(OH)3 + 3S + 2KOH',
  K2Cr2O7: '4K2Cr2O7 --> 4K2CrO4 + 2Cr2O3 + 3O2',
  // МАРГАНЕЦ 
  MnO2HCl: 'MnO2 + 4HCl --> MnCl2 + Cl2 + 2H2O',
  MnOKBr: 'MnO + 2KBr + 2H2SO4 --> MnSO4 + K2SO4 + Br2 + 2H2O',
  MnO2C: 'MnO2 + 2C --> Mn + 2CO',
  MnO2H2SO4k: '2MnO2 + 2H2SO4 --> 2MnSO4 + O2 + 2H2O',
  MnO2KOHO2: '2MnO2 + 4KOH + O2 --> 2K2MnO4 + 2H2O',
  K2MnO4Na2SO3: 'K2MnO4 + Na2SO3 + H2O --> 2KOH + MnO2 + Na2SO4',
  K2MnO4Na2S: 'K2MnO4 + Na2S + 2H2O --> 2KOH + MnO2 + S + 2NaOH',
  K2MnO4HClk: 'K2MnO4 + 8HCl --> MnCl2 + 2Cl2 + 4H2O + 2KCl',
  K2MnO4H2O: '3K2MnO4 + 2H2O --> 2KMnO4 + MnO2 + 4KOH',
  K2MnO4Cl2: '2K2MnO4 + Cl2 --> 2KMnO4 + 2KCl',
  // ПЕРОКСИД ВОДОРОДА (из PDF)
  H2O2HI: '2HI + H2O2 --> I2 + 2H2O',
  H2O2KI: '2KI + H2O2 --> I2 + 2KOH',
  H2O2NaIH2SO4: '2NaI + H2O2 + H2SO4 --> I2 + Na2SO4 + 2H2O',
  H2O2PbS: 'PbS + 4H2O2 --> PbSO4 + 4H2O',
  H2O2NaNO2: 'NaNO2 + H2O2 --> NaNO3 + H2O',
  H2O2Na2SO3: 'Na2SO3 + H2O2 --> Na2SO4 + H2O',
  H2O2FeSO4: '2FeSO4 + H2O2 + H2SO4 --> Fe2(SO4)3 + 2H2O',
  H2O2Cr2O3: 'Cr2O3 + 3H2O2 + 4NaOH --> 2Na2CrO4 + 5H2O',
  H2O2KMnO4H2SO4: '5H2O2 + 2KMnO4 + 3H2SO4 --> 5O2 + K2SO4 + 2MnSO4 + 8H2O',
  H2O2KMnO4: '3H2O2 + 2KMnO4 --> 3O2 + 2KOH + 2MnO2 + 2H2O',
  H2O2Ag2O: 'H2O2 + Ag2O --> O2 + 2Ag + H2O',
  H2O2Cl2: 'H2O2 + Cl2 --> O2 + 2HCl',
  'H2O2Ca(ClO)2': '2H2O2 + Ca(ClO)2 --> 2O2 + CaCl2 + 2H2O',
  // ХЛОР (из PDF)
  HClOHI: 'HClO + 2HI --> HCl + I2 + H2O',
  HClOH2O2: 'HClO + H2O2 --> HCl + H2O + O2',
  NaClOHCl: 'NaClO + 2HCl --> NaCl + Cl2 + H2O',
  'Ca(ClO)2CO2': 'Ca(ClO)2 + CO2 + H2O --> CaCO3 + 2HClO',
  'Ca(ClO)2Na2CO3': 'Ca(ClO)2 + Na2CO3 --> CaCO3 + 2NaClO',
  PHClO3: '6P + 5HClO3 --> 3P2O5 + 5HCl',
  KClO3S: '2KClO3 + 3S --> 2KCl + 3SO2',
  HClO4C: '8HClO4 + 14C --> 14CO2 + 4Cl2 + 4H2O',
  KClO4Al: '3KClO4 + 8Al --> 3KCl + 4Al2O3',
  KMnO4HCl: '2KMnO4 + 16HCl --> 5Cl2 + 2KCl + 8H2O + 2MnCl2',
  KClO3HCl: 'KClO3 + 6HCl --> 3Cl2 + KCl + 3H2O',
  Cl2FeCl2: 'Cl2 + 2FeCl2 --> 2FeCl3',
  Cl2PCl3: 'Cl2 + PCl3 --> PCl5',
  Cl2H2O2: 'Cl2 + H2O2 --> 2HCl + O2',
  Cl2CuS: '3Cl2 + 2CuS --> 2CuCl2 + S2Cl2',
  Cl2H2SO3: 'Cl2 + H2SO3 + H2O --> 2HCl + H2SO4',
  Cl2KOH: 'Cl2 + 2KOH --> KCl + KClO + H2O',
  Cl2KOH60: '3Cl2 + 6KOH --> 5KCl + KClO3 + 3H2O',//катализатор 60 градусов
  // СЕРА 
  SHNO3k: 'S + 6HNO3 --> H2SO4 + 6NO2 + 2H2O',
  SH2SO4: 'S + 2H2SO4 --> 3SO2 + 2H2O',
  SKClO3: 'S + 2KClO3 --> 3SO2 + 2KCl',
  SNa2SO3: 'S + Na2SO3 --> Na2S2O3',
  SNaOH: '3S + 6NaOH --> Na2SO3 + 2Na2S + 3H2O',
  H2SBr2: 'H2S + Br2 --> 2HBr + S',
  H2SCl2: 'H2S + Cl2 --> 2HCl + S',
  H2SHNO3k: 'H2S + 2HNO3 --> S + 2NO2 + 2H2O',
  H2SCl2H2O: 'H2S + 4Cl2 + 4H2O --> H2SO4 + 8HCl',
  H2SSO2: '2H2S + SO2 --> 3S + 2H2O',
  H2SFeCl3: 'H2S + 2FeCl3 --> 2FeCl2 + S + 2HCl',
  H2SK2Cr2O7: '3H2S + K2Cr2O7 + 4H2SO4 --> 3S + Cr2(SO4)3 + K2SO4 + 7H2O',
  H2SH2SO4k: 'H2S + H2SO4 --> S + SO2 + 2H2O',
  CuSCl2: 'CuS + Cl2 --> CuCl2 + S',
  CuSO2: '2CuS + 3O2 --> 2CuO + 2SO2',
  Cr2S3O2: '2Cr2S3 + 9O2 --> 2Cr2O3 + 6SO2',
  ZnSO2: '2ZnS + 3O2 --> 2SO2 + 2ZnO',
  ZnH2SO4: '4Zn + 5H2SO4 --> 4ZnSO4 + H2S + 4H2O',
  MgH2SO4: '3Mg + 4H2SO4 --> 3MgSO4 + S + 4H2O',
  CuH2SO4: '2H2SO4 + Cu --> CuSO4 + SO2 + 2H2O',
  PH2SO4: '5H2SO4 + 2P --> 2H3PO4 + 5SO2 + 2H2O',
  CH2SO4: '2H2SO4 + C --> CO2 + 2SO2 + 2H2O',
  H2SO4S: '2H2SO4 + S --> 3SO2 + 2H2O',
  H2SO4KBr: '3H2SO4 + 2KBr --> Br2 + SO2 + 2KHSO4 + 2H2O',
  H2SO4KI: '5H2SO4 + 8KI --> 4I2 + H2S + 4K2SO4 + 4H2O',
  H2SO4H2S: 'H2SO4 + 3H2S --> 4S + 4H2O',
  // АЗОТ 
  NaNO2NH4Cl: 'NaNO2 + NH4Cl --> N2 + NaCl + 2H2O',
  CuHNO3k: 'Cu + 4HNO3 --> Cu(NO3)2 + 2NO2 + 2H2O',
  CuHNO3p: '3Cu + 8HNO3 --> 3Cu(NO3)2 + 2NO + 4H2O',
  ZnHNO3k: 'Zn + 4HNO3 --> Zn(NO3)2 + 2NO2 + 2H2O',
  ZnHNO3p: '4Zn + 10HNO3 --> 4Zn(NO3)2 + NH4NO3 + 3H2O',
  FeHNO3: 'Fe + 4HNO3 --> Fe(NO3)3 + NO + 2H2O',
  CaHNO3: '4Ca + 10HNO3 --> 4Ca(NO3)2 + N2O + 5H2O',
  CHNO3: 'C + 4HNO3 --> 4NO2 + CO2 + 2H2O',
  PHNO3k: 'P + 4HNO3 --> H3PO4 + 5NO2 + H2O',
  PHNO3p: '3P + 5HNO3 + 2H2O --> 3H3PO4 + 5NO',
  SHNO3p: 'S + 2HNO3 --> H2SO4 + 2NO',
  I2HNO3: 'I2 + 10HNO3 --> 2HIO3 + 10NO2 + 4H2O',
  Na2SHNO3: 'Na2S + 4HNO3 --> S + 2NO2 + 2H2O + 2NaNO3',
  CuSHNO3: 'CuS + 8HNO3 --> CuSO4 + 8NO2 + 4H2O',
  HIHNO3: 'HI + 6HNO3 --> HIO3 + 6NO2 + 3H2O',
  KIHNO3: '2KI + 4HNO3 --> I2 + 2NO2 + 2H2O + 2KNO3',
  // Галогены и их соединения
  'Ca(OH)2Cl2': '6Ca(OH)2 + 6Cl2 --> Ca(ClO3)2 + 5CaCl2 + 6H2O',
  NaOHCl2: '6NaOH + 3Cl2 --> NaClO3 + 5NaCl + 3H2O',
  NH3Cl2: '8NH3 + 3Cl2 --> 6NH4Cl + N2',
  I2Cl2H2O: 'I2 + 5Cl2 + 6H2O --> 2HIO3 + 10HCl',
  Br2HClOH2O: 'Br2 + 5HClO + H2O --> 2HBrO3 + 5HCl',
  
  // Металлы + кислоты
  AgHNO3: '3Ag + 4HNO3 --> 3AgNO3 + NO + 2H2O',
  AgH2SO4: '2Ag + 2H2SO4 --> Ag2SO4 + 2H2O + SO2',
  FeHCl: 'Fe + 2HCl --> FeCl2 + H2',
  HClZn: 'Zn + 2HCl --> ZnCl2 + H2',
  H2SO4HI: 'H2SO4 + 8HI --> 4I2 + H2S + 4H2O',
  
  // Окислительно-восстановительные с участием Mn, Cr, Fe
  FeSO4KMnO4H2SO4: '10FeSO4 + 2KMnO4 + 8H2SO4 --> 5Fe2(SO4)3 + 2MnSO4 + K2SO4 + 8H2O',
  FeSO4K2Cr2O7H2SO4: '6FeSO4 + K2Cr2O7 + 7H2SO4 --> 3Fe2(SO4)3 + Cr2(SO4)3 + 7H2O + K2SO4',
  Cr2O3KNO3KOH: 'Cr2O3 + 3KNO3 + 4KOH --> 2K2CrO4 + 3KNO2 + 2H2O',
  Cr2O3NaNO3NaOH: 'Cr2O3 + 3NaNO3 + 4NaOH --> 2Na2CrO4 + 3NaNO2 + 2H2O',
  
  // Сульфиды, сульфиты, тиосульфат
  Cu2SHNO3: '3Cu2S + 22HNO3 --> 6Cu(NO3)2 + 3H2SO4 + 10NO + 8H2O',
  FeS2O2: '4FeS2 + 11O2 --> 8SO2 + 2Fe2O3',
  Na2S2O3I2: '2Na2S2O3 + I2 --> Na2S4O6 + 2NaI',
  
  // Аммиак, азотсодержащие
  NH3O2: '4NH3 + 5O2 --> 4NO + 6H2O',
  '(NH4)2Cr2O7': '(NH4)2Cr2O7 --> N2 + 4H2O + Cr2O3',
  I2HNO3p: '3I2 + 10HNO3 --> 6HIO3 + 10NO + 2H2O',
  AsH3HNO3: 'AsH3 + 8HNO3 --> H3AsO4 + 8NO2 + 4H2O',
  
  // Обменные и качественные реакции
  CuSO4Fe: 'Fe + CuSO4 --> Cu + FeSO4',
  CuSO4KI: '4KI + 2CuSO4 --> 2CuI + I2 + 2K2SO4',
  'Cu(NO3)2K3[Fe(CN)6]': '3Cu(NO3)2 + 2K3[Fe(CN)6] --> Cu3[Fe(CN)6]2 + 6KNO3',
  Na2B4O7HClH2O: 'Na2B4O7 + 2HCl + 5H2O --> 4H3BO3 + 2NaCl',
  
  // Магний, фосфор
  MgO2: '2Mg + O2 --> 2MgO',
  P4NaOHH2O: 'P4 + 3NaOH + 3H2O --> 3NaH2PO2 + PH3',
  
  // Разложение
  'CuSO4*5H2O': 'CuSO4*5H2O --> CuSO4 + 5H2O',
  H2O2: '2H2O2 --> 2H2O + O2',
  // ОРГАНИКА
  Al4C3H2O: 'Al4C3 + 12H2O --> 3CH4 + 4Al(OH)3',
  CaC2H2O: 'CaC2 + 2H2O --> C2H2 + Ca(OH)2',
  C2H2Br2: 'C2H2 + 2Br2 --> C2H2Br4',
  C2H4Br2: 'C2H4 + Br2 --> C2H4Br2',
  C2H4H2: 'C2H4 + H2 --> C2H6',
  C2H4H2O: 'C2H4 + H2O --> C2H5OH',
  C2H5OHO2: 'C2H5OH + 3O2 --> 2CO2 + 3H2O',
  // Горение и окисление простых веществ
  SO2: 'S + O2 --> SO2',
  FeO2: '4Fe + 3O2 --> 2Fe2O3',
  AlO2: '4Al + 3O2 --> 2Al2O3',
  O2PbS: '2PbS + 3O2 --> 2PbO + 2SO2',
  C2H2O2C: '2C2H2 + 3O2 --> 2CO2 + 2H2O + 2C',
  CO2H2O: '6CO2 + 6H2O --> C6H12O6 + 6O2',
  
  // Металлы + кислоты
  AlHCl: '2Al + 6HCl --> 2AlCl3 + 3H2',
  HClMg: 'Mg + 2HCl --> MgCl2 + H2',
  FeH2SO4: 'Fe + H2SO4 --> FeSO4 + H2',
  ZnHNO3NO: '3Zn + 8HNO3 --> 3Zn(NO3)2 + 2NO + 4H2O',
  FeHNO3II: '3Fe + 8HNO3 --> 3Fe(NO3)2 + 2NO + 4H2O',
  MgHNO3: '4Mg + 10HNO3 --> 4Mg(NO3)2 + N2O + 5H2O',
  HNO3Pb: '3Pb + 8HNO3 --> 3Pb(NO3)2 + 2NO + 4H2O',
  HgHNO3: '3Hg + 8HNO3 --> 3Hg(NO3)2 + 2NO + 4H2O',
  
  // ОВР с марганцем, хромом, железом, иодом
  FeSO4H2SO4HNO3: '6FeSO4 + 2HNO3 + 3H2SO4 --> 3Fe2(SO4)3 + 2NO + 4H2O',
  FeSO4H2SO4HIO3: '10FeSO4 + 2HIO3 + 5H2SO4 --> 5Fe2(SO4)3 + I2 + 8H2O',
  H2SO4KIKMnO4: '10KI + 2KMnO4 + 8H2SO4 --> 5I2 + 2MnSO4 + 6K2SO4 + 8H2O',
  H2SO4K2Cr2O7KBr: '6KBr + K2Cr2O7 + 7H2SO4 --> 3Br2 + Cr2(SO4)3 + 4K2SO4 + 7H2O',
  H2SO4K2Cr2O7Na2SO3: '3Na2SO3 + K2Cr2O7 + 4H2SO4 --> Cr2(SO4)3 + K2SO4 + 3Na2SO4 + 4H2O',
  H2SO4K2Cr2O7SO2: '3SO2 + K2Cr2O7 + H2SO4 --> Cr2(SO4)3 + K2SO4 + H2O',
  H2SHIO3: '5H2S + 2HIO3 --> I2 + 5S + 6H2O',
  H2SO4MnO2NaCl: '4NaCl + 2H2SO4 + MnO2 --> Cl2 + MnCl2 + 2Na2SO4 + 2H2O',
  
  // Мышьяк и сурьма
  As2S3H2OHNO3: '3As2S3 + 28HNO3 + 4H2O --> 6H3AsO4 + 9H2SO4 + 28NO',
  As2O3H2OHNO3: '3As2O3 + 4HNO3 + 7H2O --> 6H3AsO4 + 4NO',
  Br2KOHSb2O3: 'Sb2O3 + 2Br2 + 10KOH --> 2K3SbO4 + 4KBr + 5H2O',
  
  // Галогены и их диспропорционирование
  Br2KOH: '3Br2 + 6KOH --> 5KBr + KBrO3 + 3H2O',
  'Ba(OH)2I2': '6I2 + 6Ba(OH)2 --> Ba(IO3)2 + 5BaI2 + 6H2O',
  Br2H2OP: '2P + 3Br2 + 6H2O --> 2H3PO3 + 6HBr',
  
  // Разложение хлората калия (два разных пути!)
  KClO3KClO4: '4KClO3 --> 3KClO4 + KCl',
  KClO3O2: '2KClO3 --> 2KCl + 3O2',
  
  // Обменные и качественные реакции
  CuSO4NaOH: 'CuSO4 + 2NaOH --> Cu(OH)2 + Na2SO4',
  'Ca(OH)2H3PO4': '3Ca(OH)2 + 2H3PO4 --> Ca3(PO4)2 + 6H2O',
  AlH2ONaOH: '2Al + 2NaOH + 6H2O --> 2Na[Al(OH)4] + 3H2',
  
  // Металлотермия и восстановление
  COFe2O3: 'Fe2O3 + 3CO --> 2Fe + 3CO2',
  CCaSO4: '2CaSO4 + C --> 2CaO + 2SO2 + CO2',
  FeS2Na2O2: '2FeS2 + 15Na2O2 --> Fe2O3 + 4Na2SO4 + 11Na2O',
  
  // Особые случаи
  AuCl3H2O2KOH: '2AuCl3 + 3H2O2 + 6KOH --> 2Au + 3O2 + 6KCl + 6H2O',
  CuSHNO3p: '3CuS + 14HNO3 --> 3Cu(NO3)2 + 3H2SO4 + 8NO + 4H2O',
};

// ===== Получить уравнение по ключу =====
export function getReaction(key) {
  return REACTIONS[key] ?? null;
}

// ===== Разобрать уравнение на вещества =====
// Возвращает:
// {
//   левая часть:  [{ coefficient: 2, formula: 'KNO3' }],
//   правая часть: [{ coefficient: 2, formula: 'KNO2' }, { coefficient: 1, formula: 'O2' }],
//   text:  '2KNO3 --> 2KNO2 + O2'
// }
export function parseReaction(keyOrText) {
  const text = REACTIONS[keyOrText] ?? keyOrText;

  if (!text) return null;

  const [leftText, rightText] = String(text).split('-->');

  if (!rightText) return null;

  return {
    left: parseSide(leftText),
    right: parseSide(rightText),
    text,
  };
}

// Разбирает одну сторону уравнения ("2KNO2 + O2")
// в массив { coefficient, formula }
function parseSide(text) {
  return String(text)
    .split(/\s\+\s/) // разделитель — плюс С ПРОБЕЛАМИ; плюс без пробелов — часть формулы
    .map((t) => t.trim())
    .filter(Boolean)
    .map((token) => {
      // Коэффициент: числовой ИЛИ параметрический: n, (n+1), (3n+1)/2
      const m = /^(\d+|\(\d*n\+\d+\)\/\d+|\(\d*n\+\d+\)|n)(?=[A-Z(])(.+)$/.exec(
        token
      );

      if (m) {
        const raw = m[1];

        return {
          coefficient: /^\d+$/.test(raw) ? Number(raw) : NaN,
          coefficientRaw: /^\d+$/.test(raw) ? '' : raw,
          formula: m[2],
        };
      }

      return { coefficient: 1, coefficientRaw: '', formula: token };
    });
}

// ===== Коэффициент вещества в уравнении =====
// Возвращает число или null, если вещества в уравнении нет.
// Пример: getCoefficient('KNO3', 'O2') → 1
//         getCoefficient('KNO3', 'KNO3') → 2
export function getCoefficient(keyOrText, formula) {
  const parsed = parseReaction(keyOrText);

  if (!parsed) return null;

  const normalized = String(formula ?? '').trim();

  const found = [...parsed.left, ...parsed.right].find(
    (item) => item.formula === normalized
  );

  return found ? found.coefficient : null;
}
// Собирает сторону уравнения в текст с коэффициентами:
// [{2, KNO3}] → "2KNO3";  [{2, KNO2}, {1, O2}] → "2KNO2 + O2"
function sideToText(items) {
  return items
    .map((i) => {
      if (i.coefficientRaw) return `${i.coefficientRaw}${i.formula}`;

      return i.coefficient > 1 ? `${i.coefficient}${i.formula}` : i.formula;
    })
    .join(' + ');
}

// ===== Валентность металла-заглушки =====
// Римские числительные перечисляем от длинных к коротким,
// иначе «III» будет распознано как «I»

function extractValence(token) {
  const m = /^me\(?(vii|vi|iii|iv|ii|i)\)?$/i.exec(
    String(token ?? '').trim()
  );

  return m && m[1] ? m[1].toLowerCase() : null;
}

// MeIII, Me(II) → Me; обычные формулы не трогает
function baseFormula(token) {
  const t = String(token ?? '').trim();

  return /^me\(?(vii|vi|iii|iv|ii|i)\)?$/i.test(t) ? 'Me' : t;
}

// Валентность, зашитая в ключе реакции: MeIIIO2, Me(III)O2 → iii
function valenceFromKey(key) {
  const m = /me\(?(vii|vi|iii|iv|ii|i)\)?/i.exec(String(key ?? ''));

  return m && m[1] ? m[1].toLowerCase() : null;
}

// ===== Поиск реакции по списку реагентов =====
export function findReactionByReactants(reactants = [], catalyst = null) {
  const clean = reactants.map((r) => String(r ?? '').trim()).filter(Boolean);

  if (clean.length === 0) return null;

  const userValence =
    clean.map(extractValence).find((v) => v !== null) ?? null;

  const sortedBase = clean
    .map((r) => normalizeText(baseFormula(r)))
    .sort();

  const wanted = catalyst ? normalizeText(catalyst) : null;

  const condMatches = (cond) =>
    cond !== null &&
    wanted !== null &&
    (normalizeText(cond).includes(wanted) ||
      wanted.includes(normalizeText(cond)));

  let best = null;
  let bestScore = -1;

  for (const [key, text] of Object.entries(REACTIONS)) {
    const parsed = parseReaction(text);

    if (!parsed) continue;

    const leftBase = parsed.left
      .map((i) => normalizeText(baseFormula(i.formula)))
      .sort();

    if (
      leftBase.length !== sortedBase.length ||
      !leftBase.every((f, i) => f === sortedBase[i])
    ) {
      continue;
    }

    const keyValence = valenceFromKey(key);

    if (
      userValence !== null &&
      keyValence !== null &&
      keyValence !== userValence
    ) {
      continue;
    }

    const condition = REACTION_CONDITIONS[key] || null;

    // ===== Оценка подходящести =====
    let score = 1;

    if (userValence === null || keyValence === null || keyValence === userValence) {
      score += 1;
    }

    // Без катализатора предпочитаем реакцию без условия,
    // с катализатором — реакцию с подходящим условием
    if (wanted === null && condition === null) score += 2;
    if (wanted !== null && condMatches(condition)) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = { key, parsed, condition };
    }
  }

  if (!best) return null;

  return {
    key: best.key,
    leftText: sideToText(best.parsed.left),
    rightText: sideToText(best.parsed.right),
    catalyst: best.condition || '',
  };
}