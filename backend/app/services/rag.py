"""
RAG (Retrieval-Augmented Generation) pipeline service.

This module provides functions for:
- Retrieving relevant document chunks based on a query
- Generating answers using retrieved context
"""

import logging
from typing import List

from ..config import get_settings
from ..rag.embeddings import get_embedding_model
from ..rag.generator import LLMGenerator, generate_answer_with_citations
from ..rag.retrieval import build_prompt, retrieve
from ..rag.vector_store import VectorStore
from ..schemas.chat import SourceRef

logger = logging.getLogger(__name__)

# Global instances (initialized on first use)
_embedding_model = None
_vector_store = None
_llm_generator = None


def _get_embedding_model():
    """Get or create embedding model instance."""
    global _embedding_model
    if _embedding_model is None:
        settings = get_settings()
        _embedding_model = get_embedding_model(
            model_name=settings.embedding_model,
            use_openai=settings.use_openai_embeddings,
            openai_api_key=settings.openai_api_key
        )
    return _embedding_model


def _get_vector_store():
    """Get or create vector store instance."""
    global _vector_store
    if _vector_store is None:
        settings = get_settings()
        _vector_store = VectorStore(
            collection_name=settings.vector_collection_name,
            persist_directory=settings.vector_store_persist_dir
        )
    return _vector_store


def _get_llm_generator():
    """Get or create LLM generator instance."""
    global _llm_generator
    if _llm_generator is None:
        settings = get_settings()
        # Use Ollama API key if available, otherwise fall back to OpenAI API key
        api_key = settings.ollama_api_key or settings.openai_api_key
        _llm_generator = LLMGenerator(
            model=settings.llm_model,
            api_key=api_key,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            base_url=settings.llm_base_url
        )
    return _llm_generator


async def retrieve_relevant_chunks(query: str, top_k: int = 5) -> List[SourceRef]:
    """
    Retrieve relevant document chunks for a given query.

    Args:
        query: The user's query string
        top_k: Number of top chunks to retrieve (default: 5)

    Returns:
        List of SourceRef objects containing relevant chunks
    """
    try:
        settings = get_settings()
        embedding_model = _get_embedding_model()
        vector_store = _get_vector_store()
        
        # Retrieve chunks
        chunks = retrieve(
            query=query,
            embedding_model=embedding_model,
            vector_store=vector_store,
            top_k=top_k,
            use_hybrid_search=settings.retrieval_use_hybrid_search,
            hybrid_weights=(
                settings.retrieval_hybrid_semantic_weight,
                settings.retrieval_hybrid_keyword_weight
            ),
            use_reranking=settings.retrieval_use_reranking,
            rerank_top_n=settings.retrieval_rerank_top_n
        )
        
        # Convert to SourceRef objects
        source_refs = []
        seen_doc_ids = set()  # Track unique documents
        
        for chunk in chunks:
            metadata = chunk.get('metadata', {})
            doc_id = metadata.get('doc_id', 'unknown')
            chunk_index = metadata.get('chunk_index', 0)
            
            # Create human-readable title from doc_id
            # Convert "getting-started" -> "Getting Started"
            # Convert "api-integration" -> "API Integration"
            if doc_id and doc_id != 'unknown':
                title = doc_id.replace('-', ' ').replace('_', ' ')
                # Capitalize each word
                title = ' '.join(word.capitalize() for word in title.split())
            else:
                title = metadata.get('title') or metadata.get('source_path', 'Unknown Document')
                # Clean up source_path format: /docs/getting-started.md -> Getting Started
                if title.startswith('/docs/'):
                    title = title.replace('/docs/', '').replace('.md', '').replace('.html', '').replace('.txt', '')
                    title = title.replace('-', ' ').replace('_', ' ')
                    title = ' '.join(word.capitalize() for word in title.split())
            
            # Store full text in snippet for prompt building (API can truncate if needed)
            snippet = chunk.get('text', '')
            score = chunk.get('score', 0.0)
            
            # Only add if we haven't seen this doc_id before (deduplicate)
            if doc_id not in seen_doc_ids:
                source_ref = SourceRef(
                    doc_id=doc_id,
                    chunk_index=chunk_index,
                    title=title,
                    snippet=snippet,
                    score=score
                )
                source_refs.append(source_ref)
                seen_doc_ids.add(doc_id)
        
        logger.info(f"Retrieved {len(source_refs)} chunks for query: {query[:50]}...")
        return source_refs
    except Exception as e:
        logger.error(f"Error retrieving chunks: {e}", exc_info=True)
        return []


