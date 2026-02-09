#!/bin/bash
set -e

# Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}⬇️  Pulling latest code...${NC}"
git pull

echo -e "${GREEN}📦 Updating Backend...${NC}"
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
elif command -v conda &> /dev/null && conda env list | grep -q "asset-backend"; then
    eval "$(conda shell.bash hook)"
    conda activate asset-backend
fi
pip install -r requirements.txt
cd ..

echo -e "${GREEN}📦 Updating Frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

echo -e "${GREEN}🔄 Restarting Services...${NC}"
if systemctl is-active --quiet yantage-backend; then
    sudo systemctl restart yantage-backend yantage-frontend
    echo "Restarted systemd services."
else
    # Fallback to prod script
    "$SCRIPT_DIR/prod.sh"
fi

echo -e "${GREEN}✅ Update Complete!${NC}"
