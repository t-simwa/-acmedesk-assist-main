"""
Script to ingest example documents from data/docs/ into the vector store.

This script:
1. Loads documents from data/docs/
2. Chunks the documents
3. Generates embeddings
4. Stores them in the vector database

Run from backend directory:
    python scripts/ingest_examples.py
"""

import sys
import logging
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.rag.ingestion import ingest_directory
from app.rag.chunking import chunk_document
from app.config import get_settings, get_chunking_config
from app.rag.embeddings import get_embedding_model
from app.rag.vector_store import VectorStore

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main ingestion function."""
    # Get configuration
    settings = get_settings()
    chunking_config = get_chunking_config()
    
    # Path to documents directory (relative to project root)
    project_root = backend_dir.parent
    docs_dir = project_root / "data" / "docs"
    
    if not docs_dir.exists():
        logger.error(f"Documents directory not found: {docs_dir}")
        logger.error("Please ensure data/docs/ directory exists with documents")
        return 1
    
    logger.info(f"Starting ingestion from: {docs_dir}")
    
    # Step 1: Ingest documents
    logger.info("Step 1: Ingesting documents...")
    documents = ingest_directory(docs_dir, recursive=False)
    
    if not documents:
        logger.error("No documents found to ingest!")
        return 1
    
    logger.info(f"Ingested {len(documents)} documents")
    
    # Step 2: Initialize components
    logger.info("Step 2: Initializing components...")
    embedding_model = get_embedding_model(
        model_name=settings.embedding_model,
        use_openai=settings.use_openai_embeddings,
        openai_api_key=settings.openai_api_key
    )
    
    vector_store = VectorStore(
        collection_name=settings.vector_collection_name,
        persist_directory=settings.vector_store_persist_dir
    )
    
    # Check current collection count
    initial_count = vector_store.get_collection_count()
    logger.info(f"Current vector store count: {initial_count} chunks")
    
    # Step 3: Process each document
    total_chunks = 0
    total_errors = 0
    
    for i, doc in enumerate(documents, 1):
        try:
            logger.info(f"\nProcessing document {i}/{len(documents)}: {doc.doc_id}")
            
            # Chunk the document
            chunks = chunk_document(doc, chunking_config)
            logger.info(f"  Created {len(chunks)} chunks")
            
            if not chunks:
                logger.warning(f"  No chunks created for {doc.doc_id}, skipping...")
                continue
            
            # Generate embeddings
            logger.info(f"  Generating embeddings...")
            texts = [chunk.text for chunk in chunks]
            embeddings = embedding_model.embed_batch(texts)
            logger.info(f"  Generated {len(embeddings)} embeddings")
            
            # Add to vector store
            logger.info(f"  Adding to vector store...")
            vector_ids = vector_store.add_documents(chunks, embeddings)
            logger.info(f"  Added {len(vector_ids)} chunks to vector store")
            
            total_chunks += len(chunks)
            
        except Exception as e:
            logger.error(f"Error processing document {doc.doc_id}: {e}", exc_info=True)
            total_errors += 1
            continue
    
    # Step 4: Summary
    final_count = vector_store.get_collection_count()
    logger.info("\n" + "="*60)
    logger.info("INGESTION COMPLETE")
    logger.info("="*60)
    logger.info(f"Documents processed: {len(documents)}")
    logger.info(f"Total chunks added: {total_chunks}")
    logger.info(f"Errors: {total_errors}")
    logger.info(f"Initial vector store count: {initial_count}")
    logger.info(f"Final vector store count: {final_count}")
    logger.info(f"New chunks added: {final_count - initial_count}")
    logger.info("="*60)
    
    if total_errors > 0:
        logger.warning(f"Completed with {total_errors} errors")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
