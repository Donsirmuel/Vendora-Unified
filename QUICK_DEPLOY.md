# Quick Deployment Reference for DigitalOcean

## Files Modified in This Fix

1. **`.do/app.yaml`** - Main deployment configuration
   - Fixed backend `run_command` path
   - Fixed frontend static site configuration

2. **`backend/start.sh`** - Backend startup script  
   - Added database migrations
   - Added static file collection
   - Made executable

3. **`backend/start_backend.sh`** - Alternative startup script
   - Made executable

4. **`frontend/.env.production.example`** - Environment template
   - Cleaned up duplicates

## Quick Deploy Checklist

- [x] Fixed run_command path in app.yaml
- [x] Fixed frontend static configuration
- [x] Added migrations to startup
- [x] Made scripts executable
- [x] Cleaned environment files

## Next Steps for User

1. **Set Required Secrets in DigitalOcean**:
   - Go to your app → Settings → Environment Variables
   - Add these as "encrypted" variables:
     - `SECRET_KEY` (Django secret)
     - `DATABASE_URL` (Neon Postgres URL)
     - `TELEGRAM_BOT_TOKEN` (Bot token)
     - `TELEGRAM_WEBHOOK_SECRET` (Webhook secret)

2. **Trigger Deployment**:
   - Merge this PR to main branch, OR
   - Manually trigger deployment from DigitalOcean dashboard

3. **Verify Deployment**:
   - Check build logs in DigitalOcean
   - Test: https://api.vendora.page/api/v1/health/
   - Test: https://app.vendora.page/

## Common Commands

### Test backend locally:
```bash
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn vendora.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080
```

### Test frontend locally:
```bash
cd frontend
npm ci
npm run build
npm run preview
```

## Key Configuration Details

### Backend Service:
- **Type**: Python web service
- **Source**: `backend/` directory
- **Run**: `bash start.sh`
- **Port**: 8080
- **Health**: `/api/v1/health/`

### Frontend Service:
- **Type**: Static site
- **Source**: `frontend/` directory  
- **Build**: `npm ci && npm run build`
- **Output**: `dist/` directory

## Support

See `DIGITALOCEAN_FIXES.md` for detailed explanation of all changes.
See `DIGITALOCEAN_DEPLOYMENT.md` for full deployment guide.
