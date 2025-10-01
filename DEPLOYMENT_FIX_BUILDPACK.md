# Deployment Fix Summary - DigitalOcean App Platform

## Problem Statement

The application was failing to deploy on DigitalOcean App Platform with the following errors:

### Backend Errors:
```
ERROR: failed to launch: determine start command: when there is no default process a command is required
ERROR component terminated with non-zero exit code: 190
Error: No application module specified.
ERROR failed health checks after 4 attempts with error Readiness probe failed: dial tcp 10.244.30.52:8080: connect: connection refused
```

## Root Causes Identified

1. **Missing Procfile**: DigitalOcean App Platform uses Heroku buildpacks for Python applications. Buildpacks require a `Procfile` to define the "web" process. Without it, the buildpack cannot determine how to start the application.

2. **Incorrect Health Check Path**: The `app.yaml` specified a health check endpoint at `/api/v1/health/`, but the actual endpoint is at `/health/`.

3. **Gunicorn Module Resolution**: Using `gunicorn` directly in the start command can fail in buildpack environments where Python packages are installed in virtual environments. Using `python -m gunicorn` ensures the correct Python environment is used.

## Solutions Implemented

### 1. Added Procfile (backend/Procfile)
```
web: bash start.sh
```

**Why**: Heroku buildpacks (used by DigitalOcean) require a Procfile to define process types. The "web" process is the default process that receives HTTP traffic.

### 2. Added runtime.txt (backend/runtime.txt)
```
python-3.11
```

**Why**: Explicitly specifies the Python version for the buildpack to use.

### 3. Updated start.sh
- Changed `gunicorn` to `python -m gunicorn` for reliable module resolution
- Added extensive debugging output (directory listing, Python version, etc.)
- Added gunicorn version check to verify it's available

### 4. Fixed Health Check Path in .do/app.yaml
Changed from:
```yaml
health_check:
  http_path: /api/v1/health/
```

To:
```yaml
health_check:
  http_path: /health/
```

**Why**: The actual health endpoint is at `/health/`, not `/api/v1/health/`.

### 5. Removed Redundant run_command from app.yaml
When using buildpacks with a Procfile, the `run_command` in app.yaml is not needed and may cause conflicts.

## How It Works Now

### Deployment Flow:

1. **Source Code**: DigitalOcean clones the repo and changes to `backend/` directory (due to `source_dir: backend`)

2. **Buildpack Detection**: The Python buildpack is selected (via `environment_slug: python`)

3. **Build Phase**: 
   - Buildpack reads `runtime.txt` to determine Python version
   - Installs Python 3.11
   - Reads `requirements.txt` and installs all dependencies
   - Creates virtual environment

4. **Run Phase**:
   - Buildpack reads `Procfile` and finds "web" process
   - Executes `bash start.sh`
   - `start.sh` runs:
     - Database migrations
     - Static file collection
     - Starts Gunicorn with Uvicorn workers on port 8080

5. **Health Checks**:
   - DigitalOcean probes `/health/` endpoint
   - If successful, marks the service as healthy

## Files Changed

1. **backend/Procfile** (NEW) - Defines web process for buildpack
2. **backend/runtime.txt** (NEW) - Specifies Python 3.11
3. **backend/start.sh** (MODIFIED) - Uses `python -m gunicorn` and adds debugging
4. **.do/app.yaml** (MODIFIED) - Fixed health check path, removed run_command

## Deployment Checklist

Before deploying, ensure the following secrets are set in DigitalOcean App Platform:

- ✅ `SECRET_KEY` - Django secret key (generate a secure random string)
- ✅ `DATABASE_URL` - PostgreSQL connection string (e.g., from Neon)
- ✅ `TELEGRAM_BOT_TOKEN` - From BotFather
- ✅ `TELEGRAM_WEBHOOK_SECRET` - Random secure string for webhook validation

## Testing

To test locally (requires Python 3.11 and PostgreSQL):

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY="test-secret-key"
export DATABASE_URL="postgresql://user:pass@localhost:5432/vendora"
export DEBUG="true"
export DJANGO_SETTINGS_MODULE="vendora.settings"

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Test gunicorn
python -m gunicorn vendora.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8080 \
  --workers 1

# In another terminal, test health endpoint
curl http://localhost:8080/health/
```

Expected response:
```json
{
  "status": "ok",
  "db": true,
  "time": "2025-01-01T00:00:00+00:00",
  "host": "hostname",
  "version": "0.0.0"
}
```

## Additional Notes

### Why Procfile is Required

DigitalOcean App Platform uses Heroku's buildpack system. The Python buildpack follows this process:

1. Detects Python app (finds `requirements.txt`)
2. Installs dependencies
3. Looks for a `Procfile` to determine what to run
4. If no Procfile exists, it looks for common patterns (like `manage.py` for Django)
5. If it can't determine what to run, it fails with "no default process" error

### Why python -m gunicorn

In buildpack environments:
- Dependencies are installed in a virtual environment
- The PATH might not include the virtual environment's bin directory initially
- `python -m gunicorn` uses the Python interpreter's module resolution
- This ensures we're using the gunicorn installed in the correct environment

### Health Check Importance

DigitalOcean monitors the health check endpoint to determine if the app is ready:
- During deployment, it waits for health checks to pass before routing traffic
- If health checks fail, deployment fails
- The endpoint must return HTTP 200 status
- Our `/health/` endpoint also checks database connectivity

## Success Criteria

After deployment, verify:

1. ✅ Backend service starts without errors
2. ✅ Health endpoint responds: `https://api.vendora.page/health/`
3. ✅ Frontend builds and deploys: `https://app.vendora.page/`
4. ✅ No "failed to launch" errors in logs
5. ✅ No "No application module specified" errors
6. ✅ No health check failures
7. ✅ Database migrations complete successfully

## Support & Troubleshooting

If deployment still fails:

1. **Check DigitalOcean logs**: View the build and runtime logs in App Platform dashboard
2. **Verify secrets**: Ensure all required environment variables are set
3. **Check database**: Verify DATABASE_URL is correct and database is accessible
4. **Test locally**: Use the testing steps above to reproduce issues locally

## References

- [DigitalOcean App Platform Python Documentation](https://docs.digitalocean.com/products/app-platform/languages-frameworks/python/)
- [Heroku Python Buildpack](https://github.com/heroku/heroku-buildpack-python)
- [Gunicorn with Uvicorn Workers](https://www.uvicorn.org/#running-with-gunicorn)
- [Django Health Checks](https://docs.djangoproject.com/en/stable/topics/checks/)
