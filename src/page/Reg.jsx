import React from 'react';
import {Link} from 'react-router-dom';
import './Reg.css'

export function Reg() {
  return (
    <>
     <div className="container">
     {/* Левая панель - Подсказка для входа */}
       <div className="login-panel">
         <h2>Есть аккаунт?</h2>
         <p>Нажмите кнопку ниже<br />для входа в аккаунт.</p>
         <Link to="/"
         className="btn-login-prompt"
         >Войти &gt;&gt;</Link>
       </div>

     {/* Правая панель - Форма регистрации */}
       <div className="register-panel">
         <h2>Регистрация</h2>
         <label htmlFor="email">почта</label>
         <input type="email" id="email" placeholder="your@email.com" />
         <label htmlFor="password">пароль</label>
         <input type="password" id="password" placeholder="••••••••" />
         <label htmlFor="password-confirm">пароль</label>
         <input type="password" id="password-confirm" placeholder="••••••••" />
         <Link to="/"
         className="btn-register"
         >Зарегистрироваться &gt;&gt;</Link>
       </div>
     </div>
    </>
  )
}