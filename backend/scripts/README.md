# Scripts Directory

This directory contains utility scripts for the AcmeDesk Assist backend.

## Available Scripts

### `ingest_examples.py`

Indexes documents from `data/docs/` into the vector store.

**Usage:**
```bash
cd backend
python scripts/ingest_examples.py
```

**What it does:**
1. Loads all documents from `../data/docs/` (markdown, HTML, TXT files)
2. Chunks each document
3. Generates embeddings for all chunks
4. Stores chunks and embeddings in the vector database

**Important Notes:**
- By default, uses **in-memory** vector store (data is lost when script ends)
- For persistent storage, set `VECTOR_STORE_PERSIST_DIR` in `backend/.env`:
  ```bash
  VECTOR_STORE_PERSIST_DIR=./data/vector_db
  ```
- Then re-run the indexing script to save data to disk

**Output:**
- Shows progress for each document
- Displays total chunks added
- Reports any errors
