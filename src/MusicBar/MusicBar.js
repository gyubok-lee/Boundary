import React, { useState } from 'react';
import './MusicBar.css';

const MusicBar = () => {
    const [aiAudio, setAiAudio] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // 기존 파일을 불러와서 FormData에 추가
    const generateAiAudio = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            // 기존 파일을 fetch로 가져와 Blob으로 변환
            const sourceResponse = await fetch('/source2.wav');
            const styleResponse = await fetch('/style.wav');
            const sourceBlob = await sourceResponse.blob();
            const styleBlob = await styleResponse.blob();

            const formData = new FormData();
            formData.append('source', new File([sourceBlob], "source2.wav", { type: "audio/wav" }));
            formData.append('style', new File([styleBlob], "style.wav", { type: "audio/wav" }));

            // Flask API 호출
            const response = await fetch('http://localhost:5000/music-trans', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('음원 변환 실패');

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            setAiAudio(audioUrl);
        } catch (error) {
            console.error("AI 음원 생성 오류:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="music-bar">
            {/* 소스 음원 플레이어 */}
            <div className="player">
                <h3>소스 음원</h3>
                <audio controls>
                    <source src="/source2.wav" type="audio/wav" />
                    브라우저가 오디오 태그를 지원하지 않습니다.
                </audio>
            </div>

            {/* 스타일 음원 플레이어 */}
            <div className="player">
                <h3>스타일 음원</h3>
                <audio controls>
                    <source src="/style.wav" type="audio/wav" />
                    브라우저가 오디오 태그를 지원하지 않습니다.
                </audio>
            </div>

            {/* AI 음원 플레이어 */}
            <div className="player">
                <h3>AI 음원</h3>
                <audio controls disabled={!aiAudio}>
                    {aiAudio ? <source src={aiAudio} type="audio/wav" /> : null}
                    브라우저가 오디오 태그를 지원하지 않습니다.
                </audio>
                <button className="generate-btn" onClick={generateAiAudio} disabled={isGenerating}>
                    {isGenerating ? "AI음원 제작 중..." : "AI음원 제작"}
                </button>
            </div>
        </div>
    );
};

export default MusicBar;
