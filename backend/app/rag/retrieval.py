"""
Retrieval module for RAG pipeline.

This module provides:
- Query embedding and vector search
- Hybrid search (semantic + keyword/BM25)
- Re-ranking for improved relevance
- Prompt building with context injection
"""

import logging
import re
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Try to import rank-bm25 for keyword search
try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
    logger.warning("rank-bm25 not available. Install with: pip install rank-bm25. Hybrid search will use semantic only.")

# Try to import sentence-transformers for re-ranking
try:
    from sentence_transformers import CrossEncoder
    CROSS_ENCODER_AVAILABLE = True
except ImportError:
    CROSS_ENCODER_AVAILABLE = False
    logger.warning("sentence-transformers not available for re-ranking. Install with: pip install sentence-transformers")


def _tokenize(text: str) -> List[str]:
    """
    Simple tokenizer for BM25.
    
    Args:
        text: Text to tokenize
        
    Returns:
        List of lowercase tokens
    """
    # Convert to lowercase and split on non-word characters
    tokens = re.findall(r'\b\w+\b', text.lower())
    return tokens


def _build_bm25_index(chunks: List[Dict]) -> Optional[BM25Okapi]:
    """
    Build BM25 index from chunks.
    
    Args:
        chunks: List of chunk dictionaries with 'text' key
        
    Returns:
        BM25Okapi index or None if BM25 not available
    """
    if not BM25_AVAILABLE:
        return None
    
    if not chunks:
        return None
    
    # Tokenize all chunk texts
    tokenized_corpus = [_tokenize(chunk.get('text', '')) for chunk in chunks]
    
    if not any(tokenized_corpus):
        return None
    
    try:
        bm25 = BM25Okapi(tokenized_corpus)
        return bm25
    except Exception as e:
        logger.error(f"Error building BM25 index: {e}")
        return None


def _bm25_search(
    query: str,
    chunks: List[Dict],
    bm25_index: Optional[BM25Okapi],
    top_k: int = 5
) -> List[Tuple[int, float]]:
    """
    Perform BM25 keyword search.
    
    Args:
        query: Search query
        chunks: List of chunk dictionaries
        bm25_index: BM25 index (if available)
        top_k: Number of results to return
        
    Returns:
        List of (chunk_index, score) tuples, sorted by score descending
    """
    if not BM25_AVAILABLE or bm25_index is None:
        return []
    
    try:
        # Tokenize query
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []
        
        # Get BM25 scores
        scores = bm25_index.get_scores(query_tokens)
        
        # Get top-k indices
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        
        # Return (index, score) tuples
        results = [(idx, float(scores[idx])) for idx in top_indices if scores[idx] > 0]
        return results
    except Exception as e:
        logger.error(f"Error in BM25 search: {e}")
        return []


def _normalize_scores(scores: List[float]) -> List[float]:
    """
    Normalize scores to 0-1 range.
    
    Args:
        scores: List of raw scores
        
    Returns:
        List of normalized scores
    """
    if not scores:
        return []
    
    min_score = min(scores)
    max_score = max(scores)
    
    if max_score == min_score:
        return [1.0] * len(scores)
    
    return [(s - min_score) / (max_score - min_score) for s in scores]


