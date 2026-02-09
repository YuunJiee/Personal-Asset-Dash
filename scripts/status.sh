#!/bin/bash
# Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Yantage Status ==="

# Check Systemd
if command -v systemctl &> /dev/null && systemctl list-units --full -all | grep -Fq "yantage-backend.service"; then
    echo -e "\n${GREEN}[Systemd Services]${NC}"
    systemctl status yantage-backend --no-pager | grep "Active:" || echo "Backend: Inactive"
    systemctl status yantage-frontend --no-pager | grep "Active:" || echo "Frontend: Inactive"
fi

# Check Processes
echo -e "\n${GREEN}[Local Processes]${NC}"
if pgrep -f "uvicorn backend.main:app" > /dev/null; then
    echo "✅ Backend Running (PID: $(pgrep -f "uvicorn backend.main:app"))"
else
    echo "❌ Backend Not Running"
fi

if pgrep -f "next-server" > /dev/null || pgrep -f "next start" > /dev/null || pgrep -f "next dev" > /dev/null; then
    echo "✅ Frontend Running"
else
    echo "❌ Frontend Not Running"
fi

echo -e "\n${GREEN}[Ports]${NC}"
netstat -tulpn 2>/dev/null | grep -E ':(8000|3001)' || echo "No ports 8000/3001 usage found."
