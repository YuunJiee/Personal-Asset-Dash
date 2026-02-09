#!/bin/bash
# Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
NC='\033[0m'

echo "🛑 Stopping Services..."

# 1. Stop Systemd Services (if valid systemd environment)
if command -v systemctl &> /dev/null && systemctl list-units --full -all | grep -Fq "yantage-backend.service"; then
    sudo systemctl stop yantage-backend yantage-frontend 2>/dev/null || true
    echo "   Stopped Systemd services."
fi

# 2. Kill Local Processes
pkill -f "uvicorn backend.main:app" && echo "   Killed local Backend."
pkill -f "next-server" && echo "   Killed local Frontend."
pkill -f "next start" && echo "   Killed local Frontend (start)."
pkill -f "next dev" && echo "   Killed local Frontend (dev)."

echo -e "${GREEN}✅ All stopped.${NC}"
