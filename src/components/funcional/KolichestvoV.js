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

  if (!normalized) {
    return NaN;
  }

  return Number(normalized);
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 4,
  }).format(value);
}

// Переводим объём в литры
function convertVolumeToLiters(value, unit) {
  const normalizedUnit = normalizeText(unit);

  if (normalizedUnit === 'мл') {
    return value / 1000;
  }

  if (normalizedUnit === 'м³' || normalizedUnit === 'м3') {
    return value * 1000;
  }

  return value; // уже литры
}

const MOLAR_VOLUME = 22.4;

// SolveTask вызывает функцию с аргументами:
// (danoRows, formula, findRow, givenRow)
export function KolichestvoV(danoRows = [], formula, findRow, givenRow) {
  const results = [];
  const errors = [];

  const normalizedFormula = normalizeText(formula);

  // =====================================================
  // ШАГ 1. Ищем строку с объёмом вещества
  // =====================================================
  const isVolumeRow = (row) => {
    const char = normalizeText(row.charText);
    return char.includes('объем вещества') || char.includes('объём вещества');
  };

  let volumeRow = null;

  if (
    givenRow &&
    isVolumeRow(givenRow) &&
    normalizeText(givenRow.formula) === normalizedFormula
  ) {
    volumeRow = givenRow;
  } else {
    volumeRow =
      [...danoRows]
        .reverse()
        .find(
          (row) =>
            normalizeText(row.formula) === normalizedFormula &&
            isVolumeRow(row)
        ) || null;
  }

  if (!volumeRow) {
    errors.push(`Для вещества ${formula}: в «Дано» нет объёма вещества.`);

    return { results, errors };
  }

  // =====================================================
  // ШАГ 2. Парсим объём и переводим в литры
  // =====================================================
  const volume = parseNumericValue(volumeRow.value);

  if (Number.isNaN(volume) || volume <= 0) {
    errors.push(`Для вещества ${formula}: объём указан некорректно.`);
    return { results, errors };
  }

  const volumeInLiters = convertVolumeToLiters(volume, volumeRow.izmerenie);

  // =====================================================
  // ШАГ 3. Считаем количество вещества: n = V / Vm
  // =====================================================
  const amount = volumeInLiters / MOLAR_VOLUME;
  const roundedAmount = Number(amount.toFixed(4));

  // Если объём пришлось переводить в литры — показываем перевод
  const volumeText =
    volumeInLiters !== volume
      ? `${formatNumber(volume)} ${volumeRow.izmerenie} = ${formatNumber(
          volumeInLiters
        )} л`
      : `${formatNumber(volumeInLiters)} л`;

  // ===== Текст решения: пояснение + формула =====
  const finalStep = `Вычислим количество вещества по формуле n = V / Vm. n(${formula}) = V / Vm = ${volumeText} / ${formatNumber(
    MOLAR_VOLUME
  )} л/моль = ${formatNumber(roundedAmount)} моль`;

  results.push({
    id: `kolichestvoV-${formula}`,
    formula,
    volume,
    volumeUnit: volumeRow.izmerenie || '',
    Vm: MOLAR_VOLUME,
    VmUnit: 'л/моль',
    amount: roundedAmount,
    amountUnit: 'моль',
    text: finalStep,
  });

  return {
    results,
    errors,
  };
}