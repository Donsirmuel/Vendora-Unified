# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install frontend deps and build
COPY frontend/package*.json frontend/ ./
RUN npm ci
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm run build


FROM python:3.12-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copy project
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Copy built frontend dist from builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

# Entrypoint
COPY backend/docker-entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
