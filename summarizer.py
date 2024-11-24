from flask import Flask, request, jsonify
from flask_cors import CORS

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


# 추출적 요약
def extractive_summary(text, num_sentences=1):
    english_stopwords = stopwords.words('english')
    korean_stopwords = ['의', '가', '이', '은', '들', '는', '좀', '잘', '걍', '과', '도', '를', '으로', '자', '에', '와', '한', '하다']

    def split_sentences(text, lang):
        """
        간단한 규칙 기반 문장 분리
        """
        if lang == 'ko':  # 한글일 경우
            # 정규식을 활용한 한글 문장 분리
            sentences = re.split(r'(?<=[.!?])\s+', text)
        elif lang == 'en':  # 영어일 경우
            # nltk를 활용한 영어 문장 분리
            sentences = sent_tokenize(text)
        else:
            raise ValueError("지원하지 않는 언어입니다.")
        return [sentence.strip() for sentence in sentences if sentence.strip()]

    def get_stopwords(lang):
        """
        언어별 불용어 반환
        """
        if lang == 'ko':
            return korean_stopwords
        elif lang == 'en':
            return english_stopwords
        else:
            return []
    
    
    # 언어 감지
    lang = detect(text)

    # 문장 분리
    sentences = split_sentences(text, lang)

    # TF-IDF로 문장 벡터화
    stop_words = get_stopwords(lang)
    vectorizer = TfidfVectorizer(stop_words=stop_words)
    tfidf_matrix = vectorizer.fit_transform(sentences)

    # 코사인 유사도를 계산하여 문장 간 유사도 행렬 생성
    similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

    # 그래프 생성
    nx_graph = nx.from_numpy_array(similarity_matrix)

    # TextRank 점수 계산
    scores = nx.pagerank(nx_graph)

    # 점수를 기준으로 문장 정렬
    ranked_sentences = sorted(((scores[i], s) for i, s in enumerate(sentences)), reverse=True)

    # 상위 문장 추출
    summary = "\n".join([ranked_sentences[i][1] for i in range(min(num_sentences, len(ranked_sentences)))])
    return summary
    
# 추상적 요약
def abstractive_summary (text) :

    # 언어 감지
    language = detect(text)

    # 번역 
    translator = Translator()
    if language == 'ko':
        print("Detected language: Korean")
        translator = Translator()
        text = translator.translate(text, src="ko", dest="en").text

    # 요약
    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
    summary = summarizer(text,
                                 max_length=50, min_length=25,
                                 do_sample=False)[0]['summary_text']

    # 결과번역
    if language == 'ko':
        summary = translator.translate(summary, src="en", dest="ko").text

    return summary


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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
