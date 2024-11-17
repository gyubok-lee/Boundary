import React, { useEffect, useState, useRef } from 'react';
import './ClueInLetters.css';

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const ClueInLetters = () => {
  const [fullText, setFullText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightedSentences, setHighlightedSentences] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [hoveredWord, setHoveredWord] = useState('');
  const [hoverPosition, setHoverPosition] = useState(null);

  // State for resizing (text-scroll box)
  const [boxWidth, setBoxWidth] = useState(800);
  const [boxHeight, setBoxHeight] = useState(800);

  // State for moving (text-scroll box)
  const [boxPosition, setBoxPosition] = useState({ top: 50, left: 100 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // State for Python box (new box)
  const [pythonBoxWidth, setPythonBoxWidth] = useState(500);
  const [pythonBoxHeight, setPythonBoxHeight] = useState(500);
  const [pythonBoxPosition, setPythonBoxPosition] = useState({ top: 50, left: 1100 });
  const isPythonDragging = useRef(false);
  const pythonDragStart = useRef({ x: 0, y: 0 });

  // State for Python script output
  const [scriptOutput, setScriptOutput] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // New state for "Running..."


  // Fetch the initial text data
  useEffect(() => {
    const fetchTexts = async () => {
      const textFiles = ['/text1.txt', '/text2.txt', '/text3.txt'];
      const responses = await Promise.all(textFiles.map((file) => fetch(file)));
      const data = await Promise.all(responses.map((response) => response.text()));
      const mergedText = data.join(' ');
      setFullText(mergedText);
      setDisplayText(mergedText.slice(0, 800));
    };

    fetchTexts();
  }, []);

  // Scroll the text when not paused
  useEffect(() => {
    if (!isPaused && fullText) {
      const interval = setInterval(() => {
        setStartIndex((prevIndex) => (prevIndex + 1) % fullText.length);
      }, 200);

      return () => clearInterval(interval);
    }
  }, [fullText, isPaused]);

  // Update the displayed text as it scrolls
  useEffect(() => {
    if (fullText && !highlightedSentences) {
      const endIndex = startIndex + 800;
      const visibleText =
        endIndex <= fullText.length
          ? fullText.slice(startIndex, endIndex)
          : fullText.slice(startIndex) + fullText.slice(0, endIndex - fullText.length);
      setDisplayText(visibleText);
    }
  }, [startIndex, fullText, highlightedSentences]);

  const handleBoxClick = (e) => {
    // Check if clicked on a blank area
    if (!e.target.classList.contains('hover-highlight')) {
      // Toggle the flow state
      setIsPaused((prev) => !prev);
    }
  };

  const handleWordClick = (word) => {
    const escapedWord = escapeRegExp(word);

    const sentences = fullText
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => sentence.toLowerCase().includes(escapedWord.toLowerCase()));

    setWordCount(sentences.length);

    const highlighted = sentences
      .map((sentence) =>
        sentence.replace(
          new RegExp(`(${escapedWord})`, 'gi'),
          '<span class="highlight">$1</span>'
        )
      )
      .join('<br/><br/>');

    setHighlightedSentences(highlighted);
    setIsPaused(true); // Pause scrolling when showing matches
  };

  const handleMouseOverWord = (word, event) => {
    const escapedWord = escapeRegExp(word);
    setHoveredWord(word);
    setHoverPosition({
      top: event.clientY,
      left: event.clientX,
    });

    const wordOccurrences = fullText.match(new RegExp(`\\b${escapedWord}\\b`, 'gi')) || [];
    setWordCount(wordOccurrences.length);
  };

  const handleMouseOut = () => {
    setHoveredWord('');
    setHoverPosition(null);
  };

  const handleHeaderMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    setBoxPosition((prev) => ({
      top: prev.top + deltaY,
      left: prev.left + deltaX,
    }));

    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handlePythonMouseDown = (e) => {
    isPythonDragging.current = true;
    pythonDragStart.current = { x: e.clientX, y: e.clientY };
    document.addEventListener('mousemove', handlePythonMouseMove);
    document.addEventListener('mouseup', handlePythonMouseUp);
  };

  const handlePythonMouseMove = (e) => {
    if (!isPythonDragging.current) return;

    const deltaX = e.clientX - pythonDragStart.current.x;
    const deltaY = e.clientY - pythonDragStart.current.y;

    setPythonBoxPosition((prev) => ({
      top: prev.top + deltaY,
      left: prev.left + deltaX,
    }));

    pythonDragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePythonMouseUp = () => {
    isPythonDragging.current = false;
    document.removeEventListener('mousemove', handlePythonMouseMove);
    document.removeEventListener('mouseup', handlePythonMouseUp);
  };

  const runPythonScript = async () => {
    try {
      setIsLoading(true); // Show "Running..." sign
      const response = await fetch('http://localhost:5000/run-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: displayText }),
      });

      const data = await response.json();
      if (response.ok) {
        setScriptOutput(data.output);
        setError(null);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Error connecting to the backend');
    } finally {
      setIsLoading(false); // Hide "Running..." sign
    }
  };

  return (
    <div className="clue-container">
      {/* Text Display Box */}
      <div
        className="text-scroll"
        onClick={handleBoxClick} // Handles flow stop/restart for blank space
        style={{
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
          top: `${boxPosition.top}px`,
          left: `${boxPosition.left}px`,
          position: 'absolute',
        }}
      >
        <div className="draggable-header" onMouseDown={handleHeaderMouseDown}></div>
        <p className="scrolling-text custom-text">
          {displayText.split(/\s+/).map((word, index) => (
            <span
              key={index}
              className="hover-highlight"
              onMouseOver={(event) => handleMouseOverWord(word, event)}
              onMouseOut={handleMouseOut}
              onClick={() => handleWordClick(word)} // Handles word searching
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>

      {/* Display matched sentences */}
      {highlightedSentences && (
        <div className="popup-overlay" onClick={() => setHighlightedSentences(null)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <p className="word-count custom-text">{wordCount}개의 같은 단어가 있습니다</p>
            <div
              className="popup-text custom-text"
              dangerouslySetInnerHTML={{ __html: highlightedSentences }}
            ></div>
            <button className="close-button" onClick={() => setHighlightedSentences(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Python Runner Box */}
      <div
        className="python-box"
        style={{
          width: `${pythonBoxWidth}px`,
          height: `${pythonBoxHeight}px`,
          top: `${pythonBoxPosition.top}px`,
          left: `${pythonBoxPosition.left}px`,
          position: 'absolute',
        }}
      >
        <div className="draggable-header" onMouseDown={handlePythonMouseDown}></div>
        <div className="script-runner custom-text">
          <button onClick={runPythonScript} disabled={isLoading}>
            {isLoading ? 'Running...' : '핵심 문장 추출'}
          </button>
          {isLoading && <p className="loading-message custom-text">Running...</p>} {/* Show "Running..." */}
          {scriptOutput && <p className="script-output custom-text">{scriptOutput}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ClueInLetters;
