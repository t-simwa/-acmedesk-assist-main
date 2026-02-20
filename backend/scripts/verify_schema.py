"""
Verify database schema matches models.
"""

import sqlite3
from pathlib import Path

db_path = Path("backend/data/acmedesk.db")

if not db_path.exists():
    print(f"Database file not found at {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

print("=== Database Schema Verification ===\n")

# Check conversations table
cursor.execute("PRAGMA table_info(conversations)")
conv_columns = {col[1]: col[2] for col in cursor.fetchall()}
print("Conversations table:")
for col_name, col_type in conv_columns.items():
    print(f"  - {col_name}: {col_type}")
print(f"Has user_id: {'user_id' in conv_columns}")

# Check documents table
cursor.execute("PRAGMA table_info(documents)")
doc_columns = {col[1]: col[2] for col in cursor.fetchall()}
print("\nDocuments table:")
for col_name, col_type in doc_columns.items():
    print(f"  - {col_name}: {col_type}")
print(f"Has user_id: {'user_id' in doc_columns}")

# Check indexes
cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name IN ('conversations', 'documents')")
indexes = cursor.fetchall()
print("\nIndexes:")
for idx_name, idx_sql in indexes:
    print(f"  - {idx_name}")

conn.close()

print("\n=== Verification Complete ===")
