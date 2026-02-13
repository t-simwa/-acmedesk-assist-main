"""
Embeddings module for generating vector embeddings.

This module provides:
- Wrapper around Sentence Transformers (open-source, local)
- Optional OpenAI embeddings fallback
- Batch embedding function with retries
"""

import logging
import time
from typing import List, Optional

logger = logging.getLogger(__name__)

# Try to import Sentence Transformers (primary)
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("sentence-transformers not available. Install with: pip install sentence-transformers")

# Try to import OpenAI (optional fallback)
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("openai not available. Install with: pip install openai")


class EmbeddingModel:
    """
    Embedding model wrapper that supports multiple backends.
    
    Primary: Sentence Transformers (local, open-source)
    Fallback: OpenAI embeddings (if API key provided)
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        openai_api_key: Optional[str] = None,
        use_openai: bool = False,
    ):
        """
        Initialize the embedding model.

        Args:
            model_name: Name of the Sentence Transformer model (default: all-MiniLM-L6-v2)
            openai_api_key: OpenAI API key (optional, for fallback)
            use_openai: If True, use OpenAI instead of Sentence Transformers
        """
        self.model_name = model_name
        self.openai_api_key = openai_api_key
        self.use_openai = use_openai
        self.model = None
        self.openai_client = None
        self.embedding_dimension = None

        # Initialize the appropriate model
        if use_openai and openai_api_key:
            if not OPENAI_AVAILABLE:
                raise ImportError("openai package not installed. Install with: pip install openai")
            self.openai_client = OpenAI(api_key=openai_api_key)
            self.embedding_dimension = 1536  # text-embedding-3-small dimension
            logger.info("Using OpenAI embeddings (text-embedding-3-small)")
        else:
            if not SENTENCE_TRANSFORMERS_AVAILABLE:
                raise ImportError(
                    "sentence-transformers not installed. Install with: pip install sentence-transformers"
                )
            try:
                self.model = SentenceTransformer(model_name)
                self.embedding_dimension = self.model.get_sentence_embedding_dimension()
                logger.info(f"Using Sentence Transformers model: {model_name} (dimension: {self.embedding_dimension})")
            except Exception as e:
                logger.error(f"Failed to load Sentence Transformer model {model_name}: {e}")
                raise

    def embed(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            # Return zero vector of appropriate dimension
            return [0.0] * self.embedding_dimension

        if self.use_openai and self.openai_client:
            return self._embed_openai([text])[0]
        else:
            return self._embed_sentence_transformer([text])[0]

    def embed_batch(self, texts: List[str], batch_size: int = 32, max_retries: int = 3) -> List[List[float]]:
        """
        Generate embeddings for a batch of texts with retry logic.

        Args:
            texts: List of texts to embed
            batch_size: Number of texts to process in each batch
            max_retries: Maximum number of retry attempts on failure

        Returns:
            List of embedding vectors (one per input text)
        """
        if not texts:
            return []

        # Filter out empty texts
        valid_texts = [t if t and t.strip() else "" for t in texts]
        
        if self.use_openai and self.openai_client:
            return self._embed_openai_batch(valid_texts, batch_size, max_retries)
        else:
            return self._embed_sentence_transformer_batch(valid_texts, batch_size)

    def _embed_sentence_transformer(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using Sentence Transformers."""
        try:
            embeddings = self.model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
            # Convert numpy array to list of lists
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings with Sentence Transformers: {e}")
            raise

    def _embed_sentence_transformer_batch(
        self, texts: List[str], batch_size: int
    ) -> List[List[float]]:
        """Generate embeddings in batches using Sentence Transformers."""
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                batch_embeddings = self.model.encode(batch, show_progress_bar=False, convert_to_numpy=True)
                all_embeddings.extend(batch_embeddings.tolist())
            except Exception as e:
                logger.error(f"Error in batch {i // batch_size + 1}: {e}")
                # Return zero vectors for failed batch
                for _ in batch:
                    all_embeddings.append([0.0] * self.embedding_dimension)
        
        return all_embeddings

    def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI API."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=texts,
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"Error generating embeddings with OpenAI: {e}")
            raise

    def _embed_openai_batch(
        self, texts: List[str], batch_size: int, max_retries: int
    ) -> List[List[float]]:
        """Generate embeddings in batches using OpenAI API with retry logic."""
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            retries = 0
            success = False
            
            while retries < max_retries and not success:
                try:
                    response = self.openai_client.embeddings.create(
                        model="text-embedding-3-small",
                        input=batch,
                    )
                    batch_embeddings = [item.embedding for item in response.data]
                    all_embeddings.extend(batch_embeddings)
                    success = True
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        logger.error(f"Failed to embed batch after {max_retries} retries: {e}")
                        # Return zero vectors for failed batch
                        for _ in batch:
                            all_embeddings.append([0.0] * self.embedding_dimension)
                    else:
                        wait_time = 2 ** retries  # Exponential backoff
                        logger.warning(f"Retry {retries}/{max_retries} after {wait_time}s: {e}")
                        time.sleep(wait_time)
        
        return all_embeddings

    def get_dimension(self) -> int:
        """Get the dimension of embeddings produced by this model."""
        return self.embedding_dimension


def get_embedding_model(
    model_name: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    use_openai: bool = False,
) -> EmbeddingModel:
    """
    Factory function to create an EmbeddingModel instance.

    Args:
        model_name: Sentence Transformer model name (default: all-MiniLM-L6-v2)
        openai_api_key: OpenAI API key (optional)
        use_openai: If True, use OpenAI instead of Sentence Transformers

    Returns:
        EmbeddingModel instance
    """
    if model_name is None:
        model_name = "all-MiniLM-L6-v2"
    
    return EmbeddingModel(
        model_name=model_name,
        openai_api_key=openai_api_key,
        use_openai=use_openai,
    )
