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


def format_response_text(text: str, max_chunks: int = 100) -> str:
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
        max_chunks: Maximum number of chunks provided (for citation validation). Defaults to 100.
        
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
    # IMPROVED: More aggressive handling of invalid citations including NaN, out-of-range numbers
    def clean_citation_numbers(match):
        full_match = match.group(0)  # The full citation like "[1, 2, NaN]" or "[1, 2, 124, NaN]"
        citation_content = match.group(1)  # Content inside brackets
        
        # Check if this looks like a citation (contains numbers)
        if not re.search(r'\d', citation_content):
            # Not a citation, leave it alone
            return full_match
        
        # First, check for and remove any invalid strings (NaN, undefined, etc.) before processing
        # This handles cases where they might be mixed with valid numbers
        invalid_patterns = [
            r'\bNaN\b', r'\bundefined\b', r'\bnull\b', r'\bnone\b',
            r'\binf\b', r'\b-inf\b', r'\binfinity\b', r'\b-infinity\b'
        ]
        cleaned_content = citation_content
        for pattern in invalid_patterns:
            cleaned_content = re.sub(pattern, '', cleaned_content, flags=re.IGNORECASE)
        
        # Split by comma and process each number
        numbers = []
        for num_str in cleaned_content.split(','):
            num_str = num_str.strip()
            # Skip empty strings
            if not num_str:
                continue
            # Must be a pure integer (no letters, no decimals, no special chars)
            if not re.match(r'^\d+$', num_str):
                continue
            try:
                num = int(num_str)
                # Only keep valid numbers (1 to max_chunks)
                # This ensures we only keep citations that correspond to actual chunks provided
                if 1 <= num <= max_chunks:
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
    
    # Step 1.6: STRICT PASS - Remove ANY citation that contains NaN, undefined, or null
    # This must happen BEFORE number validation to ensure we don't keep citations with invalid values
    # Even if a citation has valid numbers like [1, 2, NaN], we remove the entire citation
    formatted = re.sub(r'\[[^\]]*\bNaN\b[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[[^\]]*\bundefined\b[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[[^\]]*\bnull\b[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    
    # Step 1.7: Apply citation cleaning to all remaining citations
    # This validates numbers against max_chunks and removes out-of-range numbers
    formatted = re.sub(r'\[([^\]]+)\]', clean_citation_numbers, formatted)
    
    # Step 1.8: Final validation pass - Re-validate ALL citations one more time
    # This catches any edge cases where cleaning might have missed something
    # e.g., if we had "[1, 2, 118]" and max_chunks is 5, this will remove 118
    formatted = re.sub(r'\[([^\]]+)\]', clean_citation_numbers, formatted)
    
    # Step 1.9: Final safety pass - Remove any citations that still contain invalid strings
    # This is a last resort to catch anything that slipped through
    formatted = re.sub(r'\[[^\]]*\bNaN\b[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[[^\]]*\bundefined\b[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    formatted = re.sub(r'\[[^\]]*\bnull\b[^\]]*\]', '', formatted, flags=re.IGNORECASE)
    
    # Log if we find any suspicious citations (for debugging)
    suspicious_citations = re.findall(r'\[([^\]]+)\]', formatted)
    for citation in suspicious_citations:
        # Check for very large numbers that might be invalid
        numbers = re.findall(r'\d+', citation)
        for num_str in numbers:
            try:
                num = int(num_str)
                if num > max_chunks:
                    logger.warning(f"Found potentially invalid citation number {num} (max_chunks={max_chunks}) in citation: [{citation}]")
            except ValueError:
                pass
    
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
    
    # Step 6: Improve list formatting - CRITICAL FIX for multiple items on same line
    # Normalize bullet points to use "-" consistently
    formatted = re.sub(r'^(\s*)[•*](\s+)', r'\1-\2', formatted, flags=re.MULTILINE)
    
    # CRITICAL: Fix multiple bullet points on the same line (e.g., "- item [1]- item [2]")
    # Pattern matches: "- text [X]- text [Y]" or "- text [X] - text [Y]" or similar variations
    def split_bullet_items(text):
        """Split text that has multiple bullet points on the same line."""
        # Pattern to find bullet points followed by text and optional citations
        # Matches: "- text [1]- text [2]" or "- text [1] - text [2]" etc.
        bullet_pattern = r'(-\s+[^\n-]+?(?:\[\d+(?:\s*,\s*\d+)*\])?)\s*(?=-\s+)'
        
        # First, try to split at obvious boundaries: "]- " or "] - " or "]-**"
        # This handles cases like: "- item [1]- **item** [2]"
        text = re.sub(r'(\])\s*(?=-\s+)', r'\1\n', text)
        text = re.sub(r'(\])\s*(?=-\*\*)', r'\1\n', text)
        
        # Also handle cases where citation is missing but we have "- item- item"
        # Look for pattern: "- text- " (no citation, but new bullet starts)
        text = re.sub(r'([^\n])\s*(?=-\s+[A-Za-z])', r'\1\n', text)
        
        return text
    
    # Apply bullet splitting
    formatted = split_bullet_items(formatted)
    
    # Ensure each list item is on its own line and properly formatted
    lines = formatted.split('\n')
    processed_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            processed_lines.append('')
            continue
        
        # Check if line has multiple bullet points (improved detection)
        # Look for pattern: "- text - text" or "- text- text" or "- text [1]- text [2]"
        bullet_matches = list(re.finditer(r'-\s+', line))
        if len(bullet_matches) > 1:
            # Split the line at each bullet point (except the first)
            last_pos = 0
            for i, match in enumerate(bullet_matches):
                if i > 0:  # Skip first bullet
                    # Extract the previous item
                    prev_item = line[last_pos:match.start()].strip()
                    if prev_item:
                        processed_lines.append(prev_item)
                    last_pos = match.start()
            # Add the last item
            if last_pos < len(line):
                processed_lines.append(line[last_pos:].strip())
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
    
    # Step 10: Fix split headings (e.g., "# Heading\n\nk" -> "# Headingk")
    formatted = fix_split_headings(formatted)
    
    # Step 11: Final cleanup - remove leading/trailing blank lines
    formatted = formatted.strip()
    
    return formatted


