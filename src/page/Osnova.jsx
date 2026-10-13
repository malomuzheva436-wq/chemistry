import React, { useState, useCallback } from 'react';
import './Osnova.css';
import {Link} from 'react-router-dom';
import ModalDano from '../components/ModalDano';
import ModalNayti from '../components/ModalNayti';
import ModalUravnenia from '../components/ModalUravnenia';
import { SolveTask } from '../components/funcional/SolveTask';
import { formulaToSubscript } from '../components/funcional/FormatFormul';
import { findReactionByReactants } from '../components/funcional/Uravnenia';
import { saveToDocx } from '../components/funcional/SaveDocx';
import { buildHint } from '../components/funcional/Hint';

export function Osnova() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState('hint');
  const [activeModal, setActiveModal] = useState(null);
  const [solutionResult, setSolutionResult] = useState(null);

  const [danoRows, setDanoRows] = useState([]);
  const [naytiRows, setNaytiRows] = useState([]);
  const [uravneniaRows, setUravneniaRows] = useState([]);

  const openModal = useCallback((type) => {
    setActiveModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const toggleMode = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  const addDanoRow = useCallback((data) => {
    setDanoRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...data,
      },
    ]);
  }, []);

  const addNaytiRow = useCallback((data) => {
    setNaytiRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...data,
      },
    ]);
  }, []);

  // Максимальное количество уравнений в задаче
  const MAX_URAVNENIA_ITEMS = 3;

  const addUravneniaRow = (formData) => {
  // ===== Ограничение: не более 3 уравнений =====
  if (uravneniaRows.length >= MAX_URAVNENIA_ITEMS) {
    setSolutionResult((prev) => ({
      results: prev ? prev.results : [],
      errors: [
        ...(prev ? prev.errors : []),
        `В задаче можно использовать не более ${MAX_URAVNENIA_ITEMS} уравнений.`,
      ],
    }));
    return;
  }

  // Извлекаем реагенты и катализатор из формы модального окна
  const reactants = [formData.vesh1, formData.vesh2, formData.vesh3]
    .map((v) => v?.trim() || '')
    .filter(Boolean);

  const catalystValue = formData.catalyst || '';

  // Ищем уравнение в словаре по левой части (с учётом катализатора)
  const match = findReactionByReactants(reactants, catalystValue);

  // ===== Уравнение НЕ найдено — выводим ошибку и не добавляем строку =====
  if (!match) {
    setSolutionResult((prev) => ({
      results: prev ? prev.results : [],
      errors: [
        ...(prev ? prev.errors : []),
        `Реакция «${reactants.join(' + ')}»: такой реакции не существует или её ещё нет в списке программы.`,
      ],
    }));
    return;
  }

  // ===== Уравнение найдено — добавляем строку =====
  const newRow = {
    id: Date.now(),
    reactionKey: match.key,
    reactionLeft: match.leftText,
    reactionRight: match.rightText,
    // Условие из словаря важнее пустого поля;
    // если пользователь выбрал катализатор сам — оставляем его
    catalyst: match.catalyst || catalystValue || '',
  };
  
  setUravneniaRows((prev) => [...prev, newRow]);
};

  const removeDanoRow = useCallback((id) => {
    setDanoRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const removeNaytiRow = useCallback((id) => {
    setNaytiRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const removeUravneniaRow = useCallback((id) => {
    setUravneniaRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  // диспетчер вызова функций
  const handleSolveTask = () => {
    const answer = SolveTask({
      danoRows,
      naytiRows,
      uravneniaRows,
    });
    setSolutionResult(answer);
  };

  // ===== Очистить решение =====
  const handleClearSolution = () => {
    setSolutionResult(null);
  };

  // ===== Сохранить в .docx =====
  const handleSaveDocx = async () => {
    try {
      await saveToDocx({ danoRows, naytiRows, uravneniaRows, solutionResult });
    } catch (error) {
      alert(`Не удалось сохранить документ: ${error.message}`);
    }
  };

  return (
    <>
      {/* ===== Кнопка-бургер (видна только на телефонах) ===== */}
      {!menuOpen && (
        <button
          className="burger-btn"
          onClick={() => setMenuOpen(true)}
          title="Открыть меню"
          aria-label="Открыть меню"
        >
          <span />
          <span />
          <span />
        </button>
      )}

      {/* ===== Затемнение под открытым меню ===== */}
      {menuOpen && (
        <div
          className="menu-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="container">
        <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
          {/* ===== Крестик закрытия (виден только на телефонах) ===== */}
          <button
            className="sidebar-close-btn"
            onClick={() => setMenuOpen(false)}
            title="Закрыть меню"
            aria-label="Закрыть меню"
          >
            ×
          </button>
          <div className="sidebar-title">Основное меню</div>

          <button className="sidebar-btn active">Решить задачу</button>

          <button
            className="sidebar-btn"
            onClick={() => openModal('history')}
          >
            В разработке
          </button>

          <hr className="sidebar-divider" />

          <div className="toggle-label">Режим решения:</div>

          <div className="toggle-container">
            <div
              className={`toggle-slider ${
                mode === 'solution' ? 'slide-right' : ''
              }`}
            />

            <button
              className={`toggle-btn ${mode === 'hint' ? 'active' : ''}`}
              onClick={() => toggleMode('hint')}
            >
              Подсказка
            </button>

            <button
              className={`toggle-btn ${mode === 'solution' ? 'active' : ''}`}
              onClick={() => toggleMode('solution')}
            >
              Решение
            </button>
          </div>

          <Link to="/" className="sidebarred-btn" >
            Выход
          </Link>
        </aside>

        <main className="main-content">
          <div className="panel">
            <div className="section">
              <div className="panel-header">
                <span className="section-label" style={{ marginBottom: 0 }}>
                  Дано:
                </span>

                <button
                  className="add-btn"
                  onClick={() => openModal('dano')}
                >
                  +
                </button>
              </div>

              <div className="content-area">
                {danoRows.map((row) => (
                  <div key={row.id} className="data-row">
                    <span className="label-text">{row.charText}:</span>
                    <span>{formulaToSubscript(row.formula)}</span>

                    <span className="equals-sign" style={{ fontSize: 14 }}>
                      =
                    </span>

                    <span className="value-text">{row.value}</span>
                    <span style={{ color: '#95d5b2' }}>{row.izmerenie}</span>

                    <button
                      className="remove-btn"
                      onClick={() => removeDanoRow(row.id)}
                      title="Удалить"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <div className="panel-header">
                <span className="section-label" style={{ marginBottom: 0 }}>
                  Найти:
                </span>

                <button
                  className="add-btn"
                  onClick={() => openModal('nayti')}
                >
                  +
                </button>
              </div>

              <div className="content-area">
                {naytiRows.map((row) => (
                  <div key={row.id} className="data-row">
                    <span className="label-text">{row.charText}:</span>
                    <span>{formulaToSubscript(row.formula)}</span>

                    <span className="equals-sign" style={{ fontSize: 14 }}>
                      =
                    </span>

                    <span
                      className="question-mark"
                      style={{ fontSize: 14, color: '#b7e4c7' }}
                    >
                      ?
                    </span>

                    <span style={{ color: '#95d5b2' }}>{row.izmerenie}</span>

                    <button
                      className="remove-btn"
                      onClick={() => removeNaytiRow(row.id)}
                      title="Удалить"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel panel-right">
            <div className="panel-header">
              <span className="panel-title">Решение:</span>
              <button
                className="add-btn"
                onClick={() => openModal('reshenie')}
                disabled={uravneniaRows.length >= MAX_URAVNENIA_ITEMS}
                title={
                  uravneniaRows.length >= MAX_URAVNENIA_ITEMS
                    ? `Максимум ${MAX_URAVNENIA_ITEMS} уравнения`
                    : 'Добавить уравнение'
                }
              >
                +
              </button>
            </div>

            <div className="content-area solution-area">
              {uravneniaRows.map((row) => (
                <div key={row.id} className="reaction-row">
                  <span className="reactant">
                    {formulaToSubscript(row.reactionLeft)}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    {row.catalyst && (
                      <span className="catalyst-text">{row.catalyst}</span>
                    )}
                    <span className="arrow">{'---->'}</span>
                  </div>
                  <span className="reactant">
                    {formulaToSubscript(row.reactionRight)}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => removeUravneniaRow(row.id)}
                    title="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))}
              {solutionResult && (
                <div className="solution-results-scroll">
                  {solutionResult.errors.length > 0 && (
                    <div className="solution-errors">
                      {solutionResult.errors.map((error, index) => (
                        <div key={index} className="solution-error">
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                  {solutionResult.results.length > 0 ? (
                    solutionResult.results.map((item) => {
                      const hint = buildHint(item.text);

                      return (
                        <div key={item.id} className="solution-result-item">
                          {mode === 'hint' ? (
                            <>
                              <ol className="hint-steps">
                                {(hint.steps || []).map((step, i) => (
                                  <li key={i}>
                                    {formulaToSubscript(step)}
                                  </li>
                                ))}
                              </ol>

                              {hint.answer && (
                                <div className="hint-answer">
                                  <b>Ответ:</b> {formulaToSubscript(hint.answer)}
                                </div>
                              )}
                            </>
                          ) : (
                            // ===== Режим "Решение": построчный вывод =====
                            <div className="solution-lines">
                              {String(item.text || '')
                                .split('\n')
                                .map((step, i) => {
                                  const trimmed = step.trim();

                                  if (!trimmed) return null;

                                  // Пояснение — всё до первого ". "
                                  const dotIndex = trimmed.indexOf('. ');
                                  const hasNote = dotIndex > 0;
                                  const note = hasNote
                                    ? trimmed.slice(0, dotIndex + 1)
                                    : null;
                                  const formulaPart = hasNote
                                    ? trimmed.slice(dotIndex + 2)
                                    : trimmed;

                                  return (
                                    <div key={i} className="solution-step">
                                      {note && (
                                        <div className="solution-note">
                                          {formulaToSubscript(note)}
                                        </div>
                                      )}
                                      <div className="solution-formula">
                                        {formulaToSubscript(formulaPart)}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    solutionResult.errors.length === 0 && (
                      <div className="solution-result-item">
                        Нет данных для расчёта.
                      </div>
                    )
                  )}
                </div>
              )}
              {/* ===== Кнопки появляются только после нажатия «Решить» ===== */}
              {solutionResult !== null && (
                <div className="solution-toolbar">
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Удалить решение"
                    onClick={handleClearSolution}
                  >
                    ✕
                  </button>
                  <button
                    className="icon-btn icon-btn-save"
                    title="Сохранить в .docx"
                    onClick={handleSaveDocx}
                  >
                    💾
                  </button>
                </div>
              )}
            </div>

            <div className="solve-btn-wrapper">
              <button className="solve-btn" onClick={handleSolveTask}>
                Решить
              </button>
            </div>
          </div>
        </main>
      </div>

      {activeModal === 'dano' && (
        <ModalDano onClose={closeModal} onSubmit={addDanoRow} />
      )}

      {activeModal === 'nayti' && (
        <ModalNayti onClose={closeModal} onSubmit={addNaytiRow} />
      )}

      {activeModal === 'reshenie' && (
        <ModalUravnenia onClose={closeModal} onSubmit={addUravneniaRow} />
      )}
    </>
  );
}