import {Link} from 'react-router-dom';
import React from 'react';
import './Vxod.css';


export function Vxod() {
  return (
    <>
     <title>Вход в систему</title>
     <div className="container">
       <div className="login-panel">
         <h2>Вход</h2>
         <label htmlFor="email">почта</label>
         <input type="text" id="email" placeholder="your@email.com" />
         <label htmlFor="password">пароль</label>
         <input type="password" id="password" placeholder="••••••••" />
         <Link to="/osnova"
           className="btn-login">Войти &gt;&gt;</Link>
       </div>
       <div className="register-panel">
         <h2>Нет аккаунта?</h2>
         <p>Нажмите кнопку ниже <br />для регистрации.</p>
         <Link to="/reg"
         className="btn-register"
         >Зарегистрироваться &gt;&gt;</Link>
       </div>
     </div>
    </>
  )
}
