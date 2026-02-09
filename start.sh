#!/bin/bash
set -e  # Exit on error

echo "🚀 Starting Personal Asset Dash..."

# Backend Setup
echo "📦 Setting up Backend..."

# Detect if conda is available and environment exists
if command -v conda &> /dev/null; then
    # Check if asset-backend environment exists
    if conda env list | grep -q "asset-backend"; then
        echo "Using conda environment: asset-backend"
        eval "$(conda shell.bash hook)"
        conda activate asset-backend
    else
        echo "⚠️  Conda environment 'asset-backend' not found."
        echo "Creating conda environment..."
        conda create -n asset-backend python=3.10 -y
        conda activate asset-backend
        pip install -r backend/requirements.txt
    fi
else
    # Fallback to venv if conda not available
    echo "Conda not found, using venv..."
    cd backend
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
    else
        source venv/bin/activate
        cd ..
    fi
fi

# Start Backend
echo "🔧 Starting Backend..."
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend Setup
echo "📦 Setting up Frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start Frontend
echo "🎨 Starting Frontend..."
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Services started successfully!"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services."

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped."
}

trap cleanup INT TERM
wait
