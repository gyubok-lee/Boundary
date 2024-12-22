import React, { useState, useEffect } from "react";
import "./Lab.css";

function Lab() {
  const [points, setPoints] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [latestPointIndex, setLatestPointIndex] = useState(null); 

  const boxSize = 400;
  const boxCenterX = boxSize / 2;
  const boxCenterY = boxSize / 2;
  const scaleX = 20;
  const scaleY = 20;
  const scaleZ = 20;

  const projectTo2D = (x, y, z) => {
    const screenX = boxCenterX + x * scaleX - y * scaleY * Math.cos(Math.PI / 4);
    const screenY = boxCenterY - z * scaleZ + y * scaleY * Math.cos(Math.PI / 4);
    return { screenX, screenY };
  };

  const fetchPoints = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/get-points");
      const data = await response.json();
      setPoints(data);
    } catch (error) {
      setErrorMessage("점 데이터를 가져오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const addPoint = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/add-point", {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "새로운 점 추가에 실패했습니다.");
        return;
      }
      const data = await response.json();
      setPoints(data);
      setLatestPointIndex(data.length - 1); // 최근 추가된 점의 인덱스를 설정
      setErrorMessage("");
    } catch (error) {
      setErrorMessage("서버와의 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const shakePoints = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/shake-points", {
        method: "POST",
      });
      const data = await response.json();
      setPoints(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage("서버와의 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  const axisEnd = boxSize / 2 / Math.max(scaleX, scaleY, scaleZ);

  const xAxis = {
    start: projectTo2D(-axisEnd, 0, 0),
    end: projectTo2D(axisEnd, 0, 0),
  };
 // 박스의 대각선 길이를 계산
const diagonalLength = Math.sqrt((boxSize / scaleX) ** 2 + (boxSize / scaleY) ** 2);

// Y축 길이를 박스 대각선 길이에 맞게 조정
const yAxis = {
  start: projectTo2D(0, -diagonalLength / 2, 0),
  end: projectTo2D(0, diagonalLength / 2, 0),
};
  const zAxis = {
    start: projectTo2D(0, 0, -axisEnd),
    end: projectTo2D(0, 0, axisEnd),
  };

  return (
    <div className="lab-container">
      <h1 className="lab-title custom-text2">Lab Sandbox</h1>

      <div className="lab-box">
        {/* 축 렌더링 */}
        <svg className="lab-axes" viewBox={`0 0 ${boxSize} ${boxSize}`}>
          {/* 화살표 마커 정의 */}
          <defs>
            <marker
              id="arrow-x"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L10,5 L0,10 Z" fill="red" />
            </marker>
            <marker
              id="arrow-y"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L10,5 L0,10 Z" fill="green" />
            </marker>
            <marker
              id="arrow-z"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L10,5 L0,10 Z" fill="blue" />
            </marker>
          </defs>

          {/* X축 */}
          <line
            x1={xAxis.start.screenX}
            y1={xAxis.start.screenY}
            x2={xAxis.end.screenX}
            y2={xAxis.end.screenY}
            className="lab-axis-x"
            markerEnd="url(#arrow-x)"
          />
          {/* Y축 */}
          <line
            x1={yAxis.start.screenX}
            y1={yAxis.start.screenY}
            x2={yAxis.end.screenX}
            y2={yAxis.end.screenY}
            className="lab-axis-y"
            markerEnd="url(#arrow-y)"
          />
          {/* Z축 */}
          <line
            x1={zAxis.start.screenX}
            y1={zAxis.start.screenY}
            x2={zAxis.end.screenX}
            y2={zAxis.end.screenY}
            className="lab-axis-z"
            markerEnd="url(#arrow-z)"
          />
        </svg>


        {/* 점 렌더링 */}
        {points.map((point, index) => {
          const { screenX, screenY } = projectTo2D(point.x, point.y, point.z);
          return (
            <div
              key={index}
              className={`lab-point ${
                index === latestPointIndex ? "lab-point-latest" : ""
              }`}
              style={{
                transform: `translate(${screenX}px, ${screenY}px)`,
              }}
              onMouseEnter={() => setHoveredPoint({ ...point, index })}
              onMouseLeave={() => setHoveredPoint(null)}
            >
            </div>
          );
        })}

         {/* 팝업 */}
         {hoveredPoint && (
          <div
            className="lab-popup custom-text2" 
            style={{
              top: `${
                boxCenterY -
                hoveredPoint.z * scaleZ -
                hoveredPoint.y * scaleY * Math.cos(Math.PI / 4)
              }px`,
              left: `${
                boxCenterX +
                hoveredPoint.x * scaleX -
                hoveredPoint.y * scaleY * Math.cos(Math.PI / 4)
              }px`,
            }}
          >
            번호: #{hoveredPoint.index + 1} <br />
            x: {hoveredPoint.x.toFixed(2)}, y: {hoveredPoint.y.toFixed(2)}, z:{" "}
            {hoveredPoint.z.toFixed(2)}
          </div>
        )}
      </div>

      <div className="lab-buttons custom-text2">
        <button onClick={addPoint} className="lab-button add" disabled={isLoading}>
          개체 추가
        </button>
        <button onClick={shakePoints} className="lab-button shake" disabled={isLoading}>
          섞기
        </button>
      </div>

      {errorMessage && <p className="lab-error">{errorMessage}</p>}
    </div>
  );
}

export default Lab;
