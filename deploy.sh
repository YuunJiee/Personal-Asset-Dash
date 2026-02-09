#!/bin/bash
set -e

echo "🚀 Yantage Deployment Script for assets.yuunjiee.com"
echo "===================================================="
echo ""

# Configuration
APP_DIR="$HOME/apps/yantage"
TUNNEL_NAME="your-tunnel-name"  # 請替換成你的 Cloudflare Tunnel 名稱

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on deployment server
read -p "Are you running this on your deployment server (old laptop)? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "This script should be run on your deployment server."
    exit 1
fi

# Step 1: Create app directory
print_step "Creating application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Step 2: Clone or update repository
if [ -d ".git" ]; then
    print_step "Updating existing repository..."
    git pull origin main
else
    print_step "Cloning repository..."
    git clone https://github.com/YuunJiee/Personal-Asset-Dash.git .
fi

# Step 3: Backend setup
print_step "Setting up backend..."
cd backend

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    print_step "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
print_step "Installing backend dependencies..."
pip install -r requirements.txt

# Create .env file if not exists
if [ ! -f ".env" ]; then
    print_step "Creating .env file..."
    cat > .env << 'EOF'
ALLOWED_ORIGINS=https://assets.yuunjiee.com
LOG_LEVEL=INFO
EOF
    print_warning ".env file created. Please review and update if needed."
fi

cd ..

# Step 4: Frontend setup
print_step "Setting up frontend..."
cd frontend

# Install dependencies
print_step "Installing frontend dependencies..."
npm install

# Create production environment file
if [ ! -f ".env.production" ]; then
    print_step "Creating .env.production file..."
    cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://assets.yuunjiee.com/api
EOF
fi

# Build frontend
print_step "Building frontend for production..."
npm run build

cd ..

# Step 5: Create systemd services
print_step "Creating systemd services..."

# Backend service
sudo tee /etc/systemd/system/yantage-backend.service > /dev/null << EOF
[Unit]
Description=Yantage Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/backend/venv/bin"
Environment="PYTHONPATH=$APP_DIR"
ExecStart=$APP_DIR/backend/venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/yantage-frontend.service > /dev/null << EOF
[Unit]
Description=Yantage Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/frontend
Environment="NODE_ENV=production"
Environment="PORT=3001"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Step 6: Enable and start services
print_step "Enabling and starting services..."
sudo systemctl daemon-reload
sudo systemctl enable yantage-backend yantage-frontend
sudo systemctl restart yantage-backend yantage-frontend

# Wait a bit for services to start
sleep 3

# Check service status
print_step "Checking service status..."
if systemctl is-active --quiet yantage-backend; then
    echo -e "${GREEN}✓${NC} Backend service is running"
else
    print_error "Backend service failed to start"
    sudo journalctl -u yantage-backend -n 20
fi

if systemctl is-active --quiet yantage-frontend; then
    echo -e "${GREEN}✓${NC} Frontend service is running"
else
    print_error "Frontend service failed to start"
    sudo journalctl -u yantage-frontend -n 20
fi

# Step 7: Update Cloudflare Tunnel configuration
print_step "Cloudflare Tunnel configuration..."
print_warning "Please update your Cloudflare Tunnel config manually:"
echo ""
echo "Edit ~/.cloudflared/config.yml and add:"
echo ""
cat << 'EOF'
ingress:
  - hostname: yuunjiee.com
    service: http://localhost:80
  
  - hostname: www.yuunjiee.com
    service: http://localhost:80
  
  - hostname: assets.yuunjiee.com
    service: http://localhost:3001
  
  - service: http_status:404
EOF
echo ""
read -p "Have you updated the Cloudflare Tunnel config? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Set DNS route
    print_step "Setting up DNS route..."
    read -p "Enter your Cloudflare Tunnel name: " TUNNEL_NAME
    cloudflared tunnel route dns "$TUNNEL_NAME" assets.yuunjiee.com || print_warning "DNS route may already exist"
    
    # Restart Cloudflare Tunnel
    print_step "Restarting Cloudflare Tunnel..."
    sudo systemctl restart cloudflared
    
    if systemctl is-active --quiet cloudflared; then
        echo -e "${GREEN}✓${NC} Cloudflare Tunnel is running"
    else
        print_error "Cloudflare Tunnel failed to start"
        sudo journalctl -u cloudflared -n 20
    fi
fi

# Step 8: Create maintenance scripts
print_step "Creating maintenance scripts..."

# Update script
cat > "$APP_DIR/update.sh" << 'EOFUPDATE'
#!/bin/bash
cd ~/apps/yantage
echo "Pulling latest changes..."
git pull origin main

echo "Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart yantage-backend

echo "Updating frontend..."
cd ../frontend
npm install
npm run build
sudo systemctl restart yantage-frontend

echo "✅ Update completed!"
EOFUPDATE

chmod +x "$APP_DIR/update.sh"

# Backup script
cat > "$APP_DIR/backup.sh" << 'EOFBACKUP'
#!/bin/bash
BACKUP_DIR="$HOME/backups/yantage"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp ~/apps/yantage/backend/personal_asset_dash.db $BACKUP_DIR/db_$DATE.db
gzip $BACKUP_DIR/db_$DATE.db
find $BACKUP_DIR -name "db_*.db.gz" -mtime +30 -delete
echo "✅ Backup completed: $BACKUP_DIR/db_$DATE.db.gz"
EOFBACKUP

chmod +x "$APP_DIR/backup.sh"

# Status script
cat > "$APP_DIR/status.sh" << 'EOFSTATUS'
#!/bin/bash
echo "=== Yantage Status ==="
echo ""
echo "Backend:"
sudo systemctl status yantage-backend --no-pager | grep -E "Active|Main PID"
echo ""
echo "Frontend:"
sudo systemctl status yantage-frontend --no-pager | grep -E "Active|Main PID"
echo ""
echo "Cloudflare Tunnel:"
sudo systemctl status cloudflared --no-pager | grep -E "Active|Main PID"
echo ""
echo "Ports:"
sudo netstat -tulpn | grep -E ':(3001|8000) '
EOFSTATUS

chmod +x "$APP_DIR/status.sh"

# Step 9: Setup cron for backups
print_step "Setting up automatic backups..."
(crontab -l 2>/dev/null | grep -v "yantage/backup.sh"; echo "0 3 * * * $APP_DIR/backup.sh >> $HOME/logs/yantage-backup.log 2>&1") | crontab -

# Create logs directory
mkdir -p "$HOME/logs"

echo ""
echo "===================================================="
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo "===================================================="
echo ""
echo "📊 Service Status:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3001"
echo "   Public:   https://assets.yuunjiee.com"
echo ""
echo "🛠️  Useful Commands:"
echo "   Status:  $APP_DIR/status.sh"
echo "   Update:  $APP_DIR/update.sh"
echo "   Backup:  $APP_DIR/backup.sh"
echo ""
echo "📝 Logs:"
echo "   Backend:  sudo journalctl -u yantage-backend -f"
echo "   Frontend: sudo journalctl -u yantage-frontend -f"
echo "   Tunnel:   sudo journalctl -u cloudflared -f"
echo ""
echo "🔒 Next Steps:"
echo "   1. Visit https://assets.yuunjiee.com to test"
echo "   2. Set up Cloudflare Access for private access"
echo "   3. Configure your integrations (MAX, Pionex, etc.)"
echo ""
