# CI Build + DigitalOcean Static Serve Deployment

## Overview

This deployment strategy uses GitHub Actions CI to build the frontend and publish artifacts to a dedicated branch, which DigitalOcean then serves as a static site. This is a balanced approach that:

- **Reduces DigitalOcean build time and costs**: Frontend is pre-built in CI, not on DO
- **Provides faster deployments**: DO only needs to pull and serve pre-built files
- **Maintains separate concerns**: Build process in CI, serving on DO infrastructure
- **Enables build verification**: CI can run tests and validations before publishing

## Architecture

### Backend (Traditional Buildpack)
- **Source**: `main` branch, `backend/` directory
- **Build**: DigitalOcean uses Python buildpack
- **Deploy**: Procfile defines start command (`bash start.sh`)
- **Serve**: Gunicorn with Uvicorn workers on port 8080

### Frontend (CI Build + Static Serve)
- **Build**: GitHub Actions CI builds on push to `main` branch
- **Publish**: CI pushes built artifacts to `frontend-build-artifacts` branch
- **Deploy**: DigitalOcean pulls from `frontend-build-artifacts` branch
- **Serve**: Static site hosting (no build step on DO)

## Deployment Flow

### Step 1: Code Push
Developer pushes code to `main` branch:
```bash
git push origin main
```

### Step 2: CI Build (Automatic)
GitHub Actions workflow `.github/workflows/frontend-build.yml` triggers:

1. **Checkout code**: Gets latest main branch
2. **Setup Node**: Installs Node.js 20
3. **Install dependencies**: `npm ci` in frontend directory
4. **Build frontend**: `npm run build` with production environment variables
5. **Create artifact branch**: 
   - Creates clean orphan branch `frontend-build-artifacts`
   - Copies only `dist/` directory to branch root
   - Force pushes to branch
6. **Upload artifact**: Stores build as GitHub Actions artifact (7 day retention)

### Step 3: Backend Deployment (Automatic)
DigitalOcean detects push to `main` branch:

1. **Clone repository**: Gets `backend/` directory from `main`
2. **Install dependencies**: Python buildpack installs from `requirements.txt`
3. **Run start script**: Executes `bash start.sh`:
   - Runs database migrations
   - Collects static files
   - Starts Gunicorn server
4. **Health check**: Monitors `/health/` endpoint

### Step 4: Frontend Deployment (Automatic)
DigitalOcean detects push to `frontend-build-artifacts` branch:

1. **Pull artifacts**: Gets pre-built files from `frontend-build-artifacts`
2. **Serve files**: Serves from `dist/` directory as static site
3. **No build step**: Files are already built, just serve them
4. **Apply routing**: Handles SPA routing for React app

## Configuration Files

### `.github/workflows/frontend-build.yml`
```yaml
- Triggers on: push to main, changes in frontend/** or workflow file
- Permissions: contents: write (to push to artifacts branch)
- Environment: VITE_API_BASE, VITE_API_HOST, VITE_WS_PROTOCOL
- Output: frontend-build-artifacts branch with dist/ directory
```

### `.do/app.yaml` - Backend Service
```yaml
- name: backend
  source_dir: backend
  environment_slug: python
  # Uses Procfile for start command
```

### `.do/app.yaml` - Frontend Service
```yaml
- name: frontend
  type: static
  github:
    branch: frontend-build-artifacts  # ← Key difference!
  output_dir: dist
  # No build_command (already built)
```

## Benefits of This Approach

### 1. Cost Efficiency
- No frontend build on DigitalOcean (saves build minutes)
- Faster deploys = less compute time
- Static serving is cheaper than compute instances

### 2. Build Reliability
- CI builds are consistent and reproducible
- Build failures don't affect production
- Can run tests before publishing artifacts

### 3. Deployment Speed
- Frontend deploy: ~30 seconds (just pull and serve)
- Backend deploy: ~2-3 minutes (dependencies + migrations)
- Parallel deployments possible

### 4. Developer Experience
- See build logs in GitHub Actions
- Artifacts available for download/testing
- Clear separation between build and deploy

### 5. Scalability
- Static files served by CDN
- Backend scales independently
- No coupling between services

## Manual Trigger

To manually trigger a frontend build:

1. Go to GitHub Actions tab
2. Select "Frontend Build (Artifact)" workflow
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow" button

This will rebuild and republish the frontend without code changes.

## Monitoring

### Frontend Deployment
- Check GitHub Actions for build status
- Monitor `frontend-build-artifacts` branch for updates
- Test: https://app.vendora.page/

### Backend Deployment
- Check DigitalOcean App Platform logs
- Monitor health endpoint: https://api.vendora.page/health/
- Test API: https://api.vendora.page/api/v1/

## Troubleshooting

### Frontend build fails in CI
1. Check GitHub Actions logs
2. Verify environment variables in workflow
3. Test build locally: `cd frontend && npm ci && npm run build`

### Frontend not updating on DO
1. Check `frontend-build-artifacts` branch was updated
2. Verify DO detected branch push (check DO logs)
3. Manually trigger redeploy in DO dashboard

### Backend deployment fails
1. Check DO build logs
2. Verify `start.sh` script is executable
3. Check environment variables in DO
4. Verify database connectivity

### CORS errors
1. Check `PRODUCTION_CORS_ORIGINS` in backend service
2. Verify frontend is served from correct domain
3. Check `CSRF_TRUSTED_ORIGINS` includes frontend domain

## Rollback

### Frontend Rollback
```bash
# Get commit hash from previous build
git log frontend-build-artifacts

# Reset to previous commit
git checkout frontend-build-artifacts
git reset --hard <previous-commit>
git push -f origin frontend-build-artifacts
```

### Backend Rollback
Use DigitalOcean App Platform dashboard:
1. Go to app settings
2. Navigate to "Deployments" tab
3. Select previous deployment
4. Click "Redeploy"

## Migration from Previous Setup

Previous setup was attempting to:
- Build on DO with `build_command` 
- Use `source_dir: frontend` on artifacts branch

New setup:
- ✅ Build in CI, push to clean artifacts branch
- ✅ DO serves from artifacts branch without building
- ✅ Cleaner separation of concerns
- ✅ Faster and more reliable deployments

## Files Changed

- `.github/workflows/frontend-build.yml`: Fixed artifact publishing logic
- `.do/app.yaml`: Removed `source_dir`, updated comments

## Next Steps

1. ✅ Workflow configured correctly
2. ✅ App.yaml updated for new structure
3. ⏳ First deployment will create `frontend-build-artifacts` branch
4. ⏳ Monitor both services in DigitalOcean dashboard
5. ⏳ Verify frontend and backend are both accessible

## References

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/using-workflows)
- [Vite Build Documentation](https://vitejs.dev/guide/build.html)
