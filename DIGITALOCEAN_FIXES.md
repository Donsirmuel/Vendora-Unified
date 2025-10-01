# DigitalOcean Deployment Fixes

## Problem Summary

The application was encountering deployment errors on DigitalOcean App Platform:

### Backend Errors:
```
ERROR: failed to launch: determine start command: when there is no default process a command is required
ERROR component terminated with non-zero exit code: 190
```

### Frontend Errors:
```
Error: No application module specified.
ERROR failed health checks after 3 attempts with error Readiness probe failed
```

## Root Causes

1. **Backend Run Command Path Issue**: The `run_command` in `.do/app.yaml` was set to `"./backend/start_backend.sh"` but since `source_dir` is already set to `backend`, the path was incorrect (it was looking for `backend/backend/start_backend.sh`).

2. **Frontend Static Site Configuration**: The `static_site` nested configuration was incorrect. DigitalOcean App Platform requires `type: static` at the service level, not a nested `static_site` object.

3. **Missing Build-time Operations**: The backend startup script wasn't running database migrations or collecting static files before starting the server.

4. **Corrupted Environment File**: The `frontend/.env.production.example` file had duplicate and malformed content.

## Solutions Applied

### 1. Fixed Backend Run Command (`.do/app.yaml`)

**Before:**
```yaml
- name: backend
  source_dir: backend
  run_command: "./backend/start_backend.sh"  # ❌ Wrong path
```

**After:**
```yaml
- name: backend
  source_dir: backend
  run_command: "bash start.sh"  # ✅ Correct path
```

**Why this works**: When `source_dir: backend` is set, DigitalOcean changes into the backend directory before running the command, so the path should be relative to that directory.

### 2. Fixed Frontend Static Site Configuration (`.do/app.yaml`)

**Before:**
```yaml
- name: frontend
  source_dir: frontend
  static_site:  # ❌ Wrong structure
    build_command: npm ci && npm run build
    output_dir: dist
  instance_count: 1
  instance_size_slug: apps-s-2vcpu-2gb
```

**After:**
```yaml
- name: frontend
  type: static  # ✅ Correct type at service level
  source_dir: frontend
  build_command: npm ci --prefer-offline --no-audit && npm run build
  output_dir: dist
```

**Why this works**: DigitalOcean App Platform requires the service type to be declared at the top level. Static sites don't need (or support) `instance_count` and `instance_size_slug`.

### 3. Enhanced Backend Startup Script (`backend/start.sh`)

**Added:**
- Database migrations: `python manage.py migrate --noinput`
- Static file collection: `python manage.py collectstatic --noinput --clear`
- Error handling: `set -e` to exit on any error
- Better logging: Echo statements for each step

**Before:**
```bash
#!/bin/bash
echo "Starting Vendora backend..."
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-vendora.settings}
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
exec gunicorn vendora.asgi:application ...
```

**After:**
```bash
#!/bin/bash
set -e  # Exit on error

echo "Starting Vendora backend..."
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-vendora.settings}
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Start server
echo "Starting Gunicorn with Uvicorn workers..."
exec gunicorn vendora.asgi:application ...
```

### 4. Fixed Frontend Environment Example File

Cleaned up the corrupted `frontend/.env.production.example` file to have single, correct entries:

```bash
VITE_API_BASE=https://api.vendora.page
VITE_WS_PROTOCOL=wss
VITE_API_HOST=api.vendora.page
VITE_JWT_STORAGE_KEY=vendora_jwt
VITE_DM_URL=https://t.me/your_bot_username
```

### 5. Made Scripts Executable

Ensured both startup scripts have executable permissions:
```bash
chmod +x backend/start.sh
chmod +x backend/start_backend.sh
```

## Deployment Steps

After these fixes, the deployment process should work as follows:

### Backend Deployment Flow:
1. DigitalOcean clones the repository
2. Changes to `backend/` directory (due to `source_dir: backend`)
3. Installs Python dependencies from `requirements.txt`
4. Runs `bash start.sh` which:
   - Applies database migrations
   - Collects static files
   - Starts Gunicorn with Uvicorn workers on port 8080
5. Health check endpoint `/api/v1/health/` is monitored

### Frontend Deployment Flow:
1. DigitalOcean clones the repository
2. Changes to `frontend/` directory (due to `source_dir: frontend`)
3. Injects environment variables (`VITE_API_BASE`, etc.)
4. Runs build command: `npm ci --prefer-offline --no-audit && npm run build`
5. Serves static files from `dist/` directory
6. No health checks needed for static sites

## Environment Variables Required

### Backend Service (Must be set in DigitalOcean dashboard):
```
SECRET_KEY=<your-secret-key>
DATABASE_URL=<your-neon-postgres-url>
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_WEBHOOK_SECRET=<your-webhook-secret>
```

### Frontend Service (Already configured in app.yaml):
```
VITE_API_BASE=https://api.vendora.page
VITE_WS_PROTOCOL=wss
VITE_API_HOST=api.vendora.page
```

## Testing the Fixes

To verify these fixes work:

1. **Push changes to GitHub** - The changes are already committed
2. **Redeploy on DigitalOcean** - Either:
   - Push to main branch (if auto-deploy is enabled)
   - Manually trigger deployment from DigitalOcean dashboard
3. **Monitor build logs** - Check for:
   - Backend: "Running database migrations..." and "Starting Gunicorn..."
   - Frontend: Successful npm build completing
4. **Test health endpoints**:
   - Backend: `https://api.vendora.page/api/v1/health/`
   - Frontend: `https://app.vendora.page/`

## Additional Optimizations

The configuration now includes:

- **Minimal instance sizes**: `basic-xxs` for cost efficiency
- **Single worker**: Appropriate for small traffic, can be scaled up
- **Efficient build**: `npm ci --prefer-offline` for faster installs
- **Proper ASGI setup**: Using Gunicorn with Uvicorn workers for WebSocket support
- **Health monitoring**: Backend health endpoint for automatic recovery

## Troubleshooting

If issues persist:

1. **Check logs in DigitalOcean dashboard** - Under the component → Runtime Logs
2. **Verify environment variables are set** - Ensure all SECRET values are configured
3. **Check database connectivity** - Ensure DATABASE_URL is correct and accessible
4. **Verify domain DNS** - Ensure api.vendora.page and app.vendora.page point to DigitalOcean

## Summary

The fixes address the core deployment issues:
- ✅ Correct run command paths
- ✅ Proper static site configuration
- ✅ Database migrations on startup
- ✅ Static file collection
- ✅ Clean environment files
- ✅ Executable scripts

Your application should now deploy successfully on DigitalOcean App Platform! 🚀