def _rerank_chunks(
    query: str,
    chunks: List[Dict],
    top_n: int = 10
) -> List[Dict]:
    """
    Re-rank chunks using cross-encoder model.
    
    Args:
        query: Search query
        chunks: List of chunk dictionaries with 'text' key
        top_n: Number of top chunks to return after re-ranking
        
    Returns:
        Re-ranked list of chunks
    """
    if not CROSS_ENCODER_AVAILABLE or not chunks:
        return chunks[:top_n]
    
    try:
        # Initialize cross-encoder (using a lightweight model)
        model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        
        # Prepare query-chunk pairs
        pairs = [[query, chunk.get('text', '')] for chunk in chunks]
        
        # Get relevance scores
        scores = model.predict(pairs)
        
        # Sort chunks by score
        scored_chunks = list(zip(chunks, scores))
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        
        # Return top-N chunks
        reranked = [chunk for chunk, _ in scored_chunks[:top_n]]
        
        # Update scores in chunks
        for i, (chunk, score) in enumerate(scored_chunks[:top_n]):
            reranked[i]['score'] = float(score)
        
        logger.info(f"Re-ranked {len(chunks)} chunks, returning top {len(reranked)}")
        return reranked
    except Exception as e:
        logger.warning(f"Re-ranking failed, returning original chunks: {e}")
        return chunks[:top_n]


def retrieve(
    query: str,
    embedding_model,
    vector_store,
    top_k: int = 5,
    filters: Optional[Dict] = None,
    use_hybrid_search: bool = True,
    hybrid_weights: Tuple[float, float] = (0.7, 0.3),  # (semantic, keyword)
    use_reranking: bool = False,
    rerank_top_n: int = 10
) -> List[Dict]:
    """
    Retrieve relevant chunks for a query.
    
    This function:
    1. Embeds the query
    2. Performs semantic search (vector similarity)
    3. Optionally performs keyword search (BM25) and combines results
    4. Optionally re-ranks results using cross-encoder
    5. Returns top-k chunks with scores and metadata
    
    Args:
        query: User query string
        embedding_model: EmbeddingModel instance for generating embeddings
        vector_store: VectorStore instance for searching
        top_k: Number of top chunks to return
        filters: Optional metadata filters for vector search
        use_hybrid_search: If True, combine semantic and keyword search
        hybrid_weights: Tuple of (semantic_weight, keyword_weight) for hybrid search
        use_reranking: If True, re-rank results using cross-encoder
        rerank_top_n: Number of chunks to re-rank (top-N from initial retrieval)
        
    Returns:
        List of dictionaries containing:
        - text: Chunk text
        - score: Relevance score (0.0 to 1.0)
        - metadata: Chunk metadata (doc_id, chunk_index, etc.)
        - id: Vector ID
    """
    if not query or not query.strip():
        logger.warning("Empty query provided")
        return []
    
    # Step 1: Generate query embedding
    try:
        query_embedding = embedding_model.embed(query)
    except Exception as e:
        logger.error(f"Error generating query embedding: {e}")
        return []
    
    # Step 2: Semantic search (vector similarity)
    try:
        # Retrieve more chunks if we're doing hybrid search or re-ranking
        search_top_k = rerank_top_n if (use_hybrid_search or use_reranking) else top_k
        semantic_results = vector_store.search(
            query_embedding=query_embedding,
            top_k=search_top_k,
            filter_metadata=filters
        )
    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        return []
    
    if not semantic_results:
        logger.info("No semantic search results found")
        return []
    
    # Step 3: Hybrid search (combine semantic + keyword)
    if use_hybrid_search and BM25_AVAILABLE:
        try:
            # Build BM25 index from semantic results
            bm25_index = _build_bm25_index(semantic_results)
            
            if bm25_index:
                # Get BM25 scores
                bm25_results = _bm25_search(query, semantic_results, bm25_index, top_k=len(semantic_results))
                
                # Create score map for BM25 results
                bm25_scores = {idx: score for idx, score in bm25_results}
                
                # Normalize semantic scores
                semantic_scores = [r.get('score', 0.0) for r in semantic_results]
                normalized_semantic = _normalize_scores(semantic_scores)
                
                # Normalize BM25 scores
                if bm25_scores:
                    bm25_score_list = [bm25_scores.get(i, 0.0) for i in range(len(semantic_results))]
                    normalized_bm25 = _normalize_scores(bm25_score_list)
                else:
                    normalized_bm25 = [0.0] * len(semantic_results)
                
                # Combine scores with weights
                semantic_weight, keyword_weight = hybrid_weights
                combined_results = []
                for i, chunk in enumerate(semantic_results):
                    combined_score = (
                        semantic_weight * normalized_semantic[i] +
                        keyword_weight * normalized_bm25[i]
                    )
                    chunk['score'] = combined_score
                    combined_results.append((i, combined_score, chunk))
                
                # Sort by combined score
                combined_results.sort(key=lambda x: x[1], reverse=True)
                semantic_results = [chunk for _, _, chunk in combined_results]
                
                logger.info(f"Hybrid search completed: {len(semantic_results)} results")
        except Exception as e:
            logger.warning(f"Hybrid search failed, using semantic only: {e}")
    
    # Step 4: Re-ranking (optional)
    if use_reranking and len(semantic_results) > 1:
        try:
            semantic_results = _rerank_chunks(query, semantic_results, top_n=rerank_top_n)
            logger.info(f"Re-ranking completed: {len(semantic_results)} results")
        except Exception as e:
            logger.warning(f"Re-ranking failed: {e}")
    
    # Step 5: Return top-k chunks
    final_results = semantic_results[:top_k]
    
    # Ensure scores are in 0-1 range
    for result in final_results:
        score = result.get('score', 0.0)
        result['score'] = max(0.0, min(1.0, float(score)))
    
    logger.info(f"Retrieved {len(final_results)} chunks for query: {query[:50]}...")
    return final_results


