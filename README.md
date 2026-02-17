## AcmeDesk Assist

AcmeDesk Assist is a **full‑stack Retrieval‑Augmented Generation (RAG) assistant** for AcmeDesk, combining:

- A modern **React + Vite + Tailwind + shadcn/ui** frontend (chat widget + admin console).
- A **FastAPI** backend that exposes chat, documents, analytics, settings, and health endpoints.
- A production‑style **RAG pipeline** with embeddings, vector search, hybrid retrieval, and evaluation tooling.

This repo is structured and documented as if it were a real client execution project, suitable as a **portfolio piece**.

---

## Features

- **Chat Assistant**
  - User‑facing chat widget embedded in the marketing site.
  - Backend `/api/chat` and `/api/chat/stream` endpoints backed by a RAG pipeline.
  - Answers grounded in AcmeDesk documentation with source metadata for citations.

- **Admin Console**
  - Documents page to upload, reindex, and manage knowledge base documents.
  - Analytics page for conversation and RAG performance metrics.
  - Settings page for LLM and retrieval parameters (chunk size, top‑k, hybrid search, etc.).

- **RAG Pipeline**
  - Document loaders for MD, HTML, TXT, PDF, DOCX.
  - Chunking with configurable size/overlap.
  - Embeddings via Sentence Transformers or OpenAI.
  - ChromaDB vector store with hybrid semantic + BM25 keyword search and optional re‑ranking.
  - LLM generation via LiteLLM, with prompt construction and citation handling.

- **Evaluation & Quality**
  - Curated test set of questions for AcmeDesk docs.
  - Automated RAG evaluation script that measures accuracy, hallucinations, and latency.
  - Detailed and summarized evaluation docs under `docs/E-testing-and-quality/` and `docs/RAG_EVALUATION_SUMMARY.md`.

---

## Project Structure

```text
acmedesk-assist-main/
├── backend/                 # FastAPI + RAG backend
│   ├── app/
│   │   ├── main.py         # FastAPI app entrypoint
│   │   ├── config.py       # Settings (DB, RAG, LLM, CORS)
│   │   ├── models/         # SQLAlchemy models + DB setup
│   │   ├── rag/            # RAG pipeline modules (ingestion, chunking, embeddings, retrieval, generator)
│   │   ├── routers/        # API routers: chat, documents, analytics, settings, health, conversations
│   │   └── services/       # Domain services (RAG service, storage, database helpers)
│   ├── data/               # SQLite DB file (default) and vector DB (if persisted)
│   ├── scripts/            # Ingestion + RAG evaluation scripts and test questions
│   └── requirements.txt    # Backend dependencies
├── frontend/               # React + Vite + Tailwind + shadcn/ui frontend
│   ├── src/                # Components, pages, hooks, lib, entrypoint
│   ├── public/             # Static assets
│   └── package.json        # Frontend scripts & dependencies
└── docs/                   # Execution‑phase documentation (A–F, RAG, testing, UX checklists)
```

For a deeper architecture explanation, see **`docs/architecture.md`**.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-fork-or-origin>
cd acmedesk-assist-main
```

### 2. Backend Setup

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (or set environment variables) with at least:

```bash
OPENAI_API_KEY=your-key-or-ollama-key
# Optional overrides:
# DATABASE_URL=sqlite+aiosqlite:///absolute/path/to/acmedesk.db
# VECTOR_STORE_PERSIST_DIR=./data/vector_db
# LLM_MODEL=gpt-3.5-turbo
# LLM_BASE_URL=https://api.ollama.com  # or your LLM endpoint
```

Start the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API docs will be available at:

- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

### 3. Frontend Setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

By default, Vite serves the frontend at `http://localhost:5173`.  
Ensure the backend CORS `frontend_origin` in `backend/app/config.py` is compatible (e.g. `http://localhost:5173`).

---

## RAG Ingestion & Evaluation

### Ingest Example Documents

Before asking questions, ingest the example docs into the vector store:

```bash
cd backend
python scripts/ingest_examples.py
```

This will:

- Load documents from `data/docs/`.
- Chunk them using the configured `chunk_size` / `chunk_overlap`.
- Generate embeddings.
- Store vectors + metadata in ChromaDB (in‑memory or persistent, depending on `VECTOR_STORE_PERSIST_DIR`.

### Run RAG Quality Evaluation

To evaluate how well the RAG system answers a curated set of questions:

```bash
cd backend
python scripts/evaluate_rag_quality.py
```

The script will:

- Run each question in `scripts/test_questions.json` through the live RAG pipeline.
- Compute accuracy scores, topic coverage, document relevance, and hallucination flags.
- Emit a summary plus a detailed JSON report at `backend/scripts/rag_evaluation_report.json`.

For a detailed explanation of metrics and manual checks, see:

- `docs/E-testing-and-quality/E1-rag-quality-checks.md`
- `docs/RAG_EVALUATION_SUMMARY.md`

---

## Docs Map

If you want to explore the execution‑phase docs:

- **Architecture overview**: `docs/architecture.md`
- **Backend & API**: `docs/A-backend-and-api/`
- **RAG pipeline**: `docs/B-rag-pipeline/`
- **Data storage & persistence**: `docs/C-data-storage-persistence/`
- **Frontend integration**: `docs/D-frontend-integration/`
- **Testing & quality (incl. RAG)**: `docs/E-testing-and-quality/`
- **UI/UX enhancement**: `docs/F-ui-ux-enhancement/`

For a milestone‑by‑milestone breakdown of what is implemented, see:

- `docs/ACMEDESK_IMPLEMENTATION_STATUS.md`

---

## Running Tests

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests & Linting

```bash
cd frontend
npm test         # or: npm run test:watch
npm run lint
```

---

## Notes

- Environment variables are intentionally centralized via Pydantic settings to make deployment easier.
- The RAG pipeline is modular; you can swap embedding models, LLMs, or retrieval strategies with minimal changes.
- Docs under `docs/` were written to mirror a real client engagement and are a good starting point for further extensions.
