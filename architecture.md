## AcmeDesk Assist – Architecture Overview

This document provides a **high‑level architecture overview** of AcmeDesk Assist.  
It is intentionally **implementation‑aligned but language‑agnostic** so it stays useful even as details change.  
For deep‑dive execution docs, see the sectioned docs under `docs/` (A–F).

---

## System Overview

At a high level, AcmeDesk Assist is a **full‑stack RAG application** with:

- **Frontend**: React + Vite + Tailwind + shadcn/ui (chat widget + admin console).
- **Backend API**: FastAPI service exposing chat, documents, analytics, settings, and health endpoints.
- **Database**: SQLAlchemy + SQLite (by default) for conversations, documents metadata, and analytics.
- **RAG Pipeline**: Sentence Transformers / OpenAI embeddings + ChromaDB vector store + LiteLLM‑backed LLM.
- **Docs & Evaluation**: A structured docs tree (`docs/`) and an automated RAG quality evaluation harness.

The main goal is to give AcmeDesk a **production‑style assistant backend** and **portfolio‑grade frontend** wired together via a clean HTTP API.

---

## Logical Architecture

- **Presentation Layer (Frontend)**
  - React SPA in `frontend/`.
  - Public chat widget and marketing site.
  - Admin console (documents, analytics, settings).
  - Uses a typed API client layer to call the FastAPI backend (chat, documents, analytics, settings).

- **API Layer (Backend / FastAPI)**
  - Entry point: `backend/app/main.py`.
  - Routers:
    - `chat` – `/api/chat`, `/api/chat/stream`
    - `documents` – `/api/documents/*`
    - `analytics` – `/api/analytics/*`
    - `settings` – `/api/settings/*`
    - `conversations` – `/api/conversations/*`
    - `health` – `/api/health`, `/api/health/ready`, `/api/health/live`
  - Handles authentication (if configured), validation, error handling, and HTTP concerns.

- **Domain & Services Layer**
  - `app/services/rag.py` – Orchestrates the RAG pipeline (retrieve + generate).
  - `app/services/database.py` – Persists conversation turns, documents, and analytics.
  - `app/services/storage.py` – Handles file storage for uploaded documents.
  - `app/config.py` – Runtime configuration (LLM/RAG settings, database, CORS, etc.).

- **Data & Persistence Layer**
  - **Relational DB**: SQLAlchemy models in `app/models/*` with async sessions in `models/base.py`.
  - **Vector DB**: ChromaDB via `app/rag/vector_store.py` with a default collection `acmedesk_documents`.
  - **File Storage**: `backend/storage/documents/` for uploaded source files; `data/docs/` for seed docs.

---

## RAG Pipeline Architecture

The RAG pipeline is implemented under `backend/app/rag/` and orchestrated by `app/services/rag.py`.

**Key components**

- `rag/loaders.py` – Load documents from supported formats (MD, HTML, TXT, PDF, DOCX).
- `rag/ingestion.py` – Normalize loaded documents into a common internal representation.
- `rag/chunking.py` – Chunk long documents into overlapping windows using `ChunkingConfig`.
- `rag/embeddings.py` – Create embeddings using:
  - **Sentence Transformers** (default: `all-MiniLM-L6-v2`), or
  - **OpenAI embeddings** when `use_openai_embeddings=True`.
- `rag/vector_store.py` – Wrap ChromaDB for add/search/delete operations.
- `rag/retrieval.py` – Hybrid retrieval (semantic vectors + BM25 keyword search + optional re‑ranking).
- `rag/generator.py` – LLM wrapper via LiteLLM; builds prompts and maps citations back to chunks.

**End‑to‑end RAG flow**

1. **Ingestion (offline / admin action)**
   - Admin uploads or seeds documents.
   - Documents are stored to disk and metadata is inserted into the SQL database.
   - Ingestion pipeline:
     1. Load file (`loaders`).
     2. Normalize text (`ingestion`).
     3. Chunk into overlapping segments (`chunking`).
     4. Embed each chunk (`embeddings`).
     5. Persist vectors and metadata to ChromaDB (`vector_store`).

2. **Retrieval (online / query time)**
   - User sends a query via chat.
   - `services/rag.retrieve_relevant_chunks()`:
     1. Embeds the query (Sentence Transformers or OpenAI).
     2. Runs semantic search in ChromaDB.
     3. Optionally runs BM25 keyword search and combines scores (hybrid).
     4. Optionally re‑ranks the top‑N results with a cross‑encoder.
     5. Returns top‑k chunks as `SourceRef` objects with doc IDs, titles, scores, and snippets.

