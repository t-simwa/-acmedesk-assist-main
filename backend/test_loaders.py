import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.rag.ingestion import ingest_document
from app.rag.loaders import load_document

print("Testing error handling...")

# Test non-existent file
result = ingest_document(Path("non-existent-file.md"))
assert result is None, "Should return None for non-existent file"
print("✓ Non-existent file handled correctly")

# Test unsupported format
result = load_document(Path("../data/docs/test.pdf"))
assert result is None, "Should return None for unsupported format"
print("✓ Unsupported format handled correctly")

# Test directory instead of file
result = ingest_document(Path("../data/docs"))
assert result is None, "Should return None for directory"
print("✓ Directory path handled correctly")

print("\n" + "="*50)
print("Error handling tests passed!")