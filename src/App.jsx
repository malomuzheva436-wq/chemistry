import {HashRouter, Routes, Route} from 'react-router-dom';
import React from 'react';
import { Welcome } from './page/Welcome';
import {Osnova} from './page/Osnova';

function App() {
  return (
    <>
    <HashRouter>
      <main className="container content">
        <Routes>
            <Route path="/osnova" element={<Osnova/>}/>
            <Route exact path="/" element={<Welcome/>}/>
        </Routes>
      </main>
    </HashRouter>
    </>
  );
}

export default App;
