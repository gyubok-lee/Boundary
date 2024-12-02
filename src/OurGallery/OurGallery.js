import React, { useState, useEffect, useRef } from 'react';
import './OurGallery.css';

const imageNames = ['/img1.jpeg', '/img2.jpeg', '/img3.jpeg', '/img4.jpeg', '/img5.jpeg', '/img6.jpeg', '/img7.jpeg'];
const convertedNames = ['/stylized1.jpg', '/stylized2.jpg', '/stylized3.jpg', '/stylized4.jpg', '/stylized5.jpg', '/stylized6.jpg', '/stylized7.jpg'];

const OurGallery = () => {
    const [upperHallStyle, setUpperHallStyle] = useState({ top: '5%', left: '10%', rotation: 0 });
    const [lowerHallStyle, setLowerHallStyle] = useState({ top: '75%', left: '10%', rotation: 0 });
    const [upperSpeed, setUpperSpeed] = useState(1);
    const [lowerSpeed, setLowerSpeed] = useState(1);

    const [uploadedImage, setUploadedImage] = useState(null);
    const [selectedStyle, setSelectedStyle] = useState('');
    const [transformedImage, setTransformedImage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const upperRef = useRef(null);
    const lowerRef = useRef(null);

    const reversedImages = [...convertedNames].reverse();
    const lowerImages = [...reversedImages, ...reversedImages];

    const calculateGravitySpeed = (rotation, isUpper) => {
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const effectiveRotation = normalizedRotation > 180 ? normalizedRotation - 360 : normalizedRotation;
        let speedFactor;
        if (effectiveRotation >= 0 && effectiveRotation <= 90) {
            speedFactor = isUpper ? 1 - effectiveRotation / 90 : 1 + effectiveRotation / 90;
        } else if (effectiveRotation > 90 && effectiveRotation <= 180) {
            const adjustedRotation = effectiveRotation - 90;
            speedFactor = isUpper ? 1 + adjustedRotation / 90 : 2 - adjustedRotation / 90;
        } else if (effectiveRotation > -90 && effectiveRotation <= 0) {
            speedFactor = isUpper ? 1 + Math.abs(effectiveRotation) / 90 : 1 - Math.abs(effectiveRotation) / 90;
        } else if (effectiveRotation > -180 && effectiveRotation <= -90) {
            const adjustedRotation = Math.abs(effectiveRotation) - 90;
            speedFactor = isUpper ? 2 - adjustedRotation / 90 : 1 + adjustedRotation / 90;
        }
        const baseSpeed = 0.5;
        const maxSpeedMultiplier = 3;
        return baseSpeed + speedFactor * maxSpeedMultiplier;
    };

    useEffect(() => {
        const newSpeed = calculateGravitySpeed(upperHallStyle.rotation, true);
        setUpperSpeed(newSpeed);
    }, [upperHallStyle.rotation]);

    useEffect(() => {
        const newSpeed = calculateGravitySpeed(lowerHallStyle.rotation, false);
        setLowerSpeed(newSpeed);
    }, [lowerHallStyle.rotation]);

    useEffect(() => {
        let upperScrollPosition = 0;
        const upperScrollInterval = setInterval(() => {
            if (upperRef.current) {
                upperScrollPosition -= upperSpeed;
                if (Math.abs(upperScrollPosition) >= upperRef.current.scrollWidth / 2) {
                    upperScrollPosition = 0;
                }
                upperRef.current.style.transform = `translateX(${upperScrollPosition}px)`;
            }
        }, 30);
        return () => clearInterval(upperScrollInterval);
    }, [upperSpeed]);

    useEffect(() => {
        let lowerScrollPosition = -(lowerRef.current.scrollWidth / 2);
        const lowerScrollInterval = setInterval(() => {
            if (lowerRef.current) {
                lowerScrollPosition += lowerSpeed;
                if (lowerScrollPosition >= 0) {
                    lowerScrollPosition = -(lowerRef.current.scrollWidth / 2);
                }
                lowerRef.current.style.transform = `translateX(${lowerScrollPosition}px)`;
            }
        }, 30);
        return () => clearInterval(lowerScrollInterval);
    }, [lowerSpeed]);

    const runImageTransform = async () => {
        if (!uploadedImage) {
            setErrorMessage('이미지를 업로드해주세요.');
            return;
        }
        if (!selectedStyle) {
            setErrorMessage('화풍을 선택해주세요.');
            return;
        }
    
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('style', selectedStyle);
    
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/run-img', {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                setErrorMessage(errorData.error || '변환 실패');
                return;
            }
    
            // Blob으로 변환된 이미지 처리
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob); // Blob 데이터를 URL로 변환
            setTransformedImage(imageUrl); // 이미지 URL을 상태로 저장
            setErrorMessage('');
        } catch (error) {
            setErrorMessage('서버와 통신 중 오류 발생');
        } finally {
            setIsLoading(false);
        }
    };
    

    const handleHallDrag = (e, hallType) => {
        const hall = hallType === 'upper' ? upperHallStyle : lowerHallStyle;
        const setHallStyle = hallType === 'upper' ? setUpperHallStyle : setLowerHallStyle;

        const startX = e.clientX;
        const startY = e.clientY;

        const initialTop = parseFloat(hall.top);
        const initialLeft = parseFloat(hall.left);

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const newTop = initialTop + (deltaY / window.innerHeight) * 100;
            const newLeft = initialLeft + (deltaX / window.innerWidth) * 100;

            setHallStyle({ ...hall, top: `${newTop}%`, left: `${newLeft}%` });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleRotateHall = (e, hallType) => {
        const hall = hallType === 'upper' ? upperHallStyle : lowerHallStyle;
        const setHallStyle = hallType === 'upper' ? setUpperHallStyle : setLowerHallStyle;

        const startY = e.clientY;
        const initialRotation = hall.rotation;

        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newRotation = initialRotation + deltaY * 0.2;
            setHallStyle({ ...hall, rotation: newRotation });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div className="gallery-container">
            {/* 상단 홀 */}
            <div
                className="hall-container"
                style={{
                    top: upperHallStyle.top,
                    left: upperHallStyle.left,
                    transform: `rotate(${upperHallStyle.rotation}deg)`,
                }}
            >
                <div
                    className="hall"
                    onMouseDown={(e) => handleHallDrag(e, 'upper')}
                >
                    <div className="image-track" ref={upperRef}>
                        {[...imageNames, ...imageNames].map((name, index) => (
                            <img key={index} src={name} alt={`Image ${index}`} />
                        ))}
                    </div>
                </div>
                <div
                    className="rotate-boundary boundary-right"
                    onMouseDown={(e) => handleRotateHall(e, 'upper')}
                ></div>
            </div>

            {/* 중간 박스 */}
            <div className="middle-boxes">
                <div className="left-box">
                    <h3>이미지 업로드 및 화풍 선택</h3>
                    <input type="file" accept="image/*" onChange={(e) => setUploadedImage(e.target.files[0])} />
                    <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)}>
                        <option value="">화풍을 선택해주세요</option>
                        <option value="동양화">동양화</option>
                        <option value="르네상스">르네상스</option>
                        <option value="인상주의">인상주의</option>
                        <option value="추상">추상</option>
                    </select>
                    <button onClick={runImageTransform}>화풍 변환</button>
                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                </div>
                <div className="right-box">
                    <h3>변환된 이미지</h3>
                    {isLoading ? (
                        <p>변환 중입니다...</p>
                    ) : transformedImage ? (
                        <div>
                            <img src={transformedImage} alt="Transformed" />
                            <button onClick={() => window.open(transformedImage, '_blank')}>다운로드</button>
                        </div>
                    ) : (
                        <p>변환된 이미지가 여기에 표시됩니다.</p>
                    )}
                </div>
            </div>

            {/* 하단 홀 */}
            <div
                className="hall-container"
                style={{
                    top: lowerHallStyle.top,
                    left: lowerHallStyle.left,
                    transform: `rotate(${lowerHallStyle.rotation}deg)`,
                }}
            >
                <div
                    className="hall"
                    onMouseDown={(e) => handleHallDrag(e, 'lower')}
                >
                    <div className="image-track" ref={lowerRef}>
                        {lowerImages.map((name, index) => (
                            <img key={index} src={name} alt={`Lower Image ${index}`} />
                        ))}
                    </div>
                </div>
                <div
                    className="rotate-boundary boundary-right"
                    onMouseDown={(e) => handleRotateHall(e, 'lower')}
                ></div>
            </div>
        </div>
    );
};

export default OurGallery;
