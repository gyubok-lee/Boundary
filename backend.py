from flask import Flask, request, jsonify
from flask_cors import CORS

import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import networkx as nx

app = Flask(__name__)
CORS(app)

@app.route('/run-script', methods=['POST'])
def run_script():
    try:
        def extractive_summary(text, num_sentences=1):
            # 문장 분리
            sentences = sent_tokenize(text)

            # TF-IDF로 문장 벡터화
            vectorizer = TfidfVectorizer(stop_words='english')
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
            summary = " ".join([ranked_sentences[i][1] for i in range(min(num_sentences, len(ranked_sentences)))])
            return summary


        # Get text from the React frontend
        text = request.json.get('text', '')

        # 요약
        summary = extractive_summary(text)
        print("Extractive Summary:", summary)

        return jsonify({'output': f'{summary}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
