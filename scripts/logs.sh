#!/bin/bash
# Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "Viewing logs (Ctrl+C to exit)..."

if systemctl is-active --quiet yantage-backend; then
    sudo journalctl -u yantage-backend -u yantage-frontend -f
else
    tail -f backend.log frontend.log 2>/dev/null || echo "No local logs found in $PROJECT_ROOT"
fi
