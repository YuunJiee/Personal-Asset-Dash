#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}⬇️  Pulling latest code...${NC}"
git pull

echo -e "${GREEN}🐳 Rebuilding Docker images & restarting...${NC}"
docker compose build --no-cache
docker compose up -d

echo -e "${GREEN}✅ Update Complete!${NC}"
