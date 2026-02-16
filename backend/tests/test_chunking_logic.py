"""
Tests for chunking logic.

Tests:
- Given text, verify chunk sizes and overlaps
"""

import pytest
from app.rag.chunking import chunk_text, ChunkingConfig, Chunk


def test_chunking_creates_chunks():
    """Test that chunking creates at least one chunk from text."""
    test_text = "This is a test document with some content that should be chunked."
    config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
    chunks = chunk_text(test_text, config, doc_id="test-doc")
    
    assert len(chunks) > 0, "No chunks created"
    assert all(isinstance(c, Chunk) for c in chunks), "Not all items are Chunk objects"


def test_chunking_respects_chunk_size():
    """Test that chunks respect the maximum chunk size."""
    # Create text that's longer than chunk_size
    test_text = "This is a test document. " * 50  # ~1100 characters
    config = ChunkingConfig(chunk_size=200, chunk_overlap=50)
    chunks = chunk_text(test_text, config, doc_id="test-doc")
    
    assert len(chunks) > 1, "Should create multiple chunks for long text"
    
    # Most chunks should be close to chunk_size (allow some flexibility)
    chunk_sizes = [len(c.text) for c in chunks]
    max_chunk_size = max(chunk_sizes)
    
    # Allow chunks to be up to 2x the target size (due to paragraph/sentence boundaries)
    assert max_chunk_size <= config.chunk_size * 2, f"Chunk too large: {max_chunk_size}"


def test_chunking_respects_chunk_overlap():
    """Test that chunks have proper overlap between consecutive chunks."""
    # Create text that will definitely create multiple chunks
    test_text = "Sentence one. Sentence two. Sentence three. " * 30  # ~1200 characters
    config = ChunkingConfig(chunk_size=100, chunk_overlap=30)
    chunks = chunk_text(test_text, config, doc_id="test-doc")
    
    if len(chunks) > 1:
        # Check overlap between consecutive chunks
        for i in range(len(chunks) - 1):
            current_chunk = chunks[i].text
            next_chunk = chunks[i + 1].text
            
            # The end of current_chunk should overlap with the start of next_chunk
            # Check if the last N characters of current_chunk appear in next_chunk
            overlap_found = False
            for overlap_len in range(config.chunk_overlap, 0, -1):
                if len(current_chunk) >= overlap_len:
                    overlap_text = current_chunk[-overlap_len:]
                    if overlap_text in next_chunk[:overlap_len * 2]:  # Check start of next chunk
                        overlap_found = True
                        break
            
            # Note: Due to intelligent splitting (paragraphs, sentences), exact overlap
            # may not always be present, but chunks should be adjacent
            assert overlap_found or len(current_chunk) < config.chunk_size, \
                f"Chunk {i} and {i+1} may not have proper overlap"


def test_chunking_preserves_doc_id():
    """Test that all chunks have the correct doc_id."""
    test_text = "Test content for chunking. " * 20
    config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
    doc_id = "test-document-123"
    chunks = chunk_text(test_text, config, doc_id=doc_id)
    
    assert all(c.doc_id == doc_id for c in chunks), "All chunks should have the same doc_id"


def test_chunking_sequential_indices():
    """Test that chunks have sequential chunk_index values."""
    test_text = "Test content. " * 30
    config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
    chunks = chunk_text(test_text, config, doc_id="test-doc")
    
    indices = [c.chunk_index for c in chunks]
    expected_indices = list(range(len(chunks)))
    assert indices == expected_indices, "Chunk indices should be sequential starting from 0"


def test_chunking_character_positions():
    """Test that chunks have reasonable start_char and end_char positions."""
    test_text = "This is a test document with multiple sentences. " * 10
    config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
    chunks = chunk_text(test_text, config, doc_id="test-doc")
    
    for chunk in chunks:
        # Verify basic position constraints
        assert chunk.start_char >= 0, "start_char should be non-negative"
        assert chunk.end_char > chunk.start_char, "end_char should be greater than start_char"
        
        # Verify chunk text is not empty and has reasonable length
        assert len(chunk.text) > 0, "Chunk text should not be empty"
        assert len(chunk.text) <= config.chunk_size * 2, "Chunk text should not be excessively long"
        
        # Verify chunk text contains actual content (not just whitespace)
        assert len(chunk.text.strip()) > 0, "Chunk text should contain non-whitespace content"


def test_chunking_with_different_sizes():
    """Test chunking with different chunk sizes produces expected number of chunks."""
    test_text = "Test sentence. " * 100  # ~1500 characters
    
    # Small chunks should produce more chunks
    small_config = ChunkingConfig(chunk_size=100, chunk_overlap=10)
    small_chunks = chunk_text(test_text, small_config, doc_id="test-doc")
    
    # Large chunks should produce fewer chunks
    large_config = ChunkingConfig(chunk_size=500, chunk_overlap=50)
    large_chunks = chunk_text(test_text, large_config, doc_id="test-doc")
    
    assert len(small_chunks) > len(large_chunks), \
        "Smaller chunk size should produce more chunks"


def test_chunking_with_empty_text():
    """Test that chunking handles empty text gracefully."""
    config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
    chunks = chunk_text("", config, doc_id="test-doc")
    
    # Empty text should return empty list or handle gracefully
    assert isinstance(chunks, list), "Should return a list even for empty text"


def test_chunking_with_whitespace_only():
    """Test that chunking handles whitespace-only text."""
    config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
    chunks = chunk_text("   \n\n   ", config, doc_id="test-doc")
    
    # Whitespace-only text may return empty chunks or handle gracefully
    assert isinstance(chunks, list), "Should return a list for whitespace-only text"


def test_chunking_config_validation():
    """Test that ChunkingConfig validates input parameters."""
    # Valid config should work
    valid_config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
    assert valid_config.chunk_size == 100
    assert valid_config.chunk_overlap == 20
    
    # Invalid: chunk_size <= 0
    with pytest.raises(ValueError, match="chunk_size must be positive"):
        ChunkingConfig(chunk_size=0, chunk_overlap=10)
    
    with pytest.raises(ValueError, match="chunk_size must be positive"):
        ChunkingConfig(chunk_size=-10, chunk_overlap=10)
    
    # Invalid: chunk_overlap < 0
    with pytest.raises(ValueError, match="chunk_overlap must be non-negative"):
        ChunkingConfig(chunk_size=100, chunk_overlap=-5)
    
    # Invalid: chunk_overlap >= chunk_size
    with pytest.raises(ValueError, match="chunk_overlap must be less than chunk_size"):
        ChunkingConfig(chunk_size=100, chunk_overlap=100)
    
    with pytest.raises(ValueError, match="chunk_overlap must be less than chunk_size"):
        ChunkingConfig(chunk_size=100, chunk_overlap=150)
