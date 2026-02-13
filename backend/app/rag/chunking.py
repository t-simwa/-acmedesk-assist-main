"""
Document chunking module.

This module provides functions to:
- Split documents into chunks with configurable size and overlap
- Preserve document structure (headings, paragraphs)
- Attach metadata to chunks for retrieval
"""

import logging
import re
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ChunkingConfig:
    """
    Configuration for text chunking.

    Attributes:
        chunk_size: Target size for each chunk in characters (default: 600)
        chunk_overlap: Number of characters to overlap between chunks (default: 100)
    """

    chunk_size: int = 600
    chunk_overlap: int = 100

    def __post_init__(self):
        """Validate configuration values."""
        if self.chunk_size <= 0:
            raise ValueError("chunk_size must be positive")
        if self.chunk_overlap < 0:
            raise ValueError("chunk_overlap must be non-negative")
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be less than chunk_size")


@dataclass
class Chunk:
    """
    A text chunk with metadata.

    Attributes:
        text: The chunk text content
        doc_id: Unique identifier for the source document
        chunk_index: Zero-based index of this chunk within the document
        page_or_section: Page number or section identifier (optional)
        source_path: Path or URL to the source document
        start_char: Character position where chunk starts in original text
        end_char: Character position where chunk ends in original text
    """

    text: str
    doc_id: str
    chunk_index: int
    page_or_section: Optional[str] = None
    source_path: Optional[str] = None
    start_char: int = 0
    end_char: int = 0

    def to_dict(self) -> dict:
        """Convert chunk to dictionary."""
        return {
            "text": self.text,
            "doc_id": self.doc_id,
            "chunk_index": self.chunk_index,
            "page_or_section": self.page_or_section,
            "source_path": self.source_path,
            "start_char": self.start_char,
            "end_char": self.end_char,
        }

    def __repr__(self) -> str:
        return f"Chunk(doc_id={self.doc_id}, index={self.chunk_index}, len={len(self.text)})"


def _split_on_heading_or_paragraph(text: str) -> List[str]:
    """
    Split text into segments based on headings and paragraphs.

    Prioritizes splitting on:
    1. Markdown headings (# ## ### etc.)
    2. Double newlines (paragraph breaks)
    3. Single newlines

    Args:
        text: Text to split

    Returns:
        List of text segments
    """
    # Pattern to match markdown headings (e.g., # Heading, ## Subheading)
    heading_pattern = r"^#{1,6}\s+.+$"
    segments = []
    current_segment = []
    lines = text.split("\n")

    for i, line in enumerate(lines):
        # Check if this line is a heading
        if re.match(heading_pattern, line.strip()):
            # If we have accumulated content, save it as a segment
            if current_segment:
                segments.append("\n".join(current_segment))
                current_segment = []
            # Add the heading as its own segment (or with following content)
            current_segment.append(line)
        # Check for paragraph break (double newline)
        elif line.strip() == "" and current_segment and current_segment[-1].strip() != "":
            # End of paragraph - save current segment
            segments.append("\n".join(current_segment))
            current_segment = []
        else:
            current_segment.append(line)

    # Add remaining content
    if current_segment:
        segments.append("\n".join(current_segment))

    # Filter out empty segments
    return [s for s in segments if s.strip()]


def _split_text_recursive(
    text: str, chunk_size: int, chunk_overlap: int, separators: List[str]
) -> List[str]:
    """
    Recursively split text using a list of separators in priority order.

    Args:
        text: Text to split
        chunk_size: Target chunk size
        chunk_overlap: Overlap size between chunks
        separators: List of separators to try (in priority order)

    Returns:
        List of text chunks
    """
    # If text is already small enough, return it
    if len(text) <= chunk_size:
        return [text]

    # Try each separator in order
    for separator in separators:
        if separator in text:
            splits = text.split(separator)
            chunks = []
            current_chunk = ""

            for i, split in enumerate(splits):
                # Add separator back (except for first split)
                if i > 0:
                    split = separator + split

                # If adding this split would exceed chunk size
                if len(current_chunk) + len(split) > chunk_size and current_chunk:
                    # Save current chunk
                    chunks.append(current_chunk)
                    # Start new chunk with overlap
                    if chunk_overlap > 0 and len(current_chunk) >= chunk_overlap:
                        overlap_text = current_chunk[-chunk_overlap:]
                        current_chunk = overlap_text + split
                    else:
                        current_chunk = split
                else:
                    current_chunk += split

            # Add remaining chunk
            if current_chunk:
                chunks.append(current_chunk)

            # If we successfully split into multiple chunks, return them
            if len(chunks) > 1:
                return chunks

    # If no separator worked, split by character (last resort)
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - chunk_overlap

    return chunks


def chunk_text(text: str, config: ChunkingConfig, doc_id: str, source_path: Optional[str] = None) -> List[Chunk]:
    """
    Split text into chunks with metadata.

    Uses intelligent splitting that prefers:
    1. Markdown headings
    2. Paragraph breaks (double newlines)
    3. Single newlines
    4. Character-level splitting as last resort

    Args:
        text: Text content to chunk
        config: Chunking configuration (size, overlap)
        doc_id: Unique identifier for the source document
        source_path: Path or URL to the source document (optional)

    Returns:
        List of Chunk objects with metadata
    """
    if not text or not text.strip():
        logger.warning(f"Empty text provided for doc_id: {doc_id}")
        return []

    # First, split on headings and paragraphs to preserve structure
    segments = _split_on_heading_or_paragraph(text)

    # Now split each segment if it's too large
    all_chunks = []
    char_offset = 0

    for segment in segments:
        if len(segment) <= config.chunk_size:
            # Segment fits in one chunk
            all_chunks.append((segment, char_offset))
            char_offset += len(segment) + 1  # +1 for newline
        else:
            # Segment is too large, split it recursively
            # Priority: paragraph breaks, newlines, then character-level
            separators = ["\n\n", "\n", ". ", " ", ""]
            sub_chunks = _split_text_recursive(
                segment, config.chunk_size, config.chunk_overlap, separators
            )

            for sub_chunk in sub_chunks:
                all_chunks.append((sub_chunk, char_offset))
                char_offset += len(sub_chunk)

    # Create Chunk objects with metadata
    chunks = []
    for idx, (chunk_text, start_char) in enumerate(all_chunks):
        # Try to extract section/heading from chunk
        page_or_section = None
        lines = chunk_text.split("\n")
        for line in lines[:3]:  # Check first 3 lines for heading
            if re.match(r"^#{1,6}\s+.+$", line.strip()):
                page_or_section = line.strip()
                break

        chunk = Chunk(
            text=chunk_text.strip(),
            doc_id=doc_id,
            chunk_index=idx,
            page_or_section=page_or_section,
            source_path=source_path,
            start_char=start_char,
            end_char=start_char + len(chunk_text),
        )
        chunks.append(chunk)

    logger.info(f"Created {len(chunks)} chunks for doc_id: {doc_id}")
    return chunks


def chunk_document(document, config: ChunkingConfig) -> List[Chunk]:
    """
    Chunk a Document object into Chunk objects.

    Convenience function that extracts metadata from Document and calls chunk_text.

    Args:
        document: Document object from ingestion module
        config: Chunking configuration

    Returns:
        List of Chunk objects
    """
    return chunk_text(
        text=document.text,
        config=config,
        doc_id=document.doc_id,
        source_path=document.url,
    )
