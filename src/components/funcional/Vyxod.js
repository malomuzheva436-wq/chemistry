// Помощники для работы с выходом продукта реакции (η)

import { parseReaction } from './Uravnenia';

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

// Металл-заглушка с валентностью (MeIII, Me(II) и т.п.) равен просто Me
function normalizeMetal(value) {
  const f = String(value ?? '').trim();

  return /^me\(?(i|ii|iii|iv|v|vi|vii)\)?$/.test(f) ? 'me' : f;
}

function sameFormula(a, b) {
  return normalizeMetal(normalizeText(a)) === normalizeMetal(normalizeText(b));
}

function getParsedReaction(row) {
  if (!row) return null;

  if (row.reactionKey) {
    const byKey = parseReaction(row.reactionKey);
    if (byKey) return byKey;
  }

  if (row.reactionText) {
    const byText = parseReaction(row.reactionText);
    if (byText) return byText;
  }

  if (row.reactionLeft && row.reactionRight) {
    return parseReaction(`${row.reactionLeft} --> ${row.reactionRight}`);
  }

  return null;
}

// ===== Найти строку «Выход продукта» для вещества =====
export function findYieldRow(danoRows = [], formula) {
  return (
    [...danoRows]
      .reverse()
      .find(
        (row) =>
          sameFormula(row.formula, formula) &&
          normalizeText(row.charText).includes('выход')
      ) || null
  );
}

// ===== Разобрать процент выхода (0–100) =====
export function parseYieldPercent(row) {
  if (!row) return null;

  const normalized = String(row.value ?? '')
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '');

  const v = Number(normalized);

  if (Number.isNaN(v) || v <= 0 || v > 100) return null;

  return v;
}

// ===== Является ли вещество продуктом (справа) в уравнениях =====
export function isProduct(uravneniaRows = [], formula) {
  return (uravneniaRows || []).some((row) => {
    const parsed = getParsedReaction(row);

    if (!parsed) return false;

    return parsed.right.some((i) => sameFormula(i.formula, formula));
  });
}