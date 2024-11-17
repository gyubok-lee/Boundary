// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import ClueInLetters from './ClueInLetters/ClueInLetters';;

const MainPage = () => {
  const [hoverText, setHoverText] = useState('');
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const navigate = useNavigate();

  const handleMouseEnter = (text) => {
    setHoverText(text);
    setOverlayVisible(true);
  };

  const handleMouseLeave = () => {
    setOverlayVisible(false);
  };

  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${process.env.PUBLIC_URL + '/back.jpg'})`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center center',
      }}
    >
      {isOverlayVisible && (
        <div className="overlay">
          <p className="overlay-text">{hoverText}</p>
        </div>
      )}

      <header className="side-bar">
        <h1 className="app-title custom-text2" >The Boundary </h1>
        <p className="subtitle custom-text2">일상과 공상의 경계</p>
        <div className="divider"></div>
        <nav className="nav-links">
          <button
            className="nav-button custom-text2"
            onMouseEnter={() => handleMouseEnter('텍스트 마이닝')}
            onMouseLeave={handleMouseLeave}
            onClick={() => navigate('/clue-in-letters')}
          >
            The Clue in Letters
          </button>
          <button
            className="nav-button custom-text2"
            onMouseEnter={() => handleMouseEnter('이상현상 찾기')}
            onMouseLeave={handleMouseLeave}
          >
            The Observer
          </button>
          <button
            className="nav-button custom-text2"
            onMouseEnter={() => handleMouseEnter('좋아하는 노래를 나만의 노래로')}
            onMouseLeave={handleMouseLeave}
          >
            The Night Was Rain
          </button>
          <button
            className="nav-button custom-text2"
            onMouseEnter={() => handleMouseEnter('사진에 화풍을 넣다')}
            onMouseLeave={handleMouseLeave}
          >
            Our Gallery
          </button>
        </nav>
      </header>
    </div>
  );
};

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/clue-in-letters" element={<ClueInLetters />} />
    </Routes>
  </Router>
);

export default App;
