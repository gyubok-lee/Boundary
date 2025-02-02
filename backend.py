from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

import io
import os
import re
import nltk
from nltk.tokenize import sent_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import networkx as nx
from langdetect import detect
import random

from transformers import pipeline
from googletrans import Translator
from transformers import pipeline
from googletrans import Translator
from nltk.corpus import stopwords
from sklearn.cluster import DBSCAN

import tensorflow as tf
import tensorflow_hub as hub
import matplotlib.pyplot as plt
from PIL import Image

import librosa
import soundfile as sf

# 추출적 요약
def extractive_summary(text, num_sentences=1):
    english_stopwords = stopwords.words('english')
    korean_stopwords = ['의', '가', '이', '은', '들', '는', '좀', '잘', '걍', '과', '도', '를', '으로', '자', '에', '와', '한', '하다']

    def split_sentences(text, lang): # 간단한 규칙 기반 문장 분리
        if lang == 'ko':  # 한글일 경우
            # 정규식을 활용한 한글 문장 분리
            sentences = re.split(r'(?<=[.!?])\s+', text)
        elif lang == 'en':  # 영어일 경우
            # nltk를 활용한 영어 문장 분리
            sentences = sent_tokenize(text)
        else:
            raise ValueError("지원하지 않는 언어입니다.")
        return [sentence.strip() for sentence in sentences if sentence.strip()]

    def get_stopwords(lang): # 언어별 불용어 반환
        if lang == 'ko':
            return korean_stopwords
        elif lang == 'en':
            return english_stopwords
        else:
            return []
        
    lang = detect(text)
    sentences = split_sentences(text, lang)

    stop_words = get_stopwords(lang)
    vectorizer = TfidfVectorizer(stop_words=stop_words)
    tfidf_matrix = vectorizer.fit_transform(sentences)

    similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
    nx_graph = nx.from_numpy_array(similarity_matrix)
    scores = nx.pagerank(nx_graph)
    ranked_sentences = sorted(((scores[i], s) for i, s in enumerate(sentences)), reverse=True)
    
    summary = "\n".join([ranked_sentences[i][1] for i in range(min(num_sentences, len(ranked_sentences)))])
    return summary
    
# 추상적 요약
def abstractive_summary (text) :

    language = detect(text)
    translator = Translator()
    if language == 'ko':
        print("Detected language: Korean")
        translator = Translator()
        text = translator.translate(text, src="ko", dest="en").text

    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
    summary = summarizer(text,max_length=50, min_length=25,do_sample=False)[0]['summary_text']

    if language == 'ko':
        summary = translator.translate(summary, src="en", dest="ko").text

    return summary

def image_tran (content_image, concept) :
    # 모델 로드 (TensorFlow Hub 스타일 전이 모델)
    hub_model = hub.load('https://tfhub.dev/google/magenta/arbitrary-image-stylization-v1-256/2')
    
    # 이미지 로드 함수
    def load_image(image_path, max_dim=256, img_type = 'style'):
        if img_type == 'style' :
            img = Image.open(image_path)
            img = img.convert('RGB')  # RGBA 혹은 다른 형식일 경우 변환
        else :
            img = image_path
            
        img = np.array(img)
        if max_dim == 256 :
            img = tf.image.resize(img, (max_dim, max_dim))
        else :
            #img = tf.image.rot90(img, k=3)  # k=1: 90도 회전
            img = tf.image.resize(img, (max_dim, max_dim))  # Convert to tensor
        img = img[tf.newaxis, :]
        return img / 255.0  # Normalize

    # 이미지 저장 함수
    def save_image(tensor, filename):
        tensor = tensor * 255
        tensor = np.array(tensor, dtype=np.uint8)
        if np.ndim(tensor) > 3:
            tensor = tensor[0]
        Image.fromarray(tensor).save(filename)
        
    def postprocess_image(tensor):
        tensor = tf.squeeze(tensor)  # [1, H, W, C] -> [H, W, C]
        tensor = tf.clip_by_value(tensor, 0, 1)
        array = (tensor.numpy() * 255).astype(np.uint8)
        return Image.fromarray(array)    
        

    # 콘텐츠 이미지와 스타일 이미지 로드
    content_image = load_image(content_image, max_dim=512,img_type = 'content' )
    style_image1 = load_image(f'./{concept}.jpg', max_dim=256)  # 스타일 이미지 경로 (예: 동양화)
    style_image2 = load_image(f'./{concept}2.jpg', max_dim=256)  # 스타일 이미지 경로 (예: 동양화)
    style_image3 = load_image(f'./{concept}3.jpg', max_dim=256)  # 스타일 이미지 경로 (예: 동양화)

    style_image1 ,style_image2, style_image3 = (style_image1*0.6 + style_image2*0.2 + style_image3*0.2,
                                                style_image1*0.2 + style_image2*0.6 + style_image3*0.2,
                                                style_image1*0.2 + style_image2*0.2 + style_image3*0.6)

    # 스타일 전이 실행
    stylized_image1  = hub_model(tf.constant(content_image), tf.constant(style_image1))[0]
    stylized_image2  = hub_model(tf.constant(content_image), tf.constant(style_image2))[0]
    stylized_image3  = hub_model(tf.constant(content_image), tf.constant(style_image3))[0]
    
    stylized_image = stylized_image1*0.333 + stylized_image2*0.333 + stylized_image3*0.333  + content_image*0.001
    
    return postprocess_image(stylized_image)

