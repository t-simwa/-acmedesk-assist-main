import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.rag.ingestion import ingest_document
from app.rag.chunking import chunk_document, ChunkingConfig
from app.config import get_chunking_config

# Test chunking a real document
docs_path = Path("../data/docs")
test_file = docs_path / "getting-started.md"

doc = ingest_document(test_file)
assert doc is not None, "Failed to ingest test document"

config = get_chunking_config()
chunks = chunk_document(doc, config)

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

# Show first few chunks
print(f"\n  First 3 chunks:")
for i, chunk in enumerate(chunks[:3]):
    print(f"    Chunk {chunk.chunk_index}: {len(chunk.text)} chars")
    if chunk.page_or_section:
        print(f"      Section: {chunk.page_or_section}")
    print(f"      Preview: {chunk.text[:60]}...")