def fix_split_headings(text: str) -> str:
    """
    Fix headings that have been split across lines.
    
    Example: 
    "# Getting Started with AcmeDes\n\nk" -> "# Getting Started with AcmeDesk"
    "# Available Payment Method\n\ns" -> "# Available Payment Methods"
    
    Args:
        text: Text that may contain split headings
        
    Returns:
        Text with split headings merged
    """
    if not text or not text.strip():
        return text
    
    import re
    
    lines = text.split('\n')
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Check if this is a heading line (markdown header)
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        
        if heading_match:
            heading_level = heading_match.group(1)
            heading_text = heading_match.group(2)
            
            # Look ahead for potential fragment lines
            j = i + 1
            # Skip empty lines
            while j < len(lines) and not lines[j].strip():
                j += 1
            
            # Check if next non-empty line is a fragment
            if j < len(lines):
                next_line = lines[j].strip()
                
                # Fragment detection: short (1-5 chars), no spaces, alphanumeric
                # Also check if it looks like it could be a continuation of the heading
                is_fragment = (
                    len(next_line) <= 5 and 
                    ' ' not in next_line and 
                    next_line.isalnum() and
                    # Additional check: if heading ends with a word that could continue
                    # (e.g., "AcmeDes" + "k" = "AcmeDesk")
                    not next_line.startswith('#') and
                    not next_line.startswith('-') and
                    not next_line.startswith('*') and
                    not re.match(r'^\d+\.', next_line)
                )
                
                if is_fragment:
                    # Merge the fragment with the heading
                    merged_heading = f"{heading_level} {heading_text}{next_line}"
                    fixed_lines.append(merged_heading)
                    i = j + 1  # Skip both the heading line and the fragment line
                    continue
        
        fixed_lines.append(lines[i])
        i += 1
    
    return '\n'.join(fixed_lines)


