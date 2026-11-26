// AiChecker.js
// Проверка решения по фото через мультимодальную Qwen3.6 35B в Yandex AI Studio.
// Формат запроса — официальный пример документации (OpenAI-совместимый API).
// Запросы идут через прокси CRA (см. "proxy" в package.json).

const API_URL = '/v1/chat/completions';
const MODEL_SUFFIX = 'qwen3.6-35b-a3b';

const SYSTEM_PROMPT = `
Ты — опытный учитель химии и строгий проверяющий. Тебе дают фотографию рукописного решения расчётной задачи по химии.

Порядок работы:
1. Перепиши про себя всё, что видишь: «Дано», уравнение реакции, ход вычислений, ответ.
2. Проверь УРАВНЕНИЕ РЕАКЦИИ: сходится ли баланс атомов, правильно ли расставлены коэффициенты.
3. Проверь МОЛЬНЫЕ СООТНОШЕНИЯ: в каждом шаге, где количества веществ связаны через уравнение, сверь коэффициенты (например, если по уравнению 2HCl -> 1H2, то n(H2) должно быть вдвое меньше n(HCl), а не равно ему).
4. Проверь АРИФМЕТИКУ: подстановки чисел, деление/умножение, молярные массы, округления.
5. Проверь ЛОГИКУ и единицы измерения: тот ли путь решения, те ли размерности.

Формулы веществ записывай обычными цифрами (H2SO4, MgCl2, H2), коэффициенты — цифрой перед формулой, стрелку реакции как "->".
Запрещено использовать LaTeX, символ $ и обратные косые черты: формулы и индексы пиши обычным текстом (H2SO4, m2, омега-2 или словами).
Фотография может быть повёрнута на 90 или 180 градусов — сначала мысленно поверни её правильно, затем читай.
Пиши сразу итоговый JSON: без черновых рассуждений, без повторов одних и тех же фраз.
Если фото не читается или ты не уверена в чтении данных, не гадай и не повторяйся: ответь {"verdict":"incorrect","errors":["Не удалось разобрать решение на фото"],"summary":"Проверка не выполнена: нужно более чёткое и ровное фото."}

Ошибки описывай конкретно: «в строке ... написано ..., а должно быть ..., потому что ...».
Если решение верное — похвали кратко.

Ответь СТРОГО одним JSON-объектом без markdown и лишних слов:
{
  "verdict": "correct" | "partially" | "incorrect",
  "errors": ["конкретная ошибка с указанием строки и причины"],
  "summary": "2-3 предложения общего вывода на русском"
}
Если ошибок нет — "errors": [].
Если изображение не читается, ответь:
{"verdict":"incorrect","errors":["Изображение не читается"],"summary":"Нужно более чёткое фото."}
`;

const USER_TEXT = 'Это фото решения задачи по химии. Проверь его и ответь JSON по инструкции.';

// Сжатие изображения в браузере: <=1280 px, JPEG 0.85 — бережём токены и лимиты
async function fileToCompressedBase64(file, maxSide = 1280) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  const bytes = new Uint8Array(await blob.arrayBuffer());

  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }

  return btoa(bin);
}

export async function checkSolutionByAI(file, apiKey, folderId) {
  const base64 = await fileToCompressedBase64(file);

  const body = {
    model: `gpt://${folderId}/${MODEL_SUFFIX}`,
    temperature: 0.2,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_TEXT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      },
    ],
  };

  const send = async () => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Yandex AI Studio ответила ошибкой ${res.status}: ${t.slice(0, 250)}`);
    }

    return res.json();
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const data = await send();
    const text = extractText(data);

    if (text && !isDegenerate(text)) {
      return parseAiAnswer(text);
    }
  }

  return FAIL_RESULT; // обе попытки неудачны — честное «не удалось»
}

// Достаёт текст ответа из любых полей OpenAI-совместимого формата
function extractText(data) {
  const msg = data?.choices?.[0]?.message ?? {};

  if (typeof msg.content === 'string') return msg.content;

  if (Array.isArray(msg.content)) {
    return msg.content.map((p) => (p && p.text) || '').join('');
  }

  return '';
}

function isDegenerate(text) {
  if (/(.{40,}?)\1{2,}/.test(text)) return true; // одна фраза 3+ раза подряд

  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  if (sentences.length < 6) return false;

  const uniq = new Set(sentences).size;

  return sentences.length / uniq > 2.5; // больше 60% повторов
}

const FAIL_RESULT = {
  verdict: 'error',
  errors: [],
  summary:
    'Проверить решение не удалось: модель не смогла разобрать фото или зациклилась. Сфотографируй лист крупнее, ровнее и без поворота, затем повтори проверку.',
};

function parseAiAnswer(text) {
  const cleaned = String(text)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const m = cleaned.match(/\{[\s\S]*\}/);

  if (!m || isDegenerate(cleaned)) return FAIL_RESULT;

  const raw = m[0];

  const variants = [
    raw,
    raw.replace(/\\(?![\\"/bfnrtu])/g, '\\\\'),
    raw.replace(/\\(?![\\"/bfnrtu])/g, '\\\\').replace(/,\s*([}\]])/g, '$1'),
  ];

  for (const variant of variants) {
    try {
      const obj = JSON.parse(variant);

      // Обрезаем всё, что может раздуть интерфейс
      const errors = (Array.isArray(obj.errors) ? obj.errors : [])
        .map((e) => String(e))
        .filter((e) => !isDegenerate(e))
        .slice(0, 8)
        .map((e) => (e.length > 500 ? `${e.slice(0, 500)}…` : e));

      const summary = String(obj.summary || '');
        return {
        verdict: obj.verdict || 'partially',
        errors,
        summary: isDegenerate(summary)
          ? ''
          : summary.length > 800
            ? `${summary.slice(0, 800)}…`
            : summary,
      };
    } catch {
      // пробуем следующий вариант ремонта
    }
  }

  return FAIL_RESULT;
}