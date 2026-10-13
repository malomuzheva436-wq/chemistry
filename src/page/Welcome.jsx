import React from 'react';
import {Link} from 'react-router-dom';
import './Welcome.css';

const features = [
  { icon: '🧮', text: 'Расчёт массы, объёма, количества вещества и числа молекул' },
  { icon: '🧪', text: 'Решение задач по уравнениям реакций (цепочки до 3 уравнений)' },
  { icon: '🔍', text: 'Определение формул веществ: органика, металлы, неизвестные составы' },
  { icon: '⚖️', text: 'Задачи на избыток и недостаток, выход продукта реакции' },
  { icon: '💧', text: 'Работа с растворами: плотность, массовая доля' },
  { icon: '💡', text: 'Режим подсказок для самостоятельного решения задач' },
  { icon: '📄', text: 'Экспорт готового решения в документ Word (.docx)' },
];

export function Welcome() {

  return (
    <div className="welcome-container">
      {/* ===== Основной контент ===== */}
      <div className="welcome-content">
        <h1 className="welcome-title">
          <span className="welcome-title-accent">Хим</span>Тьютер
        </h1>

        <p className="welcome-subtitle">
          Добро пожаловать в веб-приложение <b>ХимТьютер</b>!
        </p>

        <p className="welcome-description">
          Это идеальный помощник для решения расчётных задач по химии.
          Приложение поможет школьникам и студентам разобраться в типовых
          и нестандартных задачах — от простого нахождения количества вещества
          до определения формулы неизвестного вещества. (Разработано для защиты дипломной работы Грушелевской М.Д.)
        </p>

        <h2 className="welcome-features-title">Что умеет ХимТьютер:</h2>

        <ul className="welcome-features">
          {features.map((f, i) => (
            <li key={i} className="welcome-feature">
              <span className="welcome-feature-icon">{f.icon}</span>
              <span className="welcome-feature-text">{f.text}</span>
            </li>
          ))}
        </ul>

        <Link to="/osnova" 
          className="welcome-start-btn">
          Начать
          <span className="welcome-arrow">→</span>
        </Link>
      </div>
    </div>
  );
}