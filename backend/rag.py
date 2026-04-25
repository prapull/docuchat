import re
import numpy as np
import faiss
from collections import Counter
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
import os

# ── Simple TF-IDF embeddings (numpy only) ──────────────────────────────────

def tokenize(text):
    return re.findall(r'\b[a-z]{2,}\b', text.lower())

class SimpleTFIDF:
    def fit(self, docs):
        all_words = set()
        for d in docs:
            all_words.update(tokenize(d))
        self.vocab = {w: i for i, w in enumerate(sorted(all_words))}
        N = len(docs)
        df = np.zeros(len(self.vocab))
        for d in docs:
            for w in set(tokenize(d)):
                if w in self.vocab:
                    df[self.vocab[w]] += 1
        self.idf = np.log((N + 1) / (df + 1)) + 1
        return self

    def transform(self, docs):
        vecs = []
        for d in docs:
            words = tokenize(d)
            tf = np.zeros(len(self.vocab))
            for w, c in Counter(words).items():
                if w in self.vocab:
                    tf[self.vocab[w]] = c / max(len(words), 1)
            v = tf * self.idf
            norm = np.linalg.norm(v)
            vecs.append(v / norm if norm > 0 else v)
        return np.array(vecs, dtype=np.float32)

# ── Core RAG functions ──────────────────────────────────────────────────────

def process_pdf(file_path: str):
    reader = PdfReader(file_path)
    text = "\n".join(p.extract_text() or "" for p in reader.pages)

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)

    tfidf = SimpleTFIDF().fit(chunks)
    vectors = tfidf.transform(chunks)

    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    return chunks, index, tfidf

def query_rag(chunks, index, tfidf, question: str) -> str:
    q_vec = tfidf.transform([question])
    _, indices = index.search(q_vec, k=4)
    context = "\n\n".join(chunks[i] for i in indices[0] if i < len(chunks))

    llm = ChatGroq(model="llama-3.1-8b-instant", api_key=os.getenv("GROQ_API_KEY"))
    prompt = f"""Answer the question using only the context below.
If the answer isn't in the context, say "I don't know."

Context:
{context}

Question: {question}"""
    return llm.invoke([HumanMessage(content=prompt)]).content