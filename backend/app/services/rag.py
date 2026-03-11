"""
RAG (Retrieval-Augmented Generation) pipeline service.

This module provides functions for:
- Retrieving relevant document chunks based on a query
- Generating answers using retrieved context
"""

import logging
from typing import List, Optional

from ..config import get_settings, get_vector_store_persist_dir
from ..rag.embeddings import get_embedding_model
from ..rag.generator import LLMGenerator, generate_answer_with_citations
from ..rag.retrieval import build_prompt, retrieve
from ..rag.vector_store import VectorStore
from ..schemas.chat import SourceRef

logger = logging.getLogger(__name__)

# Default knowledge base ID (system docs from data/docs). Chunks without metadata
# knowledge_base_id but with user_id="system" or None are treated as default KB.
DEFAULT_KB_ID = "00000000-0000-0000-0000-000000000001"

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
    """Get or create global/default vector store instance.

    This is used for the system/default knowledge base collection defined
    by settings.vector_collection_name (e.g. docs ingested from data/docs).
    """
    global _vector_store
    if _vector_store is None:
        settings = get_settings()
        _vector_store = VectorStore(
            collection_name=settings.vector_collection_name,
            persist_directory=get_vector_store_persist_dir(),
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


async def retrieve_relevant_chunks(
    query: str,
    top_k: int = 5,
    user_id: Optional[str] = None,
    active_kb_ids: Optional[List[str]] = None,
) -> List[SourceRef]:
    """
    Retrieve relevant document chunks for a given query.

    Args:
        query: The user's query string
        top_k: Number of top chunks to retrieve (default: 5)
        user_id: Optional user ID to filter chunks by (only return chunks from user's documents)

    Returns:
        List of SourceRef objects containing relevant chunks
    """
    try:
        settings = get_settings()
        embedding_model = _get_embedding_model()

        # Build vector store set:
        # - Always include the global/default collection (system docs)
        # - If user_id/tenant_id is provided, also search the per-tenant collection
        vector_stores: List[VectorStore] = []

        # Global/system collection (e.g. docs ingested from data/docs)
        try:
            vector_stores.append(_get_vector_store())
        except Exception as e:
            logger.error(f"Error initializing default vector store: {e}", exc_info=True)

        # Per-tenant document collection used by the upload pipeline
        if user_id:
            try:
                tenant_collection_name = f"tenant_{user_id}_documents"
                vector_stores.append(
                    VectorStore(
                        collection_name=tenant_collection_name,
                        persist_directory=get_vector_store_persist_dir(),
                    )
                )
            except Exception as e:
                logger.error(
                    f"Error initializing tenant vector store for user_id={user_id}: {e}",
                    exc_info=True,
                )

        # If no vector stores could be initialized, bail out early
        if not vector_stores:
            logger.error("No vector stores available for retrieval")
            return []

        # Retrieve chunks from all relevant collections.
        # We intentionally do not filter by user_id here:
        # 1. Default KB documents have user_id=\"system\" and should be accessible to all users
        # 2. We'll filter by knowledge_base_id which already ensures proper access control
        # 3. User-specific documents will be filtered by knowledge_base_id (they belong to user's KBs)
        retrieve_top_k = top_k * 3 if active_kb_ids else top_k
        all_chunks = []
        for store in vector_stores:
            try:
                store_chunks = retrieve(
                    query=query,
                    embedding_model=embedding_model,
                    vector_store=store,
                    top_k=retrieve_top_k,
                    filters=None,  # Let KB filtering handle access control
                    use_hybrid_search=settings.retrieval_use_hybrid_search,
                    hybrid_weights=(
                        settings.retrieval_hybrid_semantic_weight,
                        settings.retrieval_hybrid_keyword_weight,
                    ),
                    use_reranking=settings.retrieval_use_reranking,
                    rerank_top_n=settings.retrieval_rerank_top_n,
                )
                all_chunks.extend(store_chunks)
            except Exception as e:
                logger.error(
                    f"Error retrieving from vector store '{store.collection_name}': {e}",
                    exc_info=True,
                )

        if not all_chunks:
            logger.info("No chunks retrieved from any vector store")
            return []

        # Deduplicate by vector ID and sort by score descending before KB/user filtering
        unique_chunks = []
        seen_ids = set()
        for chunk in all_chunks:
            chunk_id = chunk.get("id")
            if chunk_id and chunk_id in seen_ids:
                continue
            if chunk_id:
                seen_ids.add(chunk_id)
            unique_chunks.append(chunk)

        unique_chunks.sort(key=lambda c: c.get("score", 0.0), reverse=True)
        chunks = unique_chunks
        
        # Filter by active knowledge base IDs if provided
        if active_kb_ids:
            logger.info(f"Filtering chunks by active KB IDs: {active_kb_ids}, total chunks before filter: {len(chunks)}")
            default_kb_active = DEFAULT_KB_ID in active_kb_ids
            filtered_chunks = []
            for chunk in chunks:
                chunk_kb_id = chunk.get('metadata', {}).get('knowledge_base_id')
                chunk_user_id = chunk.get('metadata', {}).get('user_id')
                
                # Include chunk if:
                # 1. It belongs to an active knowledge base (chunk_kb_id in active_kb_ids), OR
                # 2. It's from default KB (user_id="system" or None) and default KB is active.
                #    (Legacy ingested docs may have no knowledge_base_id in metadata.)
                is_default_kb_chunk = chunk_user_id in ("system", None)
                if chunk_kb_id in active_kb_ids:
                    # Additional check: if it's a user-specific KB, ensure user_id matches
                    if chunk_user_id and chunk_user_id != "system" and chunk_user_id != user_id:
                        logger.debug(f"Skipping chunk from different user: chunk_user_id={chunk_user_id}, current_user_id={user_id}")
                        continue
                    filtered_chunks.append(chunk)
                elif default_kb_active and is_default_kb_chunk:
                    # Legacy default KB chunks without knowledge_base_id in metadata
                    filtered_chunks.append(chunk)
                else:
                    logger.debug(f"Chunk KB ID {chunk_kb_id} not in active KBs: {active_kb_ids}")
            logger.info(f"Filtered to {len(filtered_chunks)} chunks after KB filtering")
            chunks = filtered_chunks[:top_k]  # Limit to top_k after filtering
        else:
            # If no active KBs specified, filter by user_id to only show user's documents
            if user_id:
                filtered_chunks = []
                for chunk in chunks:
                    chunk_user_id = chunk.get('metadata', {}).get('user_id')
                    # Include if it's the user's document or from default KB (system)
                    if chunk_user_id == user_id or chunk_user_id == "system" or chunk_user_id is None:
                        filtered_chunks.append(chunk)
                chunks = filtered_chunks[:top_k]
        
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


async def generate_answer(query: str, sources: List[SourceRef], system_prompt: Optional[str] = None) -> str:
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
            # No retrieved chunks – fall back to a lightweight, general LLM answer
            # instead of always returning the hard-coded "not enough information"
            # message. This ensures the chat widget still feels responsive even
            # when retrieval returns no context.
            generator = _get_llm_generator()

            prompt = f"""You are a helpful assistant for AcmeDesk, a customer support platform.

The user asked:
"{query}"

You currently did NOT receive any knowledge-base context chunks, so:
- If the question is generic (e.g. about common payment methods, upgrades/downgrades, or what AcmeDesk is), answer from your general knowledge in a concise, helpful way.
- If the question clearly requires specific AcmeDesk documentation details you don't have, say you don't have enough information and suggest contacting support.

Do NOT mention that you received no context.
Do NOT invent fake AcmeDesk-specific details (plan names, exact prices, etc.).
Keep the tone professional and friendly.
Do NOT include citations in your answer."""

            try:
                answer = generator.generate(prompt)
                return answer
            except Exception as e:
                logger.error(f"Error generating fallback answer without sources: {e}", exc_info=True)
                return (
                    "I don't have enough information to answer this question based on the available knowledge base. "  # noqa: E501
                    "Please try rephrasing your question or contact support for assistance."
                )
        
        settings = get_settings()
        generator = _get_llm_generator()
        if system_prompt:
            settings.system_prompt = system_prompt
        
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
        # build channel-specific system prompt if chatbot config available
        from ..services.prompt_builder import build_system_prompt
        system_prompt = settings.system_prompt
        # note: message_router may already compute prompt; here we just include default
        prompt = build_prompt(
            context_chunks=context_chunks,
            user_query=query,
            system_prompt=system_prompt
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


# Confidence threshold per docs/page.md Flow 5 step 31 (exactly 0.7)
CONFIDENCE_THRESHOLD = 0.7


async def process_chat_query(
    query: str,
    channel: str = "web",
    top_k: int = 5,
    user_id: Optional[str] = None,
    active_kb_ids: Optional[List[str]] = None,
    fallback_message: str = "I'm not sure I understand. Would you like to speak with our team?",
    system_prompt: Optional[str] = None,
) -> tuple[str, List[SourceRef], bool]:
    """
    Process a chat query through the RAG pipeline.

    Args:
        query: The user's query string
        top_k: Number of top chunks to retrieve (default: 5)
        user_id: Optional user ID to filter chunks by
        active_kb_ids: Optional list of knowledge base IDs to filter by
        fallback_message: Message to return if confidence is too low (use chatbot's custom message)

    Returns:
        Tuple of (answer, sources, low_confidence)
        low_confidence is True when fallback_message was returned so widget can prompt for lead details.
    """
    sources = await retrieve_relevant_chunks(
        query, top_k=top_k, user_id=user_id, active_kb_ids=active_kb_ids
    )

    if sources:
        highest_score = max(source.score for source in sources)
        if highest_score < CONFIDENCE_THRESHOLD:
            logger.info(
                "Query confidence too low: %s < %s. Using fallback message.",
                f"{highest_score:.2f}",
                CONFIDENCE_THRESHOLD,
            )
            return fallback_message, sources, True

    answer = await generate_answer(query, sources, system_prompt=system_prompt)
    return answer, sources, False
