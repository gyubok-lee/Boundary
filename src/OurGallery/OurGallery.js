import React, { useState, useEffect, useRef } from 'react';
import './OurGallery.css';

const imageNames = ['/img1.jpeg', '/img2.jpeg', '/img3.jpeg', '/img4.jpeg', '/img5.jpeg', '/img6.jpeg', '/img7.jpeg'];

const OurGallery = () => {
    const [upperHallStyle, setUpperHallStyle] = useState({ top: '10%', left: '25%', rotation: 0 });
    const [lowerHallStyle, setLowerHallStyle] = useState({ top: '70%', left: '25%', rotation: 0 });
    const [upperSpeed, setUpperSpeed] = useState(1);
    const [lowerSpeed, setLowerSpeed] = useState(1);

    const upperRef = useRef(null);
    const lowerRef = useRef(null);

    const reversedImages = [...imageNames].reverse();
    const lowerImages = [...reversedImages, ...reversedImages]; // 두 번 반복


    // Calculate speed for each hall based on rotation
    const calculateGravitySpeed = (rotation, isUpper) => {
        const normalizedRotation = ((rotation % 360) + 360) % 360; // Normalize to 0-360

        const effectiveRotation = normalizedRotation > 180
            ? normalizedRotation - 360 // Convert to -180 to 180
            : normalizedRotation;

        // Calculate speed factor
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

        const baseSpeed = 0.5; // Default speed
        const maxSpeedMultiplier = 3; // Speed scaling factor
        return baseSpeed + speedFactor * maxSpeedMultiplier;
    };

    // Update upper hall speed independently
    useEffect(() => {
        const newSpeed = calculateGravitySpeed(upperHallStyle.rotation, true); // true for upper hall
        setUpperSpeed(newSpeed);
    }, [upperHallStyle.rotation]);

    // Update lower hall speed independently
    useEffect(() => {
        const newSpeed = calculateGravitySpeed(lowerHallStyle.rotation, false); // false for lower hall
        setLowerSpeed(newSpeed);
    }, [lowerHallStyle.rotation]);

    // Scroll logic for upper hall images (right to left)
    useEffect(() => {
        let upperScrollPosition = 0;
    
        const upperScrollInterval = setInterval(() => {
            if (upperRef.current) {
                upperScrollPosition -= upperSpeed;
                // Reset position if scroll exceeds half of the scroll width
                if (Math.abs(upperScrollPosition) >= upperRef.current.scrollWidth / 2) {
                    upperScrollPosition = 0;
                }
                upperRef.current.style.transform = `translateX(${upperScrollPosition}px)`;
            }
        }, 30);
    
        return () => {
            clearInterval(upperScrollInterval);
        };
    }, [upperSpeed]);
    
    useEffect(() => {
        let lowerScrollPosition = -(lowerRef.current.scrollWidth/2);
    
        const lowerScrollInterval = setInterval(() => {
            if (lowerRef.current) {
                lowerScrollPosition +=  lowerSpeed; // Move left
                if (lowerScrollPosition >= 0) {
                    lowerScrollPosition = -(lowerRef.current.scrollWidth/2); // Reset position
                }
                lowerRef.current.style.transform = `translateX(${lowerScrollPosition}px)`;
            }
        }, 30);
    
        return () => {
            clearInterval(lowerScrollInterval);
        };
    }, [lowerSpeed]);
    
    
    // Dragging the hall
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

    // Rotating the hall
    const handleRotateHall = (e, hallType) => {
        const hall = hallType === 'upper' ? upperHallStyle : lowerHallStyle;
        const setHallStyle = hallType === 'upper' ? setUpperHallStyle : setLowerHallStyle;
    
        const startY = e.clientY; // Initial mouse Y position
        const initialRotation = hall.rotation; // Capture the starting rotation
    
        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY; // Vertical mouse movement
            const newRotation = initialRotation + deltaY * 0.2; // Calculate rotation relative to start
            setHallStyle({ ...hall, rotation: newRotation }); // Update rotation
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
            {/* Upper Hall */}
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
                >
                    <span className="rotation-display">{`${Math.round(upperHallStyle.rotation)}°`}</span>
                </div>
            </div>

            {/* Lower Hall */}
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
                            <img key={`lower-${index}`} src={name} alt={`Image ${index}`} />
                        ))}
                    </div>
                </div>
                <div
                    className="rotate-boundary boundary-right"
                    onMouseDown={(e) => handleRotateHall(e, 'lower')}
                >
                    <span className="rotation-display">{`${Math.round(lowerHallStyle.rotation)}°`}</span>
                </div>
            </div>
        </div>
    );
};

export default OurGallery;
