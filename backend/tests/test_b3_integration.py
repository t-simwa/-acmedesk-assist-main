"""
Integration test for B3 - Embeddings & Vector Store.

Tests the full pipeline: ingestion -> chunking -> embedding -> vector store.

Run with: python -m tests.test_b3_integration
Or from backend directory: python -m tests.test_b3_integration
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.rag.ingestion import ingest_document
from app.rag.chunking import chunk_document
from app.config import get_chunking_config
from app.rag.embeddings import get_embedding_model
from app.rag.vector_store import VectorStore


def test_full_pipeline():
    """Test the complete B3 pipeline."""
    print("Testing B3 - Full Integration Pipeline...")
    print("="*60)
    
    try:
        # Step 1: Ingest a document
        print("\n[Step 1] Document Ingestion")
        # Path relative to backend directory
        repo_root = backend_dir.parent
        docs_path = repo_root / "data" / "docs"
        test_file = docs_path / "getting-started.md"
        
        if not test_file.exists():
            print(f"⚠ Test file not found: {test_file}")
            print("   Skipping integration test (file may not exist)")
            return True
        
        doc = ingest_document(test_file)
        assert doc is not None, "Failed to ingest document"
        print(f"✓ Ingested document: {doc.title}")
        print(f"  Doc ID: {doc.doc_id}")
        print(f"  Text length: {len(doc.text)} characters")
        
        # Step 2: Chunk the document
        print("\n[Step 2] Document Chunking")
        config = get_chunking_config()
        chunks = chunk_document(doc, config)
        assert len(chunks) > 0, "No chunks created"
        print(f"✓ Created {len(chunks)} chunks")
        print(f"  Average chunk size: {sum(len(c.text) for c in chunks) / len(chunks):.0f} chars")
        
        # Step 3: Generate embeddings
        print("\n[Step 3] Generate Embeddings")
        embedding_model = get_embedding_model()
        print(f"✓ Loaded embedding model: {embedding_model.model_name}")
        print(f"  Embedding dimension: {embedding_model.get_dimension()}")
        
        texts = [chunk.text for chunk in chunks]
        embeddings = embedding_model.embed_batch(texts, batch_size=10)
        assert len(embeddings) == len(chunks), "Mismatch between chunks and embeddings"
        assert all(len(e) == embedding_model.get_dimension() for e in embeddings), "Inconsistent embedding dimensions"
        print(f"✓ Generated {len(embeddings)} embeddings")
        
        # Step 4: Store in vector database
        print("\n[Step 4] Vector Store")
        store = VectorStore(collection_name="test_integration")
        print("✓ Vector store initialized")
        
        vector_ids = store.add_documents(chunks, embeddings)
        assert len(vector_ids) == len(chunks), "Mismatch between chunks and vector IDs"
        print(f"✓ Stored {len(vector_ids)} chunks in vector store")
        
        count = store.get_collection_count()
        assert count == len(chunks), f"Collection count mismatch: expected {len(chunks)}, got {count}"
        print(f"✓ Collection contains {count} chunks")
        
        # Step 5: Test search
        print("\n[Step 5] Search Test")
        query = "How do I get started with AcmeDesk?"
        query_embedding = embedding_model.embed(query)
        results = store.search(query_embedding, top_k=3)
        
        assert len(results) > 0, "Search should return results"
        print(f"✓ Search returned {len(results)} results")
        
        for i, result in enumerate(results):
            print(f"\n  Result {i+1}:")
            print(f"    Score: {result['score']:.4f}")
            print(f"    Doc ID: {result['metadata'].get('doc_id')}")
            print(f"    Chunk Index: {result['metadata'].get('chunk_index')}")
            print(f"    Text preview: {result['text'][:80]}...")
        
        # Verify metadata mapping
        print("\n[Step 6] Metadata Verification")
        first_result = results[0]
        assert "doc_id" in first_result["metadata"], "Metadata should contain doc_id"
        assert "chunk_index" in first_result["metadata"], "Metadata should contain chunk_index"
        assert "source_path" in first_result["metadata"], "Metadata should contain source_path"
        assert first_result["metadata"]["doc_id"] == doc.doc_id, "Metadata doc_id should match"
        print("✓ All metadata fields present and correct")
        
        # Verify vector ID mapping
        print("\n[Step 7] Vector ID Mapping")
        assert "id" in first_result, "Result should contain vector ID"
        assert first_result["id"] in vector_ids, "Vector ID should be in stored IDs"
        print("✓ Vector ID mapping works correctly")
        
        print("\n" + "="*60)
        print("✅ B3 Integration Test: ALL TESTS PASSED!")
        print("="*60)
        return True
        
    except Exception as e:
        print(f"\n✗ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_full_pipeline()
    sys.exit(0 if success else 1)
