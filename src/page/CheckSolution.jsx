import React, { useRef, useState } from 'react';
import {checkSolutionByAI} from '../components/funcional/AiChecker'
import './CheckSolution.css';
import { formulaToSubscript } from '../components/funcional/FormatFormul';

export default function CheckSolution() {
  const inputRef = useRef(null);
  const [photo, setPhoto] = useState(null);     // сам файл
  const [preview, setPreview] = useState(null); // ссылка для показа
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState(null);   // { verdict, errors, summary } | { nokey, ... } | { error, ... }
  const [checking, setChecking] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ht_ya_key') || '');
  const [folderId, setFolderId] = useState(() => localStorage.getItem('ht_ya_folder') || '');
  const pretty = (text) =>
    formulaToSubscript(
      String(text)
        .replace(/->/g, ' → ')
        .replace(/\*/g, '·')
    );
  const acceptFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setResult({ verdict: 'error', errors: [], summary: 'Можно загружать только изображения (PNG, JPG).' });
      return;
    }

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleCheck = async () => {
    if (!photo || checking) return;

    if (!apiKey.trim() || !folderId.trim()) {
      setShowKey(true);
      setResult({
        verdict: 'nokey',
        errors: [],
        summary: 'Укажи API-ключ и folderId Yandex Cloud. Они хранятся только в твоём браузере и не передаются никуда, кроме сервиса проверки.',
      });
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const answer = await checkSolutionByAI(photo, apiKey.trim(), folderId.trim());
      setResult(answer);
    } catch (e) {
      setResult({ verdict: 'error', errors: [], summary: e.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="check-wrap">
      <p className="check-caption">Загрузи фотографию — и решение будет проверено.</p>

      {/* ===== Ключи Yandex Cloud ===== */}
      <div className="ai-key-row">
        <button className="ai-key-toggle" onClick={() => setShowKey((v) => !v)}>
          {showKey ? 'Скрыть настройки ИИ' : 'Настройки ИИ (ключи)'}
        </button>

        {showKey && (
          <>
            <input
              className="ai-key-input"
              type="password"
              placeholder="API-ключ (AQVN…)"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                localStorage.setItem('ht_ya_key', e.target.value);
              }}
            />
            <input
              className="ai-key-input"
              type="text"
              placeholder="folderId (b1g…)"
              value={folderId}
              onChange={(e) => {
                setFolderId(e.target.value);
                localStorage.setItem('ht_ya_folder', e.target.value);
              }}
            />
          </>
        )}
      </div>

      <div
        className={drag ? 'upload-zone drag' : 'upload-zone'}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img src={preview} alt="Фото решения" className="upload-preview" />
        ) : (
          <span>Нажми, чтобы загрузить фото, или перетащи файл в это окно</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>

      <button className="check-btn" disabled={!photo || checking} onClick={handleCheck}>
        {checking ? 'ИИ проверяет решение…' : 'Проверить решение'}
      </button>

      <div className="check-result">
        {result === null ? (
          <p className="result-placeholder">
            Здесь появится подтверждение, что решение правильное,
            или опровержение с указанием, в чём ошибки.
          </p>
        ) : result.verdict === 'correct' ? (
          <p className="result-ok">✔ Решение правильное! ИИ не нашёл ни арифметических, ни логических ошибок.</p>
        ) : result.verdict === 'nokey' ? (
          <p className="result-stub">{result.summary}</p>
        ) : result.verdict === 'error' ? (
          <p className="result-bad">{result.summary}</p>
        ) : (
          <>
            <div className="result-bad">
              <p>
                {result.verdict === 'incorrect'
                  ? '✘ Решение содержит ошибки:'
                  : '! Решение верно частично. Замечания:'}
              </p>
              {result.errors.length > 0 && (
              <ul className="result-error-list">
                {result.errors.map((err, i) => (
                  <li key={i}>{pretty(err)}</li>
                ))}
              </ul>
            )}
            </div>
            {result.summary && <p className="result-summary">{pretty(result.summary)}</p>}
          </>
        )}
      </div>
    </div>
  );
}