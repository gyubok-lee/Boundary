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
  const [scrollSpeed, setScrollSpeed] = useState(200); // Default speed (milliseconds)
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
  const [isLoading, setIsLoading] = useState(false);


  // State for Upload & Reset Box
  const [uploadBoxWidth, setUploadBoxWidth] = useState(300);
  const [uploadBoxHeight, setUploadBoxHeight] = useState(200);
  const [uploadBoxPosition, setUploadBoxPosition] = useState({ top: 600, left: 1100 });
  const isUploadDragging = useRef(false);
  const uploadDragStart = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef(null); // Reference to the file input


  // Default text reference for resetting
  const defaultTextRef = useRef('');


  // Fetch the initial text data
  useEffect(() => {
    const fetchTexts = async () => {
     const textFiles = ['/text1.txt', '/text2.txt', '/text3.txt'];
      const responses = await Promise.all(textFiles.map((file) => fetch(file)));
      const data = await Promise.all(responses.map((response) => response.text()));
      const mergedText = data.join(' ');
      defaultTextRef.current = mergedText; // Save default text for reset
      setFullText(mergedText);
      setDisplayText(mergedText.slice(0, 800));
    };

    fetchTexts();
  }, []);

  // Scrolling effect based on the scroll speed
  useEffect(() => {
    if (!isPaused && fullText) {
      const interval = setInterval(() => {
        setStartIndex((prevIndex) => (prevIndex + 1) % fullText.length);
      }, scrollSpeed);

      return () => clearInterval(interval);
    }
  }, [fullText, isPaused, scrollSpeed]);

  useEffect(() => {
    if (fullText) {
      const endIndex = startIndex + 800;
      const visibleText =
        endIndex <= fullText.length
          ? fullText.slice(startIndex, endIndex)
          : fullText.slice(startIndex) + fullText.slice(0, endIndex - fullText.length);
      setDisplayText(visibleText);
    }
  }, [startIndex, fullText]);

  // Handle speed slider change
  const handleSpeedChange = (event) => {
    const maxSpeed = 0; // Fastest scroll speed (in ms)
    const minSpeed = 1000; // Slowest scroll speed (in ms)
    const value = Number(event.target.value);

    // Invert the value to map slider position to scroll speed
    const invertedSpeed = minSpeed - value;
    setScrollSpeed(invertedSpeed);
  };

  const handleBoxClick = () => {
    setIsPaused((prev) => !prev); // Toggle pause/resume on text click
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
    setIsPaused(true);
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
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };


  // Dragging logic for upload/reset box
  const handleUploadMouseDown = (e) => {
    isUploadDragging.current = true;
    uploadDragStart.current = { x: e.clientX, y: e.clientY };
    document.addEventListener('mousemove', handleUploadMouseMove);
    document.addEventListener('mouseup', handleUploadMouseUp);
  };

  const handleUploadMouseMove = (e) => {
    if (!isUploadDragging.current) return;

    const deltaX = e.clientX - uploadDragStart.current.x;
    const deltaY = e.clientY - uploadDragStart.current.y;

    setUploadBoxPosition((prev) => ({
      top: prev.top + deltaY,
      left: prev.left + deltaX,
    }));

    uploadDragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleUploadMouseUp = () => {
    isUploadDragging.current = false;
    document.removeEventListener('mousemove', handleUploadMouseMove);
    document.removeEventListener('mouseup', handleUploadMouseUp);
  };

  // File upload handler
  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const uploadedText = e.target.result;
        setFullText(uploadedText);
        setDisplayText(uploadedText.slice(0, 800));
        setStartIndex(0);
        setIsPaused(false);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid .txt file.');
    }
  };

  // Reset to default text
  const resetToDefault = () => {
    setFullText(defaultTextRef.current);
    setDisplayText(defaultTextRef.current.slice(0, 800));
    setStartIndex(0);
    setIsPaused(false);

    // Clear the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset the file input
    }
  };

  return (
    <div className="clue-container">
      
      <div
        className="text-scroll"
        onClick={handleBoxClick}
        style={{
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
          top: `${boxPosition.top}px`,
          left: `${boxPosition.left}px`,
          position: 'absolute',
        }}
      >

        {/* Speed Control Sidebar */}
        <div className="speed-control">
          <label htmlFor="speedSlider" className="speed-label">
          </label>
          <input
            id="speedSlider"
            type="range"
            min="100" // Fastest speed
            max="980" // Slowest speed
            step="50" // Increment
            value={1000 - scrollSpeed}
            onChange={handleSpeedChange}
            className="speed-slider"
          />
        </div>
        
        <div className="draggable-header" onMouseDown={handleHeaderMouseDown}></div>
        <p className="scrolling-text custom-text">
          {displayText.split(/\s+/).map((word, index) => (
            <span
              key={index}
              className="hover-highlight"
              onMouseOver={(event) => handleMouseOverWord(word, event)}
              onMouseOut={handleMouseOut}
              onClick={() => handleWordClick(word)}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>

      {highlightedSentences && (
        <div className="popup-overlay" onClick={() => setHighlightedSentences(null)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <p className="word-count custom-text">{wordCount} occurrences</p>
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
            {isLoading ? 'Running...' : '텍스트 요약'}
          </button>
          {isLoading && <p className="loading-message custom-text">Running...</p>}
          {scriptOutput && <p className="script-output custom-text">{scriptOutput}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>

      {/* Upload and Reset Box */}
      <div
        className="upload-reset-box"
        style={{
          width: `${uploadBoxWidth}px`,
          height: `${uploadBoxHeight}px`,
          top: `${uploadBoxPosition.top}px`,
          left: `${uploadBoxPosition.left}px`,
        }}
      >
        <div className="draggable-header" onMouseDown={handleUploadMouseDown}></div>
        <div className="box-content custom-text2">
          <input
            type="file"
            accept=".txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="file-upload-input"
          />
          <button onClick={resetToDefault} className="reset-button">
            기본 텍스트 불러오기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClueInLetters;
