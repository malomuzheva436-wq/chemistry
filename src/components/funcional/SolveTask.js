import { KolichestvoM } from './KolichestvoM';
import { KolichestvoV } from './KolichestvoV';
import { KolichestvoN } from './KolichestvoN';
import { Massa } from './Massa';
import { Obyom } from './Obyom';
import { MassaR } from './MassaR';
import { MassDolya } from './MassDolya';
import { Molekula } from './Molekula';
import { MolarFormula } from './MolarFormula';
import { MassaVody } from './MassaVody';
import { ObyomP } from './ObyomP';
import { PlotnostR } from './PlotnostR';
import { ObyomVody } from './ObyomVody';
import { KolichestvoUravnenie, VyxedProdukta } from './KolichestvoUravnenie';
import { resultToVirtualRow, joinSteps } from './VirtualRow';
import { buildHint } from './Hint';
import { FormulaFinder } from './FormulaFinder';

// Максимальное количество пунктов в блоке "Найти"
const MAX_NAYTI_ITEMS = 3;

// ===== Вспомогательные функции =====

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function isVolumeGiven(row) {
  const char = normalizeText(row.charText);

  if (char.includes('объем раствора')) {
    return false;
  }

  return char.includes('объем') || char.includes('объём');
}

function isMoleculesGiven(row) {
  return normalizeText(row.charText).includes('молекул');
}

function findLastByCondition(rows, condition) {
  return [...rows].reverse().find(condition) || null;
}

// ===== Приведение ответа от функций расчёта к одному виду =====
function normalizeAnswer(answer, solverName, formula) {
  if (!answer) {
    return {
      results: [],
      errors: [`Функция ${solverName} не вернула результат.`],
    };
  }

  if (typeof answer === 'string' || typeof answer === 'number') {
    return {
      results: [
        {
          id: `${solverName}-${formula}`,
          formula,
          text: String(answer),
        },
      ],
      errors: [],
    };
  }

  if (Array.isArray(answer)) {
    const results = answer.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return {
          id: item.id ?? `${solverName}-${formula}-${index}`,
          formula,
          ...item,
        };
      }

      return {
        id: `${solverName}-${formula}-${index}`,
        formula,
        text: String(item),
      };
    });

    return {
      results,
      errors: [],
    };
  }

  if (typeof answer === 'object') {
    const results = [];
    const errors = [];

    if (Array.isArray(answer.results)) {
      answer.results.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          results.push({
            id: item.id ?? `${solverName}-${formula}-${index}`,
            formula,
            ...item,
          });
        } else {
          results.push({
            id: `${solverName}-${formula}-${index}`,
            formula,
            text: String(item),
          });
        }
      });
    }

    if (Array.isArray(answer.errors)) {
      errors.push(...answer.errors.map(String));
    }

    if (answer.error !== undefined) {
      errors.push(String(answer.error));
    }

    if (results.length === 0) {
      if (answer.text !== undefined) {
        results.push({
          id: `${solverName}-${formula}`,
          formula,
          text: String(answer.text),
        });
      } else if (answer.result !== undefined) {
        const nested = normalizeAnswer(answer.result, solverName, formula);

        results.push(...nested.results);
        errors.push(...nested.errors);
      }
    }

    if (results.length > 0 || errors.length > 0) {
      return {
        results,
        errors,
      };
    }
  }

  return {
    results: [],
    errors: [`Не удалось распознать ответ функции ${solverName}.`],
  };
}

// ===== Безопасный вызов функции расчёта =====
function callSolver(solver, solverName, payload) {
  if (typeof solver !== 'function') {
    return {
      results: [],
      errors: [`Функция ${solverName} не подключена.`],
    };
  }

  try {
    const answer = solver(
      payload.danoRows,
      payload.formula,
      payload.findRow,
      payload.givenRow
    );

    return normalizeAnswer(answer, solverName, payload.formula);
  } catch (error) {
    return {
      results: [],
      errors: [`Ошибка при вызове функции ${solverName}: ${error.message}`],
    };
  }
}

