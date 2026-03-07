# Nuclear option: backup current DB and let backend create a fresh one on next startup.
# STOP THE BACKEND before running this, or the move will fail (file in use).

$dataDir = Join-Path $PSScriptRoot ".." "data"
$dbPath = Join-Path $dataDir "acmedesk.db"
$bakPath = Join-Path $dataDir "acmedesk.db.bak"

if (-not (Test-Path $dbPath)) {
    Write-Host "No acmedesk.db found. Nothing to do."
    exit 0
}

try {
    Move-Item -Path $dbPath -Destination $bakPath -Force
    Write-Host "Renamed acmedesk.db -> acmedesk.db.bak"
    Write-Host "Restart the backend; it will create a new empty database."
    Write-Host "To restore the old DB later: rename acmedesk.db.bak back to acmedesk.db (with backend stopped)."
} catch {
    Write-Host "Error: $_"
    Write-Host "Make sure the backend is STOPPED so the database file is not in use."
    exit 1
}
