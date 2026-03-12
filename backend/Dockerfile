# ── Backend Dockerfile ─────────────────────────────────────────────────────
# Build context: project root  (docker-compose sets context: .)
# Run:  docker compose up --build
# ---------------------------------------------------------------------------

FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies first (layer-cached until requirements change)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

EXPOSE 8000

# PYTHONPATH lets Python resolve the `backend` package from /app
ENV PYTHONPATH=/app

# YANTAGE_DATA_DIR is overridden by docker-compose to point to the named
# volume — keeps SQLite DB files and config.json outside the container layer.
ENV YANTAGE_DATA_DIR=/data

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
