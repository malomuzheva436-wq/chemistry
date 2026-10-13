// Hint.js
// Строит из полного текста решения «подсказку»:
// только шаги-формулы и конечный ответ.

export function buildHint(text) {
    const steps = String(text || '')
    .split('\n') 
    .map((s) => s.trim())
    .filter(Boolean);

  const hintSteps = [];
  let answer = '';

  steps.forEach((step, index) => {
    const isLast = index === steps.length - 1;

    // Служебные шаги (проверка на недостаток) — без чисел
        if (step.includes('Проверка')) {
      hintSteps.push(step.split(':')[0].trim());
      return;
    }

    // Отделяем пояснение: всё до первого ". "
    let note = '';
    let formulaStep = step;

    const dotIndex = step.indexOf('. ');

    if (dotIndex > 0) {
      note = step.slice(0, dotIndex).trim();
      formulaStep = step.slice(dotIndex + 2).trim();
    }

    const parts = formulaStep
      .split('=')
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const formulaHint = `${parts[0]} = ${parts[1]}`;

      hintSteps.push(note ? `${note}: ${formulaHint}` : formulaHint);

      if (isLast) {
        answer = `${parts[0]} = ${parts[parts.length - 1]}`;
      }
    } else {
      hintSteps.push(step);

      if (isLast) answer = formulaStep;
    }
  });

  return {
    steps: hintSteps,
    answer,
  };
}