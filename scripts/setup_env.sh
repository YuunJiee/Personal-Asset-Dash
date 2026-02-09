#!/bin/bash
set -e

# Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🔍 Checking Python Virtual Environment...${NC}"

VENV_DIR="backend/venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "⚠️  Virtual environment not found at $VENV_DIR"
    echo "🚀 Creating new virtual environment..."
    
    # Check for python3
    if command -v python3 &> /dev/null; then
        PYTHON_CMD=python3
    elif command -v python &> /dev/null; then
        PYTHON_CMD=python
    else
        echo "❌ Python not found! Please install Python 3.8+"
        exit 1
    fi
    
    $PYTHON_CMD -m venv "$VENV_DIR"
    echo "✅ Virtual environment created."
else
    echo "✅ Virtual environment exists."
fi

echo -e "${GREEN}📦 Installing/Updating Dependencies...${NC}"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r backend/requirements.txt

echo -e "${GREEN}🎉 Environment Setup Complete!${NC}"
