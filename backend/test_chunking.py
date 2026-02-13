"""
Test script for chunking functionality.

This script verifies that the chunking implementation works correctly.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.rag.ingestion import ingest_document
from app.rag.chunking import chunk_text, chunk_document, ChunkingConfig, Chunk
from app.config import get_chunking_config

# Test paths (relative to repo root)
docs_path = Path("../data/docs")

print("=" * 60)
print("Testing Chunking Implementation")
print("=" * 60)

# Test 1: Basic chunking with default config
print("\n[Test 1] Basic chunking with default config...")
test_text = """
# Introduction

This is a test document with multiple paragraphs.

## Section 1

This is the first section with some content. It contains multiple sentences to test chunking behavior.

## Section 2

This is the second section. It also has content that should be chunked properly.

## Section 3

Final section with more content to ensure chunking works across different sections.
"""

config = ChunkingConfig(chunk_size=100, chunk_overlap=20)
chunks = chunk_text(test_text, config, doc_id="test-doc", source_path="/test.md")

assert len(chunks) > 0, "No chunks created"
assert all(isinstance(c, Chunk) for c in chunks), "Not all items are Chunk objects"
assert all(c.doc_id == "test-doc" for c in chunks), "doc_id not set correctly"
assert all(c.chunk_index == i for i, c in enumerate(chunks)), "chunk_index not sequential"
print(f"[OK] Created {len(chunks)} chunks")
print(f"  Chunk sizes: {[len(c.text) for c in chunks]}")

# Test 2: Chunking with config from settings
print("\n[Test 2] Chunking with config from settings...")
config_from_settings = get_chunking_config()
assert isinstance(config_from_settings, ChunkingConfig), "Config from settings is not ChunkingConfig"
assert config_from_settings.chunk_size == 600, f"Expected chunk_size 600, got {config_from_settings.chunk_size}"
assert config_from_settings.chunk_overlap == 100, f"Expected chunk_overlap 100, got {config_from_settings.chunk_overlap}"
print(f"[OK] Config from settings: chunk_size={config_from_settings.chunk_size}, overlap={config_from_settings.chunk_overlap}")

# Test 3: Chunking a real document
print("\n[Test 3] Chunking a real document...")
test_file = docs_path / "getting-started.md"
doc = ingest_document(test_file)

assert doc is not None, "Failed to ingest test document"
chunks = chunk_document(doc, config_from_settings)

assert len(chunks) > 0, "No chunks created from document"
assert all(c.doc_id == doc.doc_id for c in chunks), "doc_id mismatch"
assert all(c.source_path == doc.url for c in chunks), "source_path mismatch"

# Verify chunk metadata
for chunk in chunks:
    assert chunk.text is not None and len(chunk.text) > 0, "Empty chunk text"
    assert chunk.chunk_index >= 0, "Invalid chunk_index"
    assert chunk.start_char >= 0, "Invalid start_char"
    assert chunk.end_char > chunk.start_char, "Invalid end_char"

print(f"[OK] Created {len(chunks)} chunks from document")
print(f"  Document: {doc.title}")
print(f"  Doc ID: {doc.doc_id}")
print(f"  Average chunk size: {sum(len(c.text) for c in chunks) / len(chunks):.0f} chars")

# Test 4: Verify chunk sizes are within reasonable range
print("\n[Test 4] Verifying chunk sizes...")
config_test = ChunkingConfig(chunk_size=500, chunk_overlap=50)
chunks_test = chunk_document(doc, config_test)

max_chunk_size = max(len(c.text) for c in chunks_test)
min_chunk_size = min(len(c.text) for c in chunks_test)

# Chunks should generally be close to target size (allow some flexibility)
# Most chunks should be within 2x the target size
assert max_chunk_size <= config_test.chunk_size * 2, f"Chunk too large: {max_chunk_size}"

print(f"[OK] Chunk size verification:")
print(f"  Target: {config_test.chunk_size} chars")
print(f"  Min: {min_chunk_size} chars")
print(f"  Max: {max_chunk_size} chars")

# Test 5: Verify chunk metadata structure
print("\n[Test 5] Verifying chunk metadata...")
sample_chunk = chunks[0]
chunk_dict = sample_chunk.to_dict()

required_keys = ["text", "doc_id", "chunk_index", "page_or_section", "source_path", "start_char", "end_char"]
for key in required_keys:
    assert key in chunk_dict, f"Missing key in chunk dict: {key}"

print(f"[OK] Chunk metadata structure correct")
print(f"  Sample chunk keys: {list(chunk_dict.keys())}")

# Test 6: Test with different chunk sizes
print("\n[Test 6] Testing different chunk sizes...")
for size in [300, 600, 800]:
    config_variant = ChunkingConfig(chunk_size=size, chunk_overlap=size // 10)
    chunks_variant = chunk_document(doc, config_variant)
    avg_size = sum(len(c.text) for c in chunks_variant) / len(chunks_variant)
    print(f"  chunk_size={size}: {len(chunks_variant)} chunks, avg_size={avg_size:.0f} chars")

print("\n" + "=" * 60)
print("All chunking tests passed! [OK]")
print("=" * 60)
