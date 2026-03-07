"""
Script to initialize the default knowledge base and index documents from data/docs folder.

This script:
1. Ensures the default knowledge base exists
2. Scans the data/docs folder for markdown/html/text files
3. Indexes all documents into the default knowledge base
4. Updates document records with knowledge_base_id
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings, get_vector_store_persist_dir
from app.models.base import get_database_url, init_db
from app.services import database, storage
from app.routers.documents import get_document_type
from app.rag.ingestion import ingest_document
from sqlalchemy import select, text
from app.models.document import Document
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_KB_ID = "00000000-0000-0000-0000-000000000001"


async def ensure_default_knowledge_base():
    """Ensure the default knowledge base exists."""
    from sqlalchemy import text
    from app.models.base import get_database_url, get_engine
    from datetime import datetime
    
    database_url = get_database_url()
    engine = get_engine()
    
    async with engine.begin() as conn:
        # Check if KB exists using raw SQL
        result = await conn.execute(
            text("SELECT id FROM knowledge_bases WHERE id = :id"),
            {"id": DEFAULT_KB_ID}
        )
        kb_exists = result.fetchone() is not None
        
        if not kb_exists:
            logger.info("Creating default knowledge base...")
            now = datetime.utcnow().isoformat()
            is_default = 1 if "sqlite" in database_url else True
            is_active = 1 if "sqlite" in database_url else True
            
            await conn.execute(
                text("""
                    INSERT INTO knowledge_bases 
                    (id, user_id, name, description, is_default, is_active, created_at, updated_at)
                    VALUES (:id, NULL, :name, :description, :is_default, :is_active, :created_at, :updated_at)
                """),
                {
                    "id": DEFAULT_KB_ID,
                    "name": "Default Knowledge Base",
                    "description": "System default knowledge base containing documentation from data/docs folder",
                    "is_default": is_default,
                    "is_active": is_active,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            logger.info("Default knowledge base created")
        else:
            logger.info("Default knowledge base already exists")
    
    # Now use ORM to get it
    kb = await database.get_knowledge_base(DEFAULT_KB_ID)
    return kb


async def index_docs_folder(force: bool = False):
    """Index all documents from the data/docs folder into the default knowledge base.
    If force=True, clear the default vector collection and re-ingest all docs (populates persistent store).
    """
    # Try multiple possible paths
    possible_paths = [
        Path("data/docs"),  # From project root
        Path("../data/docs"),  # From backend directory
        Path("../../data/docs"),  # From backend/scripts directory
    ]
    
    docs_folder = None
    for path in possible_paths:
        if path.exists():
            docs_folder = path
            break
    
    if not docs_folder:
        logger.warning(f"Docs folder not found. Tried: {[str(p) for p in possible_paths]}")
        return
    
    logger.info(f"Scanning docs folder: {docs_folder}")
    
    # Find all markdown, html, and text files
    supported_extensions = [".md", ".markdown", ".html", ".htm", ".txt"]
    doc_files = []
    for ext in supported_extensions:
        doc_files.extend(docs_folder.rglob(f"*{ext}"))
    
    logger.info(f"Found {len(doc_files)} documents to index")

    if force:
        from app.rag.vector_store import VectorStore
        persist_dir = get_vector_store_persist_dir()
        logger.info(f"Force mode: clearing default collection at {persist_dir} and re-ingesting")
        try:
            vs = VectorStore(collection_name=settings.vector_collection_name, persist_directory=persist_dir)
            vs.client.delete_collection(name=settings.vector_collection_name)
            vs.collection = vs.client.create_collection(name=settings.vector_collection_name)
            logger.info("Default collection cleared")
        except Exception as e:
            logger.warning(f"Could not clear collection (may be empty): {e}")
    
    indexed_count = 0
    error_count = 0
    
    for doc_file in doc_files:
        try:
            logger.info(f"Processing: {doc_file.name}")
            
            # Check if document already exists
            # We'll use a simple approach: check by file path
            # In a real system, you might want to track this differently
            file_path_str = str(doc_file.resolve())
            
            # Read file content
            file_content = doc_file.read_bytes()
            file_size = len(file_content)
            
            # Determine document type
            doc_type = get_document_type(doc_file.name)
            
            # Generate doc_id (use a deterministic approach based on file path)
            import hashlib
            doc_id = hashlib.md5(file_path_str.encode()).hexdigest()[:36]
            
            # Check if document already exists in DB
            existing_doc = await database.get_document(doc_id)
            if existing_doc:
                logger.info(f"  Document already in DB: {doc_file.name}")
                # Update knowledge_base_id if needed
                if existing_doc.get("knowledge_base_id") != DEFAULT_KB_ID:
                    from app.models.document import Document
                    from app.models.base import get_session_factory
                    session_factory = get_session_factory()
                    async with session_factory() as session:
                        result = await session.execute(
                            select(Document).where(Document.id == doc_id)
                        )
                        doc = result.scalar_one_or_none()
                        if doc:
                            doc.knowledge_base_id = DEFAULT_KB_ID
                            await session.commit()
                            logger.info(f"  Updated knowledge_base_id for: {doc_file.name}")
                if not force:
                    continue
                # force=True: still ingest into vector store below (skip create_document)
            
            # Create document record (only when not existing)
            if not existing_doc:
                document = await database.create_document(
                doc_id=doc_id,
                name=doc_file.name,
                doc_type=doc_type,
                file_path=file_path_str,
                file_size=file_size,
                status="processing",
                user_id="system",  # System user for default KB
                knowledge_base_id=DEFAULT_KB_ID,
                )
            
            # Index the document by ingesting, chunking, embedding, and storing in the
            # shared default vector store collection. This mirrors what the regular
            # document pipeline does, but without going through the HTTP layer.
            from app.rag.chunking import chunk_text
            from app.rag.embeddings import EmbeddingModel
            from app.rag.vector_store import VectorStore
            from app.config import get_chunking_config

            try:
                # Ingest (extract text)
                doc = ingest_document(doc_file)
                if doc is None:
                    raise RuntimeError("Failed to extract text from document")

                # Chunk
                chunking_config = get_chunking_config()
                chunks = chunk_text(doc.text, chunking_config, doc_id, doc.url)
                if not chunks:
                    raise RuntimeError("No chunks created from document")

                # Embed
                embedding_model = EmbeddingModel(
                    model_name=settings.embedding_model,
                    openai_api_key=settings.openai_api_key,
                    use_openai=settings.use_openai_embeddings,
                )
                texts = [chunk.text for chunk in chunks]
                embeddings = embedding_model.embed_batch(texts)

                # Store in default/global collection used by RAG (same path as API)
                vector_store = VectorStore(
                    collection_name=settings.vector_collection_name,
                    persist_directory=get_vector_store_persist_dir(),
                )
                vector_store.add_documents(
                    chunks,
                    embeddings,
                    user_id="system",
                    knowledge_base_id=DEFAULT_KB_ID,
                )

                logger.info(f"  Successfully indexed {doc_file.name} ({len(chunks)} chunks)")
                indexed_count += 1
            except Exception as e:
                logger.error(f"  Error indexing {doc_file.name}: {e}", exc_info=True)
                error_count += 1
                
        except Exception as e:
            logger.error(f"  Error processing {doc_file.name}: {e}", exc_info=True)
            error_count += 1
    
    logger.info(f"\nIndexing complete:")
    logger.info(f"  Successfully indexed: {indexed_count}")
    logger.info(f"  Errors: {error_count}")
    logger.info(f"  Total processed: {len(doc_files)}")


async def main(force: bool = False):
    """Main function."""
    logger.info("=" * 60)
    logger.info("Initializing Default Knowledge Base")
    logger.info("=" * 60)
    
    try:
        # Migration should already be run, but we'll verify tables exist
        logger.info("Verifying database tables...")
        
        # Initialize database models (this ensures SQLAlchemy knows about the tables)
        logger.info("Initializing database models...")
        await init_db()
        logger.info("Database models initialized")
        
        # Ensure default KB exists
        await ensure_default_knowledge_base()
        
        # Index docs folder (--force clears vector collection and re-ingests all)
        await index_docs_folder(force=force)
        
        logger.info("\n" + "=" * 60)
        logger.info("Initialization Complete")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Error during initialization: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize default KB and index data/docs")
    parser.add_argument("--force", action="store_true", help="Clear default vector collection and re-ingest all docs (use when persistent store is empty)")
    args = parser.parse_args()
    asyncio.run(main(force=args.force))