def build_prompt(
    context_chunks: List[Dict],
    user_query: str,
    system_prompt: Optional[str] = None
) -> str:
    """
    Build a prompt with context chunks and user query.
    
    The prompt explicitly instructs the model to:
    - Answer ONLY from the provided context
    - Include citations with identifiers linking back to chunks
    - Say "I don't know" if the answer isn't in the context
    
    Args:
        context_chunks: List of chunk dictionaries with 'text' and 'metadata' keys
        user_query: User's question/query
        system_prompt: Optional custom system prompt (default provided if None)
        
    Returns:
        Formatted prompt string
    """
    # Default system prompt
    if system_prompt is None:
        system_prompt = """You are a helpful assistant for AcmeDesk, a customer support platform. You can answer questions about AcmeDesk features, setup, integrations, and more.

IMPORTANT INSTRUCTIONS:
1. For casual greetings or conversational messages (like "hi", "hello", "how are you"), respond naturally and friendly without requiring citations.
2. For questions about AcmeDesk, use ONLY the information provided in the context documents below.
3. If the answer cannot be found in the context, explicitly say "I don't have enough information to answer this question based on the provided context."
4. Do NOT make up information or use knowledge outside the provided context for AcmeDesk-specific questions.

STRICT FORMATTING RULES (MUST FOLLOW EXACTLY):
5. LIST FORMATTING - CRITICAL:
   - Each bullet point MUST be on its own separate line
   - NEVER put multiple bullet points on the same line
   - Use "- " (dash and space) for all bullet points
   - Format: "- **Item title** – Description text [1]."
   - Always include a blank line before starting a list
   - Always include a blank line after ending a list

6. CITATION FORMAT - CRITICAL:
   - ONLY use format [X] or [X, Y, Z] where X, Y, Z are valid chunk numbers (1, 2, 3, etc.)
   - ONLY use chunk numbers that were actually provided in the context (check the chunk numbers in the context section)
   - NEVER include NaN, undefined, null, or any non-numeric values in citations
   - NEVER include numbers outside the range of provided chunks (if context has chunks 1-5, NEVER use [6], [121], [269], etc.)
   - If you're unsure about a citation number, omit it rather than guessing
   - ALWAYS place citations at the END of sentences, bullet points, or list items - NEVER in the middle
   - Citations MUST come BEFORE punctuation: "text [1]." NOT "text. [1]"
   - For bullet points: "- Item description [1]." (citation at end, before period)
   - For numbered lists: "1. Step description [1]." (citation at end, before period)
   - Multiple citations: Use [1, 2, 3] with consistent spacing (comma-space format)
   - NEVER use formats like [Chunk X], [Citation: X], [chunk X], or [NaN] - ONLY [X] or [X, Y, Z]
   - Example: If context has chunks 1-5, use [1], [2], [3], [4], [5] or combinations like [1, 2] - NEVER [6], [121], [NaN], or [1, NaN]
   - Ensure all citations use the same format throughout your response

7. HEADER FORMATTING - CRITICAL:
   - Use markdown headers: ## Header Title (two hashes for section headers)
   - Headers MUST be complete words on a SINGLE line - NEVER split a word across lines
   - Headers MUST be on their own line
   - Include a blank line after each header
   - NEVER include citations in header text - move citations to the content below
   - If a heading is too long, use a shorter heading rather than splitting words
   - Example: "# Getting Started with AcmeDesk" NOT "# Getting Started with AcmeDes\n\nk"

8. SPACING RULES:
   - Include a blank line between major sections
   - Include a blank line before lists
   - Include a blank line after lists
   - Use proper spacing around citations: "text [1]." not "text[1]." or "text. [1]"

FEW-SHOT EXAMPLES (FOLLOW THESE EXACT FORMATS):

Example 1 - List with citations:
User: "What payment methods are available?"
Context: [Chunk 1] mentions credit cards, [Chunk 2] mentions PayPal

CORRECT FORMAT:
**Available Payment Methods**

- **Credit cards** – Visa, MasterCard, and American Express are accepted for all plans [1]
- **PayPal** – Available as an alternative online payment option [2]
- **Bank transfer** – Enterprise customers can pay via bank transfer [1, 2]

WRONG FORMAT (DO NOT DO THIS):
- **Credit cards** – Visa, MasterCard, and American Express are accepted [1]- **PayPal** – Available [2]- **Bank transfer** – Enterprise customers [1, 2]
(WRONG: Multiple items on one line, no spacing)

Example 2 - Multiple sections:
User: "Tell me about billing and invoices"
Context: [Chunk 1] about billing, [Chunk 2] about invoices

CORRECT FORMAT:
**Billing Overview**

- **Annual Savings** – Choosing a yearly plan can save you up to 20% compared with paying monthly [1]
- **Billing Cycle** – You are billed once per year for annual plans [1]

**Invoice Management**

- **Downloadable Invoices** – All invoices are available for download directly from your account [2]
- **Automatic Email Receipts** – Receipts are sent automatically to your registered email address [2]

Example 3 - Numbered list:
User: "How do I set up my account?"
Context: [Chunk 1] has setup steps

CORRECT FORMAT:
**Account Setup Steps**

1. Sign up for an account using your email address [1]
2. Verify your email address by clicking the link in the confirmation email [1]
3. Complete your profile information [1]
4. Choose your subscription plan [1]

9. Be concise but complete in your answer.
10. If multiple chunks contain relevant information, cite all of them using [1, 2, 3] format."""
    
    # Build context section with numbered chunks
    context_sections = []
    for i, chunk in enumerate(context_chunks, start=1):
        chunk_text = chunk.get('text', '')
        metadata = chunk.get('metadata', {})
        doc_id = metadata.get('doc_id', 'unknown')
        title = metadata.get('title', doc_id) if 'title' in metadata else doc_id
        
        context_sections.append(
            f"[Chunk {i}]\n"
            f"Source: {title} (ID: {doc_id})\n"
            f"Content: {chunk_text}\n"
        )
    
    context_text = "\n---\n\n".join(context_sections)
    
    # Build full prompt
    prompt = f"""{system_prompt}

CONTEXT DOCUMENTS:
{context_text}

QUESTION: {user_query}

ANSWER (format your response professionally with citations at the end of sentences using [X] format):"""
    
    return prompt
