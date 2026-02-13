"""
Test script for embeddings module.

Run with: python -m tests.test_embeddings
Or from backend directory: python -m tests.test_embeddings
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.rag.embeddings import EmbeddingModel, get_embedding_model


def test_sentence_transformer_embedding():
    """Test Sentence Transformer embedding."""
    print("Testing Sentence Transformer embedding...")
    
    try:
        model = get_embedding_model()
        print(f"✓ Model loaded: {model.model_name}")
        print(f"✓ Embedding dimension: {model.get_dimension()}")
        
        # Test single embedding
        text = "This is a test document about AcmeDesk."
        embedding = model.embed(text)
        assert len(embedding) == model.get_dimension(), f"Expected dimension {model.get_dimension()}, got {len(embedding)}"
        assert all(isinstance(x, (int, float)) for x in embedding), "Embedding should contain numbers"
        print(f"✓ Single embedding generated: {len(embedding)} dimensions")
        
        # Test batch embedding
        texts = [
            "First document about customer support.",
            "Second document about ticket management.",
            "Third document about analytics.",
        ]
        embeddings = model.embed_batch(texts, batch_size=2)
        assert len(embeddings) == len(texts), f"Expected {len(texts)} embeddings, got {len(embeddings)}"
        assert all(len(e) == model.get_dimension() for e in embeddings), "All embeddings should have same dimension"
        print(f"✓ Batch embedding generated: {len(embeddings)} embeddings")
        
        # Test empty text handling
        empty_embedding = model.embed("")
        assert len(empty_embedding) == model.get_dimension(), "Empty text should return zero vector"
        print("✓ Empty text handling works")
        
        print("\n" + "="*50)
        print("All Sentence Transformer embedding tests passed!")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_sentence_transformer_embedding()
    sys.exit(0 if success else 1)
