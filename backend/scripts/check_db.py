import sqlite3
from pathlib import Path

db_path = Path("backend/data/acmedesk.db")
if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]
print("Tables in database:", tables)
print("knowledge_bases exists:", "knowledge_bases" in tables)

if "knowledge_bases" in tables:
    cursor.execute("SELECT * FROM knowledge_bases")
    kbs = cursor.fetchall()
    print(f"Knowledge bases: {len(kbs)}")
    for kb in kbs:
        print(f"  - {kb}")

conn.close()
