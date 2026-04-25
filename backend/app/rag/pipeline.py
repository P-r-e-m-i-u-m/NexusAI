from typing import List, Dict, Optional
from pathlib import Path

from app.services.llm import embed, chat
from app.core.logging import logger


class DocumentProcessor:
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 64):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_text(self, filepath: str) -> str:
        ext = Path(filepath).suffix.lower()
        if ext == ".pdf":
            from pypdf import PdfReader

            reader = PdfReader(filepath)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        elif ext in [".docx", ".doc"]:
            from docx import Document

            doc = Document(filepath)
            return "\n".join(p.text for p in doc.paragraphs)
        elif ext in [".txt", ".md"]:
            with open(filepath, "r", errors="ignore") as f:
                return f.read()
        return ""

    def chunk(self, text: str) -> List[str]:
        words = text.split()
        chunks = []
        start = 0
        while start < len(words):
            end = start + self.chunk_size
            chunk = " ".join(words[start:end])
            if chunk.strip():
                chunks.append(chunk)
            start += self.chunk_size - self.chunk_overlap
        return chunks


class VectorStore:
    """In-memory vector store backed by faiss (swap for pgvector in prod)."""

    def __init__(self):
        self.chunks: List[str] = []
        self.embeddings: List[List[float]] = []
        self.metadata: List[Dict] = []

    async def add(self, chunks: List[str], meta: Dict, provider: str = "nvidia"):
        for chunk in chunks:
            emb = await embed(chunk, provider=provider)
            self.chunks.append(chunk)
            self.embeddings.append(emb)
            self.metadata.append(meta)
        logger.info("vectorstore_add", chunks=len(chunks))

    def search(self, query_emb: List[float], top_k: int = 5) -> List[Dict]:
        if not self.embeddings:
            return []
        import numpy as np

        q = np.array(query_emb)
        scores = [
            np.dot(q, np.array(e)) / (np.linalg.norm(q) * np.linalg.norm(e) + 1e-8)
            for e in self.embeddings
        ]
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[
            :top_k
        ]
        return [
            {
                "chunk": self.chunks[i],
                "score": float(scores[i]),
                "meta": self.metadata[i],
            }
            for i in top_indices
        ]


_stores: Dict[str, VectorStore] = {}


def get_store(kb_id: str) -> VectorStore:
    if kb_id not in _stores:
        _stores[kb_id] = VectorStore()
    return _stores[kb_id]


async def ingest_document(
    kb_id: str, filepath: str, filename: str, provider: str = "nvidia"
):
    processor = DocumentProcessor()
    text = processor.extract_text(filepath)
    chunks = processor.chunk(text)
    store = get_store(kb_id)
    await store.add(chunks, {"filename": filename, "kb_id": kb_id}, provider=provider)
    return {"chunks": len(chunks), "filename": filename}


async def query_rag(
    kb_id: str,
    question: str,
    provider: str = "nvidia",
    model: Optional[str] = None,
    top_k: int = 5,
) -> Dict:
    store = get_store(kb_id)
    query_emb = await embed(question, provider=provider)
    results = store.search(query_emb, top_k=top_k)

    if not results:
        return {"answer": "No relevant documents found.", "sources": []}

    context = "\n\n".join(r["chunk"] for r in results)
    messages = [
        {
            "role": "system",
            "content": "You are a helpful assistant. Answer based only on the provided context. Be concise and accurate.",
        },
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
    ]
    answer = await chat(messages=messages, provider=provider, model=model)

    return {
        "answer": answer,
        "sources": [
            {
                "chunk": r["chunk"][:200],
                "score": r["score"],
                "filename": r["meta"].get("filename"),
            }
            for r in results
        ],
    }
