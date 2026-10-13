// SaveDocx.js
// Сохраняет «Дано», «Уравнения», «Найти» и «Решение» в файл .docx

import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

// ===== Разбивает текст на куски: цифры после букв становятся нижними индексами =====
// (H2O → H₂O, но коэффициент "2KNO3" остаётся обычным)
function toRuns(text) {
  const runs = [];
  const tokens = String(text ?? '').split(/(\d+)/);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (!token) continue;

    const prev = tokens[i - 1] || '';
    const isDigits = /^\d+$/.test(token);
    const afterLetter = /[A-Za-zА-Яа-я)]$/.test(prev);

    if (isDigits && afterLetter) {
      runs.push(new TextRun({ text: token, subScript: true }));
    } else {
      runs.push(new TextRun({ text: token }));
    }
  }

  return runs;
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}

export async function saveToDocx({
  danoRows = [],
  naytiRows = [],
  uravneniaRows = [],
  solutionResult = null,
}) {
  const children = [];

  // ===== Заголовок =====
  children.push(
    new Paragraph({
      alignment: 'center',
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Расчётная задача по химии', bold: true, size: 32 }),
      ],
    })
  );

  // ===== ДАНО =====
  children.push(sectionTitle('Дано:'));

  if (danoRows.length === 0) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: '—', italics: true })] })
    );
  }

  danoRows.forEach((row) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${row.charText}: ` }),
          ...toRuns(row.formula),
          new TextRun({ text: ` = ${row.value} ${row.izmerenie || ''}` }),
        ],
      })
    );
  });
  
  // ===== НАЙТИ =====
  children.push(sectionTitle('Найти:'));

  if (naytiRows.length === 0) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: '—', italics: true })] })
    );
  }

  naytiRows.forEach((row) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${row.charText}: ` }),
          ...toRuns(row.formula),
          new TextRun({ text: ` = ${row.value || '?'} ${row.izmerenie || ''}` }),
        ],
      })
    );
  });

  // ===== УРАВНЕНИЯ =====
  if (uravneniaRows.length > 0) {
    children.push(sectionTitle('Уравнения:'));

    uravneniaRows.forEach((row) => {
      const runs = [
        ...toRuns(row.reactionLeft || row.vesh1 || ''),
        new TextRun({ text: ' → ' }),
        ...toRuns(row.reactionRight || ''),
      ];

      if (row.catalyst) {
        runs.push(new TextRun({ text: `  (${row.catalyst})`, italics: true }));
      }

      children.push(new Paragraph({ children: runs }));
    });
  }


  // ===== РЕШЕНИЕ =====
  children.push(sectionTitle('Решение:'));

  const hasResults =
    solutionResult &&
    (solutionResult.results.length > 0 || solutionResult.errors.length > 0);

  if (!hasResults) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Решение не выполнено.', italics: true })],
      })
    );
  } else {
    solutionResult.results.forEach((res, index) => {
      // Каждый шаг цепочки — с новой строки
      String(res.text || '')
        .split('\n')
        .forEach((step, stepIndex) => {
          const trimmed = step.trim();

          if (!trimmed) return;

          children.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: `${index + 1}.${stepIndex + 1}  `, bold: true }),
                ...toRuns(trimmed),
              ],
            })
          );
        });
    });

    (solutionResult.errors || []).forEach((err) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: String(err), color: 'C00000' })],
        })
      );
    });
  }

  // ===== Сборка и скачивание =====
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const date = new Date().toISOString().slice(0, 10);

  saveAs(blob, `zadacha_${date}.docx`);
}