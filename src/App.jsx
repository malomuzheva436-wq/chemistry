import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import React from 'react';
import { Welcome } from './page/Welcome';
import {Osnova} from './page/Osnova';

function App() {
  return (
    <>
    <Router>
      <main className="container content">
        <Routes>
            <Route path="/osnova" element={<Osnova/>}/>
            <Route exact path="/" element={<Welcome/>}/>
        </Routes>
      </main>
    </Router>
    </>
  );
}

export default App;
