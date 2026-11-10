import React, { useRef, useState } from 'react';
import './CheckSolution.css';

export default function CheckSolution() {
  const inputRef = useRef(null);
  const [photo, setPhoto] = useState(null);     // сам файл
  const [preview, setPreview] = useState(null); // ссылка для показа
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState(null);   // { ok, text } или { stub, text }

  const acceptFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setResult({ ok: false, text: 'Можно загружать только изображения (PNG, JPG).' });
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

  const handleCheck = () => {
    if (!photo) return;

    // ЗАГЛУШКА: сюда на следующем шаге встанет распознавание и сверка с эталоном
    setResult({
      stub: true,
      text: `Фото «${photo.name}» получено. Модуль распознавания и сверки будет подключён следующим шагом.`,
    });
  };

  return (
    <div className="check-wrap">
      <p className="check-caption">Загрузи фотографию — и решение будет проверено.</p>

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

      <button className="check-btn" disabled={!photo} onClick={handleCheck}>
        Проверить решение
      </button>

      <div className="check-result">
        {result === null ? (
          <p className="result-placeholder">
            Здесь появится подтверждение, что решение правильное,
            или опровержение с указанием, в чём ошибки.
          </p>
        ) : result.stub ? (
          <p className="result-stub">{result.text}</p>
        ) : result.ok ? (
          <p className="result-ok">Решение правильное! Так держать.</p>
        ) : (
          <div className="result-bad">
            <p>Решение содержит ошибки:</p>
            <p>{result.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}