3. **Generation**
   - `services/rag.generate_answer()`:
     1. Builds a system + user prompt via `rag.retrieval.build_prompt()` using the retrieved chunks.
     2. Calls the LLM via `LLMGenerator` (LiteLLM) with configured model, temperature, and max tokens.
     3. Post‑processes the answer and citations (via `generate_answer_with_citations`).
     4. Returns a grounded answer string.

4. **Persistence & Analytics**
   - `routers/chat.py` calls `process_chat_query()`, then:
     - Persists the turn (question, answer, source count, timing) via `services.database`.
     - Exposes metrics that feed analytics pages (conversation counts, latency, accuracy proxies).

Configuration for the RAG pipeline (model names, `top_k`, hybrid weights, re‑ranking) is centralized in `app/config.Settings`.

---

## Data Storage & Persistence

- **Application Database**
  - Default: SQLite database at `backend/data/acmedesk.db` (via `models/base.get_database_url()`).
  - Can be overridden with `DATABASE_URL` or `database_url` env var.
  - Manages:
    - Conversations and turns
    - Document metadata (IDs, file paths, types, status, chunk counts)
    - Basic analytics and settings where applicable

- **Vector Store**
  - Backed by **ChromaDB** via `rag/vector_store.py`.
  - Uses `vector_collection_name` (default: `acmedesk_documents`).
  - Persistence directory controlled by `vector_store_persist_dir` in settings; if omitted, runs in‑memory.

- **File Storage**
  - Uploaded documents saved under `backend/storage/documents/` (via `services/storage.py`).
  - Seed docs for ingestion live under `data/docs/`.

---

## Backend–Frontend Integration

- **Chat**
  - Frontend chat widget sends user messages to `POST /api/chat`.
  - Receives an answer plus source metadata suitable for UI citations.
  - Optionally uses `POST /api/chat/stream` (SSE) for streaming responses.

- **Documents**
  - Admin documents UI calls:
    - `POST /api/documents/upload` for uploads.
    - `GET /api/documents` for listing and filtering.
    - `GET /api/documents/{id}` for detail views.
    - `POST /api/documents/{id}/reindex` to re‑ingest a doc.
    - `DELETE /api/documents/{id}` to remove a doc and its vectors.

- **Analytics**
  - Admin analytics UI calls `analytics` endpoints to display:
    - Conversation counts and trends.
    - Resolution metrics and satisfaction proxies (if configured).
    - RAG‑related health signals (latency, errors, etc.).

- **Settings**
  - Admin settings UI reads/writes configuration via `settings` endpoints.
  - Includes knobs like chunk size, retrieval `top_k`, hybrid search toggles, and LLM configuration.

---

## Configuration & Environments

Backend configuration is centralized in `backend/app/config.py` using Pydantic settings:

- **Core**
  - `app_name`, `environment`, `frontend_origin`
- **Database & Storage**
  - `database_url`, `vector_db_url`, `vector_store_persist_dir`
- **RAG & LLM**
  - `embedding_model`, `use_openai_embeddings`, `openai_api_key`, `ollama_api_key`
  - `llm_model`, `llm_temperature`, `llm_max_tokens`, `llm_base_url`
- **Retrieval**
  - `retrieval_top_k`, `retrieval_use_hybrid_search`
  - `retrieval_hybrid_semantic_weight`, `retrieval_hybrid_keyword_weight`
  - `retrieval_use_reranking`, `retrieval_rerank_top_n`

You can configure these via a `.env` file in `backend/` or environment variables.  
See `docs/B-rag-pipeline/*` and `docs/E-testing-and-quality/*` for parameter suggestions and testing guidance.

---

## RAG Evaluation Architecture (High Level)

RAG quality evaluation is implemented as a **separate but integrated harness** that exercises the full pipeline:

- `backend/scripts/test_questions.json` – curated test set with expected topics and documents.
- `backend/scripts/evaluate_rag_quality.py` – runs questions through `services.rag.process_chat_query`.
- `docs/E-testing-and-quality/E1-rag-quality-checks.md` – deep‑dive doc on evaluation design and manual tests.
- `docs/RAG_EVALUATION_SUMMARY.md` – executive‑level summary of evaluation findings and how to interpret them.

This keeps production code focused while giving you a **repeatable, metrics‑driven way** to track RAG quality over time.

