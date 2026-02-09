#!/bin/bash
set -e

# Resolve Project Root (Robust for running from anywhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔨 Starting Development Environment...${NC}"

# Stop other services to avoid port conflicts
"$SCRIPT_DIR/stop.sh" > /dev/null 2>&1 || true

# Start Backend
echo -e "${GREEN}📦 Starting Backend (Hot Reload)...${NC}"
if command -v conda &> /dev/null && conda env list | grep -q "asset-backend"; then
    echo "Activating conda env..."
    eval "$(conda shell.bash hook)"
    conda activate asset-backend
fi

# Run uvicorn from project root to support relative imports in backend package
export PYTHONPATH="$PROJECT_ROOT"
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo -e "${GREEN}🎨 Starting Frontend (Dev Mode)...${NC}"
cd frontend
# Using -- -p 3001 to ensure port is passed to Next.js
npm run dev -- -p 3001 &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ Dev Environment Started!${NC}"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop."

cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM
wait
