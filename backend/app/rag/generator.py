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


def format_response_text(text: str) -> str:
    """
    Format and clean up LLM response text for professional presentation.
    
    This function:
    - Removes duplicate citations
    - Removes invalid citation numbers (NaN, out of range, etc.)
    - Consolidates multiple citations properly
    - Improves list formatting
    - Ensures proper spacing and structure
    - Creates world-class chatbot formatting
    
    Args:
        text: Raw LLM response text
        
    Returns:
        Formatted text ready for display
    """
    if not text or not text.strip():
        return text
    
    import re
    import math
    
    formatted = text.strip()
    
    # Step 1: Normalize all citation formats to [X] or [X, Y, Z]
    formatted = re.sub(r'\[Citation:\s*(\d+)\]', r'[\1]', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[Chunk\s+(\d+)\]', r'[\1]', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[citation\s+(\d+)\]', r'[\1]', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[chunk\s+(\d+)\]', r'[\1]', formatted, flags=re.IGNORECASE)
    
    # Step 1.5: Remove invalid citations (NaN, non-numeric, extremely large numbers)
    # Clean all citations to remove invalid numbers
    def clean_citation_numbers(match):
        full_match = match.group(0)  # The full citation like "[1, 2, NaN]"
        citation_content = match.group(1)  # Content inside brackets
        
        # Check if this looks like a citation (contains numbers)
        if not re.search(r'\d', citation_content):
            # Not a citation, leave it alone
            return full_match
        
        # Split by comma and process each number
        numbers = []
        for num_str in citation_content.split(','):
            num_str = num_str.strip()
            # Skip NaN, undefined, or other non-numeric strings
            if num_str.lower() in ['nan', 'undefined', 'null', 'none', '']:
                continue
            try:
                num = int(num_str)
                # Only keep valid numbers (1-1000 is reasonable range for citations)
                if 1 <= num <= 1000:
                    numbers.append(num)
            except (ValueError, OverflowError):
                # Skip invalid numbers
                continue
        
        if not numbers:
            # If no valid numbers, remove the citation entirely
            return ''
        
        # Remove duplicates and sort
        unique_numbers = sorted(list(set(numbers)))
        if len(unique_numbers) == 1:
            return f'[{unique_numbers[0]}]'
        else:
            return f'[{", ".join(map(str, unique_numbers))}]'
    
    # Apply citation cleaning to all citations
    formatted = re.sub(r'\[([^\]]+)\]', clean_citation_numbers, formatted)
    
    # Step 2: Remove duplicate citations that appear consecutively or nearby
    # Pattern: "[1] [1]" -> "[1]" or "[1] [1] [2]" -> "[1, 2]"
    # Also handles cases where citations appear multiple times in the same sentence
    
    def consolidate_consecutive_citations(text):
        # Pattern to match one or more citations with optional spaces between them
        # This will match sequences like "[1] [1]" or "[1] [2] [1]" etc.
        pattern = r'(?:\[\d+(?:\s*,\s*\d+)*\]\s*)+'
        
        def replace_citations(match):
            citation_text = match.group(0)
            # Extract all numbers from all citations in this match
            all_numbers = []
            for citation_match in re.finditer(r'\[(\d+(?:\s*,\s*\d+)*)\]', citation_text):
                nums_str = citation_match.group(1)
                # Split by comma and add all numbers (only valid ones)
                try:
                    numbers = [int(n.strip()) for n in nums_str.split(',') if n.strip() and 1 <= int(n.strip()) <= 1000]
                    all_numbers.extend(numbers)
                except (ValueError, OverflowError):
                    continue
            
            if not all_numbers:
                return ''
            
            # Remove duplicates, sort, and create consolidated citation
            unique_numbers = sorted(list(set(all_numbers)))
            if len(unique_numbers) == 1:
                return f' [{unique_numbers[0]}]'
            else:
                return f' [{", ".join(map(str, unique_numbers))}]'
        
        # Replace all sequences of consecutive citations
        return re.sub(pattern, replace_citations, text)
    
    # Apply consolidation multiple times to catch nested cases
    for _ in range(5):  # More passes to ensure we catch all duplicates
        new_formatted = consolidate_consecutive_citations(formatted)
        if new_formatted == formatted:
            break
        formatted = new_formatted
    
    # Step 2.5: Remove any remaining invalid citations (shouldn't happen, but safety check)
    formatted = re.sub(r'\[[^\]]*NaN[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[[^\]]*undefined[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[\s*\]', '', formatted)  # Remove empty citations
    
    # Step 3: Normalize multiple citations in single brackets: [1, 2, 3] with consistent spacing
    formatted = re.sub(r'\[(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?\s*\]', 
                       lambda m: f'[{", ".join(sorted(set([n for n in m.groups() if n]), key=int))}]', 
                       formatted)
    
    # Step 4: Ensure proper spacing around citations
    # "text[1]" -> "text [1]"
    formatted = re.sub(r'([^\s\[\]])\[(\d+(?:\s*,\s*\d+)*)\]', r'\1 [\2]', formatted)
    
    # "[1]text" -> "[1] text" (but not if it's at start of line or after punctuation)
    formatted = re.sub(r'\[(\d+(?:\s*,\s*\d+)*)\]([A-Za-z])', r'[\1] \2', formatted)
    
    # Step 5: Citations should come before punctuation: "text. [1]" -> "text [1]."
    formatted = re.sub(r'([.,!?;:])\s+\[(\d+(?:\s*,\s*\d+)*)\]', r' [\2]\1', formatted)
    
    # Step 6: Improve list formatting
    # Normalize bullet points to use "-" consistently
    formatted = re.sub(r'^(\s*)[•*](\s+)', r'\1-\2', formatted, flags=re.MULTILINE)
    
    # Ensure each list item is on its own line and properly formatted
    lines = formatted.split('\n')
    processed_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            processed_lines.append('')
            continue
        
        # Check if line has multiple bullet points (shouldn't happen after previous steps, but safety check)
        if line.count('- ') > 1 and line.startswith('- '):
            # Split at each bullet point
            parts = re.split(r'(?=^-\s)', line, flags=re.MULTILINE)
            for part in parts:
                if part.strip():
                    processed_lines.append(part.strip())
        # Check for multiple numbered items on same line
        elif len(re.findall(r'^\d+\.\s+', line)) > 1:
            # Split at each numbered item
            parts = re.split(r'(\d+\.\s+)', line)
            current_item = ''
            for part in parts:
                if re.match(r'^\d+\.\s+$', part):
                    if current_item:
                        processed_lines.append(current_item.strip())
                    current_item = part
                else:
                    current_item += part
            if current_item:
                processed_lines.append(current_item.strip())
        else:
            processed_lines.append(line)
    
    formatted = '\n'.join(processed_lines)
    
    # Step 6.5: Clean up any double spaces that might have been created
    formatted = re.sub(r'  +', ' ', formatted)
    
    # Step 7: Clean up spacing
    # Remove excessive blank lines (more than 2 consecutive)
    formatted = re.sub(r'\n{3,}', '\n\n', formatted)
    
    # Remove trailing whitespace from each line
    formatted = '\n'.join(line.rstrip() for line in formatted.split('\n'))
    
    # Step 8: Ensure proper spacing around headers
    formatted = re.sub(r'([^\n])\n(#{1,6}\s+)', r'\1\n\n\2', formatted)
    formatted = re.sub(r'(#{1,6}\s+[^\n]+)\n([^\n#])', r'\1\n\n\2', formatted)
    
    # Step 9: Ensure proper spacing before lists
    formatted = re.sub(r'([^\n])\n(\d+\.\s)', r'\1\n\n\2', formatted)
    formatted = re.sub(r'([^\n])\n(-\s)', r'\1\n\n\2', formatted)
    
    # Step 10: Final cleanup - remove leading/trailing blank lines
    formatted = formatted.strip()
    
    return formatted


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
        
        # Format the response text for professional presentation
        formatted_text = format_response_text(response_text)
        
        # Parse citations from formatted text
        cleaned_text, citation_numbers = parse_citations(formatted_text)
        
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
