#!/bin/bash
set -e

# Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Production Mode (Build & Run)...${NC}"

# Stop other services
"$SCRIPT_DIR/stop.sh" > /dev/null 2>&1 || true

# Clean previous build
echo "🧹 Cleaning old build..."
rm -rf frontend/.next

# Start Backend
echo -e "${GREEN}📦 Starting Backend...${NC}"
if command -v conda &> /dev/null && conda env list | grep -q "asset-backend"; then
    eval "$(conda shell.bash hook)"
    conda activate asset-backend
fi

# Run uvicorn from project root to support relative imports in backend package
export PYTHONPATH="$PROJECT_ROOT"
nohup uvicorn backend.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

# Build Frontend
echo -e "${GREEN}🏗️  Building Frontend...${NC}"
cd frontend
npm install
npm run build

# Start Frontend
echo -e "${GREEN}🎨 Starting Frontend...${NC}"
nohup npm start -- -p 3001 > ../frontend.log 2>&1 &
cd ..

echo ""
echo -e "${GREEN}✅ Production Services Started in Background!${NC}"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3001"
echo ""
echo "Logs are being written to backend.log and frontend.log"
echo "To view logs: ./scripts/logs.sh"
echo "To stop: ./scripts/stop.sh"
