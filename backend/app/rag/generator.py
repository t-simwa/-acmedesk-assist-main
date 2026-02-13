"""
Answer generation module for RAG pipeline.

This module provides:
- LLM wrapper using LiteLLM (supports OpenAI, Ollama, HuggingFace, etc.)
- Answer generation with context
- Citation parsing from LLM responses
"""

import logging
import re
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

# Try to import LiteLLM
try:
    from litellm import completion, ModelResponse
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False
    logger.warning("litellm not available. Install with: pip install litellm")

# Fallback to OpenAI SDK if LiteLLM not available
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("openai not available. Install with: pip install openai")


class LLMGenerator:
    """
    LLM generator wrapper that supports multiple providers via LiteLLM.
    
    Supports:
    - OpenAI (gpt-4, gpt-3.5-turbo, etc.)
    - Ollama (ollama/llama2, ollama/mistral, etc.)
    - HuggingFace (huggingface/model-name)
    - Anthropic (claude-3-opus, claude-3-sonnet, etc.)
    - And 100+ other providers
    """
    
    def __init__(
        self,
        model: str = "gpt-3.5-turbo",
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        base_url: Optional[str] = None,  # For Ollama or custom endpoints
    ):
        """
        Initialize the LLM generator.
        
        Args:
            model: Model identifier (e.g., "gpt-4", "ollama/llama2", "claude-3-sonnet")
            api_key: API key for the provider (if required)
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate
            base_url: Base URL for API (useful for Ollama: "http://localhost:11434")
        """
        if not LITELLM_AVAILABLE and not OPENAI_AVAILABLE:
            raise ImportError(
                "Neither litellm nor openai is available. "
                "Install with: pip install litellm (recommended) or pip install openai"
            )
        
        self.model = model
        self.api_key = api_key
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.base_url = base_url
        
        # For OpenAI fallback
        self.openai_client = None
        if not LITELLM_AVAILABLE and OPENAI_AVAILABLE:
            if api_key:
                self.openai_client = OpenAI(api_key=api_key)
            else:
                self.openai_client = OpenAI()
        
        logger.info(f"Initialized LLM generator with model: {model}")
    
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate a response from the LLM.
        
        Args:
            prompt: User prompt/query
            system_prompt: Optional system prompt (if not already in prompt)
            
        Returns:
            Generated text response
        """
        if not prompt or not prompt.strip():
            logger.warning("Empty prompt provided")
            return ""
        
        try:
            if LITELLM_AVAILABLE:
                return self._generate_litellm(prompt, system_prompt)
            elif self.openai_client:
                return self._generate_openai(prompt, system_prompt)
            else:
                raise RuntimeError("No LLM provider available")
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise
    
    def _generate_litellm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate using LiteLLM."""
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        # Prepare API key if needed
        api_key = self.api_key
        
        # Handle Ollama base URL and API key
        extra_params = {}
        if "ollama" in self.model.lower():
            # For Ollama Cloud, set the API base URL
            if self.base_url:
                extra_params["api_base"] = self.base_url
            else:
                # Default Ollama Cloud endpoint
                extra_params["api_base"] = "https://api.ollama.com"
            
            # For Ollama Cloud, set API key in extra_params (not as direct parameter)
            if api_key:
                extra_params["api_key"] = api_key
                # Don't pass api_key as direct parameter for Ollama
                api_key = None
        
        try:
            # Build completion call - only pass api_key if not in extra_params
            completion_kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
                **extra_params
            }
            
            # Only add api_key if it's not None and not already in extra_params
            if api_key:
                completion_kwargs["api_key"] = api_key
            
            response = completion(**completion_kwargs)
            
            # Extract text from response
            if hasattr(response, 'choices') and len(response.choices) > 0:
                return response.choices[0].message.content.strip()
            elif isinstance(response, str):
                return response.strip()
            else:
                logger.error(f"Unexpected response format: {type(response)}")
                return ""
        except Exception as e:
            logger.error(f"LiteLLM generation error: {e}")
            raise
    
    def _generate_openai(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate using OpenAI SDK (fallback)."""
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            raise


def parse_citations(text: str) -> Tuple[str, List[int]]:
    """
    Parse citations from LLM response text.
    
    Looks for citations in format [Citation: X], [Chunk X], or [X] where X is a number.
    Keeps citations in the text for display but extracts them for mapping.
    
    Args:
        text: LLM response text
        
    Returns:
        Tuple of (text_with_citations, list_of_citation_numbers)
    """
    if not text:
        return "", []
    
    # Pattern to match [Citation: X], [Chunk X], or [X] where X is a number
    # Also handles variations like [Chunk 1], [1], [Citation: 1]
    citation_pattern = r'\[(?:Citation:\s*|Chunk\s+)?(\d+)\]'
    
    citations = []
    
    # Find all citations
    matches = re.finditer(citation_pattern, text)
    for match in matches:
        citation_num = int(match.group(1))
        citations.append(citation_num)
    
    # Normalize citation format to [X] for consistency
    # Replace [Citation: X] and [Chunk X] with [X]
    normalized_text = re.sub(r'\[Citation:\s*(\d+)\]', r'[\1]', text)
    normalized_text = re.sub(r'\[Chunk\s+(\d+)\]', r'[\1]', normalized_text)
    
    # Remove duplicates and sort
    citations = sorted(list(set(citations)))
    
    return normalized_text, citations


def generate_answer_with_citations(
    prompt: str,
    generator: LLMGenerator,
    context_chunks: List[dict],
    system_prompt: Optional[str] = None
) -> Tuple[str, List[dict]]:
    """
    Generate an answer and extract citations.
    
    Args:
        prompt: Full prompt with context
        generator: LLMGenerator instance
        context_chunks: List of context chunks (for citation mapping)
        system_prompt: Optional system prompt (if not in prompt)
        
    Returns:
        Tuple of (answer_text, list_of_cited_chunks)
    """
    try:
        # Generate response
        response_text = generator.generate(prompt, system_prompt)
        
        # Parse citations
        cleaned_text, citation_numbers = parse_citations(response_text)
        
        # Map citations to actual chunks
        cited_chunks = []
        for citation_num in citation_numbers:
            # Citation numbers are 1-indexed, chunks are 0-indexed
            chunk_index = citation_num - 1
            if 0 <= chunk_index < len(context_chunks):
                cited_chunks.append(context_chunks[chunk_index])
        
        logger.info(f"Generated answer with {len(citation_numbers)} citations")
        return cleaned_text, cited_chunks
    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        raise
