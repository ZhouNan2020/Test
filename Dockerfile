# ── Stage 1: build the React frontend ──────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --silent
COPY frontend/ ./
RUN npm run build

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy backend source
COPY backend/package*.json ./backend/
RUN cd backend && npm install --silent --omit=dev

COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create data directory for SQLite
RUN mkdir -p ./data

EXPOSE 3001

CMD ["node", "backend/src/server.js"]
