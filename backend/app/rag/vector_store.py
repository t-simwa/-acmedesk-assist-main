"""
Vector store module for storing and searching document embeddings.

This module provides:
- Chroma vector database integration
- Interface for adding documents and searching
- Vector ID mapping to document and chunk metadata
"""

import logging
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Try to import ChromaDB
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logger.warning("chromadb not available. Install with: pip install chromadb")


class VectorStore:
    """
    Vector store wrapper for ChromaDB.
    
    Provides interface for:
    - Adding document chunks with embeddings
    - Searching for similar chunks
    - Managing vector IDs and metadata mapping
    """

    def __init__(
        self,
        collection_name: str = "acmedesk_documents",
        persist_directory: Optional[str] = None,
    ):
        """
        Initialize the vector store.

        Args:
            collection_name: Name of the Chroma collection
            persist_directory: Directory to persist ChromaDB data (None = in-memory)
        """
        if not CHROMADB_AVAILABLE:
            raise ImportError("chromadb not installed. Install with: pip install chromadb")

        self.collection_name = collection_name
        self.persist_directory = persist_directory

        # Initialize ChromaDB client
        if persist_directory:
            persist_path = Path(persist_directory)
            persist_path.mkdir(parents=True, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=str(persist_path),
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            logger.info(f"Initialized persistent ChromaDB at: {persist_directory}")
        else:
            self.client = chromadb.Client(
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            logger.info("Initialized in-memory ChromaDB")

        # Get or create collection
        try:
            self.collection = self.client.get_collection(name=collection_name)
            logger.info(f"Loaded existing collection: {collection_name}")
        except Exception:
            self.collection = self.client.create_collection(name=collection_name)
            logger.info(f"Created new collection: {collection_name}")

    def add_documents(
        self,
        chunks: List,
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict]] = None,
        user_id: Optional[str] = None,
        knowledge_base_id: Optional[str] = None,
    ) -> List[str]:
        """
        Add document chunks with embeddings to the vector store.

        Args:
            chunks: List of Chunk objects from chunking module
            embeddings: List of embedding vectors (one per chunk)
            metadatas: Optional list of metadata dictionaries (if None, extracted from chunks)
            user_id: Optional user ID to associate with all chunks

        Returns:
            List of vector IDs assigned to the chunks
        """
        if len(chunks) != len(embeddings):
            raise ValueError(f"Mismatch: {len(chunks)} chunks but {len(embeddings)} embeddings")

        # Prepare data for ChromaDB
        ids = []
        texts = []
        metadata_list = []

        for i, chunk in enumerate(chunks):
            # Generate unique ID for this chunk
            chunk_id = f"{chunk.doc_id}_{chunk.chunk_index}_{uuid.uuid4().hex[:8]}"
            ids.append(chunk_id)

            # Extract text
            texts.append(chunk.text)

            # Prepare metadata
            if metadatas and i < len(metadatas):
                metadata = metadatas[i].copy()
            else:
                metadata = {}

            # Add chunk metadata
            metadata.update({
                "doc_id": chunk.doc_id,
                "chunk_index": chunk.chunk_index,
                "source_path": chunk.source_path or "",
                "page_or_section": chunk.page_or_section or "",
                "start_char": chunk.start_char,
                "end_char": chunk.end_char,
            })
            
            # Add user_id and knowledge_base_id if provided
            if user_id:
                metadata["user_id"] = user_id
            if knowledge_base_id:
                metadata["knowledge_base_id"] = knowledge_base_id

            metadata_list.append(metadata)

        # Add to ChromaDB
        try:
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadata_list,
            )
            logger.info(f"Added {len(chunks)} chunks to vector store")
            return ids
        except Exception as e:
            logger.error(f"Error adding chunks to vector store: {e}")
            raise

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict] = None,
    ) -> List[Dict]:
        """
        Search for similar chunks using a query embedding.

        Args:
            query_embedding: Embedding vector for the query
            top_k: Number of top results to return
            filter_metadata: Optional metadata filters (e.g., {"doc_id": "specific-doc"})

        Returns:
            List of dictionaries containing:
            - text: Chunk text
            - score: Similarity score
            - metadata: Chunk metadata (doc_id, chunk_index, etc.)
            - id: Vector ID
        """
        try:
            # Build where clause for filtering
            where = None
            if filter_metadata:
                where = filter_metadata

            # Query ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where,
            )

            # Format results
            formatted_results = []
            
            # ChromaDB returns results in a specific format
            if results["ids"] and len(results["ids"][0]) > 0:
                for i in range(len(results["ids"][0])):
                    result = {
                        "id": results["ids"][0][i],
                        "text": results["documents"][0][i] if results["documents"] else "",
                        "score": 1.0 - results["distances"][0][i] if results["distances"] else 0.0,  # Convert distance to similarity
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    }
                    formatted_results.append(result)

            logger.info(f"Found {len(formatted_results)} results for query")
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            raise

    def delete_by_doc_id(self, doc_id: str) -> int:
        """
        Delete all chunks for a specific document.

        Args:
            doc_id: Document ID to delete

        Returns:
            Number of chunks deleted
        """
        try:
            # Get all chunks for this document
            results = self.collection.get(
                where={"doc_id": doc_id}
            )
            
            if results["ids"]:
                self.collection.delete(ids=results["ids"])
                count = len(results["ids"])
                logger.info(f"Deleted {count} chunks for doc_id: {doc_id}")
                return count
            else:
                logger.info(f"No chunks found for doc_id: {doc_id}")
                return 0
        except Exception as e:
            logger.error(f"Error deleting chunks for doc_id {doc_id}: {e}")
            raise

    def get_collection_count(self) -> int:
        """
        Get the total number of chunks in the collection.

        Returns:
            Number of chunks
        """
        try:
            count = self.collection.count()
            return count
        except Exception as e:
            logger.error(f"Error getting collection count: {e}")
            return 0

    def clear_collection(self):
        """Clear all chunks from the collection."""
        try:
            # Delete the collection and recreate it
            self.client.delete_collection(name=self.collection_name)
            self.collection = self.client.create_collection(name=self.collection_name)
            logger.info(f"Cleared collection: {self.collection_name}")
        except Exception as e:
            logger.error(f"Error clearing collection: {e}")
            raise
