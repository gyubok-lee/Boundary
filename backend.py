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

from transformers import pipeline
from googletrans import Translator
from transformers import pipeline
from googletrans import Translator
from nltk.corpus import stopwords

import tensorflow as tf
import tensorflow_hub as hub
import matplotlib.pyplot as plt
from PIL import Image


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
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)