async def generate_answer(query: str, sources: List[SourceRef]) -> str:
    """
    Generate an answer using the query and retrieved sources.

    Args:
        query: The user's query string
        sources: List of relevant source chunks

    Returns:
        Generated answer string
    """
    try:
        # Check if this is a casual greeting or conversational message
        query_lower = query.lower().strip()
        casual_greetings = [
            'hi', 'hello', 'hey', 'hi there', 'hello there',
            'how are you', 'how are you doing', 'what\'s up', 'sup',
            'good morning', 'good afternoon', 'good evening',
            'thanks', 'thank you', 'thank', 'thx',
            'bye', 'goodbye', 'see you', 'later'
        ]
        
        # Check if query matches any casual greeting
        is_casual = any(
            query_lower == greeting or query_lower.startswith(greeting + ' ')
            for greeting in casual_greetings
        )
        
        # For casual messages, respond naturally without requiring sources
        if is_casual:
            # Use a friendly response without requiring sources
            generator = _get_llm_generator()
            prompt = f"""You are a helpful assistant for AcmeDesk. The user said: "{query}"

Respond naturally and friendly. Keep it brief and welcoming. You can mention that you're here to help with AcmeDesk questions. Do NOT include citations."""
            
            try:
                answer = generator.generate(prompt)
                return answer
            except Exception as e:
                logger.warning(f"Error generating casual response: {e}")
                # Fallback friendly response
                if 'hi' in query_lower or 'hello' in query_lower:
                    return "Hi! 👋 I'm here to help you with questions about AcmeDesk — pricing, setup, integrations, and more. What can I help you with?"
                elif 'how are you' in query_lower:
                    return "I'm doing great, thanks for asking! I'm here to help you with AcmeDesk. What would you like to know?"
                elif 'thank' in query_lower:
                    return "You're welcome! Feel free to ask if you need anything else about AcmeDesk."
                else:
                    return "Hello! How can I help you with AcmeDesk today?"
        
        if not sources:
            return (
                "I don't have enough information to answer this question based on the available knowledge base. "
                "Please try rephrasing your question or contact support for assistance."
            )
        
        settings = get_settings()
        generator = _get_llm_generator()
        
        # Convert SourceRef to chunk format for prompt building
        # SourceRef.snippet already contains the full chunk text from retrieval
        context_chunks = []
        for source in sources:
            context_chunks.append({
                'text': source.snippet or '',  # Full chunk text is stored in snippet
                'metadata': {
                    'doc_id': source.doc_id,
                    'chunk_index': source.chunk_index,
                    'title': source.title or source.doc_id
                },
                'score': source.score or 0.0
            })
        
        # Build prompt
        prompt = build_prompt(
            context_chunks=context_chunks,
            user_query=query,
            system_prompt=settings.system_prompt
        )
        
        # Generate answer
        answer, cited_chunks = generate_answer_with_citations(
            prompt=prompt,
            generator=generator,
            context_chunks=context_chunks,
            system_prompt=None  # Already in prompt
        )
        
        logger.info(f"Generated answer for query: {query[:50]}...")
        return answer
    except Exception as e:
        logger.error(f"Error generating answer: {e}", exc_info=True)
        return (
            "I encountered an error while generating a response. "
            "Please try again or contact support if the issue persists."
        )


async def process_chat_query(query: str, top_k: int = 5) -> tuple[str, List[SourceRef]]:
    """
    Process a chat query through the RAG pipeline.

    This is a convenience function that combines retrieval and generation.

    Args:
        query: The user's query string
        top_k: Number of top chunks to retrieve (default: 5)

    Returns:
        Tuple of (answer, sources)
    """
    # Retrieve relevant chunks
    sources = await retrieve_relevant_chunks(query, top_k=top_k)
    
    # Generate answer
    answer = await generate_answer(query, sources)
    
    return answer, sources
