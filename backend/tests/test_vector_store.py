"""
Test script for vector store module.

Run with: python -m tests.test_vector_store
Or from backend directory: python -m tests.test_vector_store
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.rag.vector_store import VectorStore
from app.rag.embeddings import get_embedding_model
from app.rag.chunking import Chunk


def test_vector_store_basic():
    """Test basic vector store operations."""
    print("Testing vector store basic operations...")
    
    try:
        # Initialize vector store (in-memory for testing)
        store = VectorStore(collection_name="test_collection")
        print("✓ Vector store initialized")
        
        # Initialize embedding model
        embedding_model = get_embedding_model()
        print("✓ Embedding model loaded")
        
        # Create test chunks
        chunks = [
            Chunk(
                text="This is a test document about customer support and ticket management.",
                doc_id="test-doc-1",
                chunk_index=0,
                source_path="/docs/test-1.md",
                start_char=0,
                end_char=70,
            ),
            Chunk(
                text="This is another chunk about analytics and reporting features.",
                doc_id="test-doc-1",
                chunk_index=1,
                source_path="/docs/test-1.md",
                start_char=71,
                end_char=140,
            ),
            Chunk(
                text="This chunk is from a different document about API integration.",
                doc_id="test-doc-2",
                chunk_index=0,
                source_path="/docs/test-2.md",
                start_char=0,
                end_char=60,
            ),
        ]
        print(f"✓ Created {len(chunks)} test chunks")
        
        # Generate embeddings
        texts = [chunk.text for chunk in chunks]
        embeddings = embedding_model.embed_batch(texts)
        print(f"✓ Generated {len(embeddings)} embeddings")
        
        # Add chunks to vector store
        vector_ids = store.add_documents(chunks, embeddings)
        assert len(vector_ids) == len(chunks), f"Expected {len(chunks)} vector IDs, got {len(vector_ids)}"
        print(f"✓ Added {len(vector_ids)} chunks to vector store")
        
        # Verify collection count
        count = store.get_collection_count()
        assert count == len(chunks), f"Expected {len(chunks)} chunks in collection, got {count}"
        print(f"✓ Collection count: {count}")
        
        # Test search
        query_text = "How do I manage customer tickets?"
        query_embedding = embedding_model.embed(query_text)
        results = store.search(query_embedding, top_k=2)
        
        assert len(results) > 0, "Search should return results"
        assert all("text" in r for r in results), "Results should contain text"
        assert all("score" in r for r in results), "Results should contain score"
        assert all("metadata" in r for r in results), "Results should contain metadata"
        assert all("id" in r for r in results), "Results should contain id"
        
        print(f"✓ Search returned {len(results)} results")
        for i, result in enumerate(results):
            print(f"  Result {i+1}: score={result['score']:.4f}, doc_id={result['metadata'].get('doc_id')}")
        
        # Test metadata filtering
        filtered_results = store.search(
            query_embedding,
            top_k=5,
            filter_metadata={"doc_id": "test-doc-1"}
        )
        assert all(r["metadata"]["doc_id"] == "test-doc-1" for r in filtered_results), "Filter should only return test-doc-1"
        print(f"✓ Metadata filtering works: {len(filtered_results)} results for test-doc-1")
        
        # Test delete by doc_id
        deleted_count = store.delete_by_doc_id("test-doc-1")
        assert deleted_count == 2, f"Expected 2 chunks deleted, got {deleted_count}"
        print(f"✓ Deleted {deleted_count} chunks for test-doc-1")
        
        # Verify deletion
        remaining_count = store.get_collection_count()
        assert remaining_count == 1, f"Expected 1 chunk remaining, got {remaining_count}"
        print(f"✓ Remaining chunks: {remaining_count}")
        
        print("\n" + "="*50)
        print("All vector store tests passed!")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_vector_store_basic()
    sys.exit(0 if success else 1)