app = Flask(__name__)
CORS(app)

@app.route('/run-script', methods=['POST'])
def run_script():
    try:
          
        # Get text from the React frontend
        text = request.json.get('text', '')

        # 요약
        summary = abstractive_summary (text)
        print("Summary:", summary)

        return jsonify({'output': f'{summary}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/run-img', methods=['POST'])
def run_img():
    
    try:
        # React에서 전송된 이미지 파일과 화풍 스타일 받기
        image_file = request.files.get('image')  # 이미지 파일
        style = request.form.get('style')  # 화풍 스타일

        if not image_file or not style:
            return jsonify({'error': '이미지와 화풍을 모두 입력해주세요.'}), 400

        # 변환
        print('이미지를 받았습니다')
        image = Image.open(image_file).convert('RGB')
        
        stylized_image = image_tran (image, style)
        buffer = io.BytesIO()
        stylized_image.save(buffer, format='JPEG')
        buffer.seek(0)
        
        return send_file(buffer,mimetype='image/jpeg',as_attachment=False)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 점 데이터 저장
points = [{"x": random.uniform(-5, 5), "y": random.uniform(-5, 5), "z": random.uniform(-5, 5)} for _ in range(30)]
    
@app.route("/get-points", methods=["GET"])
def get_points():
    """기본 점 반환"""
    global points
    points = [{"x": random.uniform(-5, 5), "y": random.uniform(-5, 5), "z": random.uniform(-5, 5)} for _ in range(30)]
    return jsonify(points)

@app.route("/add-point", methods=["POST"])
def add_point():
    """새로운 점 추가"""
    global points
    if len(points) >= 100:
        return jsonify({"error": "점 개수가 최대치에 도달했습니다."}), 400

    new_point = {"x": random.uniform(-5, 5), "y": random.uniform(-5, 5), "z": random.uniform(-5, 5)}
    points.append(new_point)
    return jsonify(points)

@app.route("/shake-points", methods=["POST"])
def shake_points():
    """모든 점의 좌표를 무작위로 변경"""
    global points
    points = [{"x": random.uniform(-5, 5), "y": random.uniform(-5, 5), "z": random.uniform(-5, 5)} for _ in points]
    return jsonify(points)

@app.route("/cluster-points", methods=["POST"])
def cluster_points():
    if not points:
        return jsonify({"error": "점 데이터가 없습니다."}), 400

    data = np.array([[p["x"], p["y"], p["z"]] for p in points])
    dbscan = DBSCAN(eps=2.75, min_samples=3).fit(data)
    labels = dbscan.labels_

    # 군집 번호를 조정
    adjusted_labels = [label if label >= 0 and label < 3 else 3 for label in labels]

    # 점 데이터에 군집 정보 추가
    for i, point in enumerate(points):
        point["cluster"] = int(adjusted_labels[i])

    # 중심점 계산 (각 군집의 평균 좌표)
    unique_clusters = set(adjusted_labels) - {-1}  # -1은 노이즈 처리, 제외
    clusters = []
    for cluster_id in unique_clusters:
        cluster_points = data[np.array(adjusted_labels) == cluster_id]
        if len(cluster_points) > 0 and cluster_id != 3:
            center = cluster_points.mean(axis=0)
            clusters.append({"x": float(center[0]), "y": float(center[1]), "z": float(center[2])})

    return jsonify({"points": points, "clusters": clusters})


@app.route("/music-trans", methods=["POST"])
def music_trans():
    # 업로드된 파일 가져오기
    source_file = request.files['source']
    style_file = request.files['style']

    # 임시 파일로 저장
    source_path = "source_temp.wav"
    style_path = "style_temp.wav"
    output_path = "transformed_audio.wav"

    source_file.save(source_path)
    style_file.save(style_path)
    
    # 오디오 파일 로드
    audio1, sr = librosa.load(source_path, sr=None)
    audio2, _ = librosa.load(style_path, sr=sr)

    n_fft = 2048
    hop_length = 256

    # STFT 변환
    D1 = librosa.stft(audio1, n_fft=n_fft, hop_length=hop_length)
    D2 = librosa.stft(audio2, n_fft=n_fft, hop_length=hop_length)

    # 주파수별 에너지 비율 계산
    avg_spec1 = np.mean(np.abs(D1), axis=1)
    avg_spec2 = np.mean(np.abs(D2), axis=1)
    ratio = avg_spec2 / (avg_spec1 + 1e-6)  # 0으로 나누는 문제 방지
    
    # 첫번째 음원의 STFT에 필터 적용하기 (지수 인자를 활용)
    alpha = 1

    D1_modified = D1.copy()
    for i in range(D1.shape[0]):
        D1_modified[i, :] *= ratio[i] ** alpha

    # ISTFT 변환하여 시간 도메인 신호로 복원
    audio1_modified = librosa.istft(D1_modified, hop_length=hop_length)
    output_path = 'ai_audio.wav'
    sf.write(output_path, audio1_modified, sr)  # 수정된 오디오 저장

    # 변환된 파일 전송
    return send_file(output_path, mimetype="audio/wav", as_attachment=True, attachment_filename="ai_audio.wav")


if __name__ == "__main__":
    app.run(debug=True)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
