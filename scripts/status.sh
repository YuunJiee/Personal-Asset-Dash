#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Yantage Status ==="

echo -e "\n${GREEN}[Docker Containers]${NC}"
docker compose ps 2>/dev/null || echo "Docker not running or not available."

echo -e "\n${GREEN}[Ports]${NC}"
ss -tulpn 2>/dev/null | grep -E ':(8000|3001)' || echo "Ports 8000/3001 not in use."
