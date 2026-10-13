// Механизм «функция вызывает функцию»:
// превращает готовый результат одной функции
// в «виртуальную» строку «Дано» для другой функции.

export function resultToVirtualRow(result, formula, charText) {
  if (!result) {
    return null;
  }

  // Достаём вычисленное значение, как бы оно ни называлось в функции
  const value =
    result.value ??
    result.mass ??
    result.amount ??
    result.obyom ??
    result.massovayaDolya;

  // И единицу измерения
  const unit =
    result.unit ??
    result.massUnit ??
    result.amountUnit ??
    result.obyomUnit ??
    result.massovayaDolyaUnit ??
    '';

  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return null;
  }

  return {
    id: `virtual-${formula}-${charText}`,
    charText,
    formula,
    value: String(value),
    izmerenie: unit,
    isVirtual: true, // пометка, что строка вычислена, а не введена пользователем
  };
}

// ===== Склейка шагов решения без повторов =====
export function joinSteps(steps) {
  const atomic = [];

  for (const step of steps) {
    if (!step) continue;

    // разбиваем по переносам строк (новый разделитель шагов)
    for (const part of String(step).split('\n')) {
      const trimmed = part.trim();

      if (trimmed && !atomic.includes(trimmed)) {
        atomic.push(trimmed);
      }
    }
  }

  return atomic.join('\n');  
}