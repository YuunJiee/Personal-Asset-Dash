#!/bin/bash
set -e

# Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

USER=$(whoami)
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Setting up Systemd Services...${NC}"

if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}Do not run as root. Run as normal user with sudo access.${NC}"
  exit 1
fi

# 1. Backend Service
echo "Creating /etc/systemd/system/yantage-backend.service..."
sudo tee /etc/systemd/system/yantage-backend.service > /dev/null << EOF
[Unit]
Description=Yantage Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT
Environment="PATH=$(conda run -n asset-backend which python | xargs dirname):/usr/bin:/bin"
Environment="PYTHONPATH=$PROJECT_ROOT"
ExecStart=$(conda run -n asset-backend which uvicorn) backend.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 2. Frontend Service
echo "Creating /etc/systemd/system/yantage-frontend.service..."
sudo tee /etc/systemd/system/yantage-frontend.service > /dev/null << EOF
[Unit]
Description=Yantage Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT/frontend
Environment="NODE_ENV=production"
Environment="PORT=3001"
ExecStart=$(which npm) start -- -p 3001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 3. Enable & Start
echo "Reloading systemd..."
sudo systemctl daemon-reload
echo "Enabling services..."
sudo systemctl enable yantage-backend
sudo systemctl enable yantage-frontend
echo "Restarting services..."
sudo systemctl restart yantage-backend
sudo systemctl restart yantage-frontend

echo -e "${GREEN}✅ Systemd Services Deployed!${NC}"
echo "Check status with: ./scripts/status.sh"