// ===== Диспетчер для поиска количества вещества =====
function resolveKol({ danoRows, formula, findRow }) {
  const normalizedFormula = normalizeText(formula);

  const rowsForFormula = danoRows.filter(
    (row) => normalizeText(row.formula) === normalizedFormula
  );

  if (rowsForFormula.length === 0) {
    return {
      results: [],
      errors: [`Для вещества ${formula}: в блоке «Дано» нет данных.`],
    };
  }

  const volumeRow = findLastByCondition(rowsForFormula, isVolumeGiven);
  const moleculesRow = findLastByCondition(rowsForFormula, isMoleculesGiven);

  const payload = {
    danoRows,
    formula,
    findRow,
    rowsForFormula,
  };

  if (volumeRow) {
    return callSolver(KolichestvoV, 'KolichestvoV', {
      ...payload,
      givenRow: volumeRow,
    });
  }

  if (moleculesRow) {
    return callSolver(KolichestvoN, 'KolichestvoN', {
      ...payload,
      givenRow: moleculesRow,
    });
  }

  return callSolver(KolichestvoM, 'KolichestvoM', {
    ...payload,
    givenRow: null,
  });
}

// ===== Диспетчер для поиска массы вещества =====
function resolveMass({ danoRows, formula, findRow }) {
  const normalizedFormula = normalizeText(formula);

  const isWater =
    normalizedFormula === 'h2o' || normalizedFormula === 'вода';

  const hasWaterOwnData = danoRows.some(
    (row) => normalizeText(row.formula) === normalizedFormula
  );

  if (isWater && !hasWaterOwnData) {
    return callSolver(MassaVody, 'MassaVody', {
      danoRows,
      formula,
      findRow,
      givenRow: null,
    });
  }

  return callSolver(Massa, 'Massa', {
    danoRows,
    formula,
    findRow,
    givenRow: null,
  });
}

// ===== Диспетчер для поиска массы раствора =====
function resolveMassR({ danoRows, formula, findRow }) {
  const normalizedFormula = normalizeText(formula);

  const rowsForFormula = danoRows.filter(
    (row) => normalizeText(row.formula) === normalizedFormula
  );

  if (rowsForFormula.length === 0) {
    return {
      results: [],
      errors: [`Для вещества ${formula}: в блоке «Дано» нет данных.`],
    };
  }

  return callSolver(MassaR, 'MassaR', {
    danoRows,
    formula,
    findRow,
    rowsForFormula,
    givenRow: null,
  });
}

