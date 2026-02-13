"""
Debug script to check if prompt is being built correctly with context.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.rag.retrieval import retrieve, build_prompt
from app.rag.embeddings import get_embedding_model
from app.rag.vector_store import VectorStore
from app.config import get_settings

settings = get_settings()

# Initialize components
embedding_model = get_embedding_model()
vector_store = VectorStore(
    collection_name=settings.vector_collection_name,
    persist_directory=settings.vector_store_persist_dir
)

# Test query
query = "how do I integrate"

print(f"Query: {query}\n")
print("="*80)

# Retrieve chunks
chunks = retrieve(
    query=query,
    embedding_model=embedding_model,
    vector_store=vector_store,
    top_k=3
)

print(f"Retrieved {len(chunks)} chunks\n")

# Check chunk content
for i, chunk in enumerate(chunks, 1):
    text = chunk.get('text', '')
    metadata = chunk.get('metadata', {})
    print(f"Chunk {i}:")
    print(f"  Text length: {len(text)}")
    print(f"  Text preview: {text[:150]}...")
    print(f"  Doc ID: {metadata.get('doc_id', 'unknown')}")
    print(f"  Score: {chunk.get('score', 0.0):.4f}")
    print()

# Build prompt
prompt = build_prompt(
    context_chunks=chunks,
    user_query=query
)

print("="*80)
print("BUILT PROMPT:")
print("="*80)
print(prompt)
print("="*80)
print(f"\nPrompt length: {len(prompt)} characters")
