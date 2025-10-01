# Docker Deployment Files

This directory contains Docker-related files for manual droplet deployments.

## Files
- `Dockerfile` - Multi-stage build for frontend + backend
- `docker-entrypoint.sh` - Container startup script

## Usage

For **DigitalOcean App Platform** (recommended), these files are not needed - use the `.do/app.yaml` configuration instead.

For **manual droplet deployment** with Docker:

```bash
# Copy these files back to the backend directory
cp deployment/docker/Dockerfile backend/
cp deployment/docker/docker-entrypoint.sh backend/

# Then follow docker-compose deployment instructions
docker-compose up -d
```

## Why moved here?

DigitalOcean App Platform auto-detects Dockerfiles and creates additional services, causing confusion during deployment. By moving them here, App Platform only sees the Python/Node.js configurations defined in `.do/app.yaml`.