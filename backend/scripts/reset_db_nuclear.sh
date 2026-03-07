#!/usr/bin/env bash
# Nuclear option: backup current DB and let backend create a fresh one on next startup.
# STOP THE BACKEND before running this, or the move will fail (file in use).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/../data"
DB_PATH="${DATA_DIR}/acmedesk.db"
BAK_PATH="${DATA_DIR}/acmedesk.db.bak"

if [ ! -f "$DB_PATH" ]; then
  echo "No acmedesk.db found. Nothing to do."
  exit 0
fi

mv "$DB_PATH" "$BAK_PATH"
echo "Renamed acmedesk.db -> acmedesk.db.bak"
echo "Restart the backend; it will create a new empty database."
echo "To restore the old DB later: rename acmedesk.db.bak back to acmedesk.db (with backend stopped)."