def validate_response_format(text: str, max_chunks: int = 100) -> Tuple[bool, List[str]]:
    """
    Validate that the response text follows the expected formatting rules.
    
    Checks for:
    - Invalid citations (NaN, out of range)
    - Multiple list items on same line
    - Proper citation placement
    - Proper spacing
    
    Args:
        text: Response text to validate
        max_chunks: Maximum number of chunks (for citation range validation)
        
    Returns:
        Tuple of (is_valid, list_of_issues)
    """
    if not text or not text.strip():
        return True, []  # Empty text is valid
    
    issues = []
    import re
    
    # Check 1: Look for invalid citations (NaN, undefined, etc.)
    invalid_citation_patterns = [
        r'\[[^\]]*NaN[^\]]*\]',
        r'\[[^\]]*undefined[^\]]*\]',
        r'\[[^\]]*null[^\]]*\]',
    ]
    for pattern in invalid_citation_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            issues.append(f"Found invalid citations: {matches[:3]}")  # Show first 3
    
    # Check 2: Look for citations with out-of-range numbers
    citation_pattern = r'\[(\d+(?:\s*,\s*\d+)*)\]'
    for match in re.finditer(citation_pattern, text):
        citation_content = match.group(1)
        numbers = [int(n.strip()) for n in citation_content.split(',') if n.strip().isdigit()]
        out_of_range = [n for n in numbers if n < 1 or n > max_chunks]
        if out_of_range:
            issues.append(f"Found out-of-range citations: {out_of_range} (max: {max_chunks})")
    
    # Check 3: Look for multiple bullet points on same line
    lines = text.split('\n')
    for i, line in enumerate(lines, 1):
        # Count bullet points on this line
        bullet_count = len(re.findall(r'^-\s+', line, re.MULTILINE))
        if bullet_count > 1:
            issues.append(f"Line {i}: Multiple bullet points on same line")
        # Also check for pattern like "- item [1]- item [2]"
        if re.search(r'-\s+[^\n]+?\[[^\]]+\]\s*-\s+', line):
            issues.append(f"Line {i}: Multiple bullet items on same line (detected by pattern)")
    
    # Check 4: Look for citations in wrong positions (middle of sentences)
    # Citations should be at end of sentences/items, before punctuation
    # Pattern: text [1] more text (citation in middle)
    if re.search(r'[a-z]\s+\[(\d+(?:\s*,\s*\d+)*)\]\s+[a-z]', text, re.IGNORECASE):
        issues.append("Found citations in middle of sentences (should be at end)")
    
    # Check 5: Look for citations after punctuation (should be before)
    if re.search(r'[.,!?;:]\s+\[(\d+(?:\s*,\s*\d+)*)\]', text):
        issues.append("Found citations after punctuation (should be before)")
    
    # Check 6: Look for split headings (heading text followed by fragment on next line)
    lines = text.split('\n')
    for i, line in enumerate(lines):
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line.strip())
        if heading_match:
            # Look ahead for potential fragment
            j = i + 1
            # Skip empty lines
            while j < len(lines) and not lines[j].strip():
                j += 1
            
            if j < len(lines):
                next_line = lines[j].strip()
                # Check if next line is a fragment (short, no spaces, alphanumeric)
                is_fragment = (
                    len(next_line) <= 5 and 
                    ' ' not in next_line and 
                    next_line.isalnum() and
                    not next_line.startswith('#') and
                    not next_line.startswith('-') and
                    not next_line.startswith('*') and
                    not re.match(r'^\d+\.', next_line)
                )
                if is_fragment:
                    issues.append(f"Line {i+1}: Heading appears to be split (fragment '{next_line}' on line {j+1})")
    
    is_valid = len(issues) == 0
    return is_valid, issues


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
    system_prompt: Optional[str] = None,
    max_retries: int = 1
) -> Tuple[str, List[dict]]:
    """
    Generate an answer and extract citations.
    
    Args:
        prompt: Full prompt with context
        generator: LLMGenerator instance
        context_chunks: List of context chunks (for citation mapping)
        system_prompt: Optional system prompt (if not in prompt)
        max_retries: Maximum number of retries if format validation fails (default: 1)
        
    Returns:
        Tuple of (answer_text, list_of_cited_chunks)
    """
    max_chunks = len(context_chunks)
    
    for attempt in range(max_retries + 1):
        try:
            # Generate response
            response_text = generator.generate(prompt, system_prompt)
            
            # Format the response text for professional presentation
            # Pass max_chunks so citation cleaning can filter out-of-range numbers
            formatted_text = format_response_text(response_text, max_chunks=max_chunks)
            
            # Validate format (log issues but don't fail - post-processing should fix most)
            is_valid, issues = validate_response_format(formatted_text, max_chunks=max_chunks)
            if not is_valid and issues:
                logger.warning(f"Response format validation found issues (attempt {attempt + 1}, max_chunks={max_chunks}): {issues[:3]}")
                # Check specifically for invalid citations in the formatted text
                invalid_citation_pattern = re.compile(r'\[([^\]]+)\]')
                for match in invalid_citation_pattern.finditer(formatted_text):
                    citation_content = match.group(1)
                    # Check for NaN or out-of-range numbers
                    if re.search(r'\bNaN\b', citation_content, re.IGNORECASE):
                        logger.warning(f"Found citation with NaN after cleaning: [{citation_content}]")
                    numbers = re.findall(r'\d+', citation_content)
                    for num_str in numbers:
                        try:
                            num = int(num_str)
                            if num > max_chunks:
                                logger.warning(f"Found out-of-range citation {num} (max={max_chunks}) in: [{citation_content}]")
                        except ValueError:
                            pass
                # If this is not the last attempt, we could retry, but for now just log
                # In future, could add retry logic with correction prompt
            
            # Parse citations from formatted text
            cleaned_text, citation_numbers = parse_citations(formatted_text)
            
            # Map citations to actual chunks
            cited_chunks = []
            for citation_num in citation_numbers:
                # Citation numbers are 1-indexed, chunks are 0-indexed
                chunk_index = citation_num - 1
                if 0 <= chunk_index < len(context_chunks):
                    cited_chunks.append(context_chunks[chunk_index])
            
            logger.info(f"Generated answer with {len(citation_numbers)} citations (validation: {'passed' if is_valid else 'issues found'})")
            return cleaned_text, cited_chunks
        except Exception as e:
            if attempt < max_retries:
                logger.warning(f"Error generating answer (attempt {attempt + 1}/{max_retries + 1}), retrying: {e}")
                continue
            else:
                logger.error(f"Error generating answer after {max_retries + 1} attempts: {e}")
                raise
