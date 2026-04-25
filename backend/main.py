from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import shutil, os
from rag import process_pdf, query_rag

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

state = {"chunks": None, "index": None, "tfidf": None}
os.makedirs("uploads", exist_ok=True)

class QueryRequest(BaseModel):
    question: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDFs allowed")
    path = f"uploads/{file.filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    state["chunks"], state["index"], state["tfidf"] = process_pdf(path)
    return {"message": f"{file.filename} processed", "chunks": len(state["chunks"])}

@app.post("/chat")
async def chat(req: QueryRequest):
    if not state["chunks"]:
        raise HTTPException(400, "Upload a PDF first")
    answer = query_rag(state["chunks"], state["index"], state["tfidf"], req.question)
    return {"answer": answer}