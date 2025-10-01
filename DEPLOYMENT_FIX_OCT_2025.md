# Deployment Fix - October 2025

## Issue
Backend deployment failing with error:
```
Error: No application module specified.
ERROR failed health checks after 4 attempts
ERROR component terminated with non-zero exit code: 1
```

## Root Cause Analysis
The error "No application module specified" is a Gunicorn error that occurs when Gunicorn is called without the APP_MODULE argument. This can happen due to:

1. **Multi-line command parsing issues**: When using backslashes (`\`) for line continuation in bash scripts, there can be parsing issues in certain environments
2. **Insufficient error logging**: Previous version had minimal logging, making it hard to identify the actual failure point
3. **Missing validation**: No checks to verify that required files and dependencies exist before attempting to start the server

## Solutions Implemented

### 1. Consolidated Gunicorn Command (backend/start.sh)
**Changed from:**
```bash
exec python -m gunicorn vendora.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8080 \
  --workers 1 \
  --timeout 120 \
  --log-level info \
  --access-logfile - \
  --error-logfile -
```

**Changed to:**
```bash
exec python -m gunicorn vendora.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080 --workers 1 --timeout 120 --log-level info --access-logfile - --error-logfile -
```

**Why:** Single-line commands avoid potential parsing issues with line continuations in different shell environments.

### 2. Enhanced Logging and Validation (backend/start.sh)
Added comprehensive checks:
- ✓ Verify vendora module directory exists
- ✓ Verify vendora/asgi.py file exists
- ✓ Verify Gunicorn is available
- ✓ Check database connectivity before running migrations
- ✓ Clear section headers for each stage of startup

**Benefits:**
- Makes it easier to identify which step is failing
- Fails fast with clear error messages
- Provides visual confirmation of each successful step

### 3. Proper File Endings
- Added trailing newlines to Procfile and start.sh
- Ensures proper POSIX compliance

## Files Modified
1. **backend/start.sh** - Consolidated gunicorn command, added validation and logging
2. **backend/Procfile** - Added trailing newline

## Testing Locally
To test the startup script locally:

```bash
cd backend
export DATABASE_URL="postgresql://user:pass@localhost/dbname"
export SECRET_KEY="test-secret-key"
export DJANGO_SETTINGS_MODULE="vendora.settings"
bash start.sh
```

## Deployment Verification

After deployment, verify:
1. ✅ No "Error: No application module specified" errors in logs
2. ✅ Clear section headers in startup logs showing progress
3. ✅ Health check passes: https://api.vendora.page/health/
4. ✅ API responds correctly
5. ✅ No "component terminated with non-zero exit code" errors

## Monitoring
Check the deployment logs in DigitalOcean App Platform for the section headers:
- `=== Vendora Backend Startup ===`
- `=== Directory listing ===`
- `=== Checking vendora module ===`
- `=== Checking gunicorn ===`
- `=== Database connectivity ===`
- `=== Running database migrations ===`
- `=== Collecting static files ===`
- `=== Starting Gunicorn with Uvicorn workers ===`

If deployment fails, the logs should now clearly indicate which step failed.

## Troubleshooting

### If "vendora directory NOT found" error:
- Check that `source_dir: backend` is set in `.do/app.yaml`
- Verify the backend directory structure in the repository

### If "Gunicorn not found" error:
- Verify `gunicorn` is in `backend/requirements.txt`
- Check that the buildpack is installing Python dependencies correctly

### If "Database check failed" error:
- Verify `DATABASE_URL` secret is set in DigitalOcean App Platform
- Check that the database is accessible from the app
- Verify database credentials are correct

### If health checks still fail:
- Check that `/health/` endpoint is configured correctly
- Verify the app is binding to port 8080
- Check that environment variables are set correctly in `.do/app.yaml`

## Related Documentation
- DEPLOYMENT_FIX_BUILDPACK.md - Original buildpack deployment fix
- DIGITALOCEAN_FIXES.md - Previous DigitalOcean deployment issues