// ===== Главная функция SolveTask =====
export function SolveTask({ danoRows = [], naytiRows = [], uravneniaRows = [] }) {
  const results = [];
  const errors = [];

  if (!naytiRows.length) {
    errors.push('Добавьте в «Найти», что нужно найти.');

    return { results, errors };
  }

  if (naytiRows.length > MAX_NAYTI_ITEMS) {
    errors.push(
      `В блоке «Найти» может быть не более ${MAX_NAYTI_ITEMS} пунктов.`
    );

    return { results, errors };
  }

  if (!danoRows.length) {
    errors.push('Данные отсутствуют. Заполните «Дано».');

    return { results, errors };
  }

  // ===== Активный список уравнений =====
  // Пополняется «открытыми» конкретными уравнениями из FormulaFinder
  let equations = [...uravneniaRows];
  const discoveredEquations = [];   // ← НОВОЕ
  const formulaCache = new Map();

  // ===== Маршрутизация одного запроса «Найти» =====
  function routeFind(danoLocal, equationsLocal, formulaLocal, findRowLocal) {
    const target = normalizeText(findRowLocal.charText);
    let answer;

    if (target.includes('количество вещества')) {
      answer = resolveKol({
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
      });
    } else if (target.includes('масса вещества')) {
      answer = resolveMass({
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
      });
    } else if (target.includes('объем вещества')) {
      const nf = normalizeText(formulaLocal);

      if (nf === 'h2o' || nf === 'вода') {
        answer = callSolver(ObyomVody, 'ObyomVody', {
          danoRows: danoLocal,
          formula: formulaLocal,
          findRow: findRowLocal,
          givenRow: null,
        });
      } else {
        answer = callSolver(Obyom, 'Obyom', {
          danoRows: danoLocal,
          formula: formulaLocal,
          findRow: findRowLocal,
          givenRow: null,
        });
      }
    } else if (target.includes('объем раствора')) {
      answer = callSolver(ObyomP, 'ObyomP', {
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
        givenRow: null,
      });
    } else if (target.includes('масса раствора')) {
      answer = resolveMassR({
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
      });
    } else if (target.includes('массовая доля')) {
      answer = callSolver(MassDolya, 'MassDolya', {
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
        givenRow: null,
      });
    } else if (target.includes('молекул')) {
      answer = callSolver(Molekula, 'Molekula', {
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
        givenRow: null,
      });
    } else if (target.includes('молярная масса')) {
      answer = callSolver(MolarFormula, 'MolarFormula', {
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
        givenRow: null,
      });
    } else if (target.includes('плотность раствора')) {
      answer = callSolver(PlotnostR, 'PlotnostR', {
        danoRows: danoLocal,
        formula: formulaLocal,
        findRow: findRowLocal,
        givenRow: null,
      });
    } else if (target.includes('выход продукта')) {
      answer = normalizeAnswer(
        VyxedProdukta(danoLocal, equationsLocal, formulaLocal, findRowLocal),
        'VyxodProdukta',
        formulaLocal
      );
    } else if (target.includes('формула')) {
      answer = normalizeAnswer(
        FormulaFinder(danoLocal, equationsLocal, formulaLocal, findRowLocal),
        'FormulaFinder',
        formulaLocal
      );
    } else {
      answer = {
        results: [],
        errors: [`Неизвестный запрос в «Найти»: ${findRowLocal.charText}.`],
      };
    }

    return answer;
  }

  // ===== ПРЕДПРОХОД: строки «Формула вещества» решаются первыми =====
  // Если FormulaFinder «открывает» конкретное уравнение (например, горение алкана),
  // оно дописывается в список equations и становится доступным остальным строкам.
  for (const findRow of naytiRows) {
    const target = normalizeText(findRow.charText);

    if (!target.includes('формула')) continue;

    const formula = String(findRow.formula ?? '').trim();

    if (!formula) continue;

    const ans = FormulaFinder(danoRows, equations, formula, findRow);
    const normalized = normalizeAnswer(ans, 'FormulaFinder', formula);

    formulaCache.set(findRow.id, normalized);

    if (ans && ans.discoveredReaction) {
      const { leftText, rightText } = ans.discoveredReaction;
      
      // НОВОЕ: запоминаем для показа в интерфейсе
      discoveredEquations.push({ leftText, rightText });

      equations = [
        ...equations,
        {
          id: `virtual-eq-${findRow.id}`,
          reactionKey: null,
          reactionText: null,
          reactionLeft: leftText,
          reactionRight: rightText,
          isVirtual: true,
        },
      ];

      equations = [
        ...equations,
        {
          id: `virtual-eq-${findRow.id}`,
          reactionKey: null,
          reactionText: null,
          reactionLeft: leftText,
          reactionRight: rightText,
          isVirtual: true,
        },
      ];
    }
  }

  // ===== Основной цикл по строкам «Найти» =====
  naytiRows.forEach((findRow, index) => {
    const formula = String(findRow.formula ?? '').trim();

    if (!formula) {
      errors.push(
        `В «Найти» строка ${index + 1}: не указана формула вещества.`
      );

      return;
    }

    // Если это строка «Формула вещества» — берём из кеша
    let answer;

    if (
      normalizeText(findRow.charText).includes('формула') &&
      formulaCache.has(findRow.id)
    ) {
      answer = formulaCache.get(findRow.id);
    } else {
      answer = routeFind(danoRows, equations, formula, findRow);
    }

    // ===== Уравнительный fallback (использует актуальный список equations) =====
    if (answer.results.length === 0 && equations.length > 0) {
      const urAnswer = KolichestvoUravnenie(
        danoRows,
        equations,
        formula,
        findRow
      );

      if (urAnswer.results.length > 0) {
        const virtualRow = resultToVirtualRow(
          urAnswer.results[0],
          formula,
          'Количество вещества'
        );

        if (virtualRow) {
          const second = routeFind(
            [...danoRows, virtualRow],
            equations,
            formula,
            findRow
          );

          if (second.results.length > 0) {
            answer = {
              results: second.results.map((r) => ({
                ...r,
                text: joinSteps([urAnswer.results[0].text, r.text]),
              })),
              errors: second.errors,
            };
          } else {
            answer = {
              results: [],
              errors: [
                ...urAnswer.errors,
                ...second.errors,
              ],
            };
          }
        }
      } else {
        answer = {
          results: [],
          errors: [...answer.errors, ...urAnswer.errors],
        };
      }
    }

    // ===== Собираем результаты / ошибки =====
    if (answer.results.length > 0) {
      answer.results.forEach((result, resultIndex) => {
        results.push({
          ...result,
          id: `find-${findRow.id ?? index}-${result.id ?? resultIndex}`,
        });
      });
    } else {
      errors.push(...answer.errors);
    }
  });

  return {
    results: results.map((r) => ({
      ...r,
      hint: buildHint(r.text),
    })),
    errors: [...new Set(errors)],
    discoveredEquations,
  };
}