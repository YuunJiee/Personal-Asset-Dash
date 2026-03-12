# ── Frontend Dockerfile (multi-stage, Next.js standalone) ──────────────────
# Build context: frontend/  (docker-compose sets context: ./frontend)
# ---------------------------------------------------------------------------

# ── Stage 1: install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# INTERNAL_API_URL is read by next.config.ts at build time to set the
# rewrite destination (Next.js server → FastAPI backend).
# Default points to the docker-compose service name.
ARG INTERNAL_API_URL=http://backend:8000/api
ENV INTERNAL_API_URL=$INTERNAL_API_URL

RUN npm run build

# ── Stage 3: minimal runtime image ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Runtime INTERNAL_API_URL for SSR fetch calls (lib/api.ts server-side path)
ENV INTERNAL_API_URL=http://backend:8000/api

# standalone output contains only the necessary runtime files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001

CMD ["node", "server.js"]
