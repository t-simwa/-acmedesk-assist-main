"""
Script to clear the vector store collection.

Run from backend directory:
    python scripts/clear_vector_store.py
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_settings
from app.rag.vector_store import VectorStore

def main():
    """Clear the vector store collection."""
    settings = get_settings()
    
    print(f"Connecting to vector store...")
    print(f"Collection: {settings.vector_collection_name}")
    print(f"Persist directory: {settings.vector_store_persist_dir or 'In-memory'}")
    
    vector_store = VectorStore(
        collection_name=settings.vector_collection_name,
        persist_directory=settings.vector_store_persist_dir
    )
    
    count_before = vector_store.get_collection_count()
    print(f"\nCurrent chunk count: {count_before}")
    
    if count_before == 0:
        print("Vector store is already empty.")
        return 0
    
    # Clear the collection using the built-in method
    print("\nClearing collection...")
    try:
        vector_store.clear_collection()
        print("Collection cleared successfully.")
    except Exception as e:
        print(f"Error clearing collection: {e}")
        return 1
    
    count_after = vector_store.get_collection_count()
    print(f"\nNew chunk count: {count_after}")
    print("\nVector store cleared. You can now re-index documents with:")
    print("  python scripts/ingest_examples.py")
    
    return 0

if __name__ == "__main__":
    exit(main())
