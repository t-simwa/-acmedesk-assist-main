import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import get_settings
from app.rag.vector_store import VectorStore
from app.rag.embeddings import get_embedding_model
from app.rag.retrieval import retrieve

settings = get_settings()

embedding_model = get_embedding_model()
vector_store = VectorStore(
    collection_name=settings.vector_collection_name,
    persist_directory=settings.vector_store_persist_dir,  # <- key line
)

# Test with re-ranking
query = "API integration"
chunks = retrieve(
    query=query,
    embedding_model=embedding_model,
    vector_store=vector_store,
    top_k=5,
    use_reranking=True,
    rerank_top_n=10
)

print(f"Re-ranked results: {len(chunks)} chunks")
for chunk in chunks:
    print(f"Score: {chunk['score']:.4f} - {chunk['metadata']['doc_id']}")