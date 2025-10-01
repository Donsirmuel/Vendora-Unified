# Quick Start: CI Build + DO Static Serve

## What Changed?

The deployment has been reconfigured to use a more efficient method:
- **Frontend**: Built by GitHub Actions CI, served as static files by DigitalOcean
- **Backend**: Still built and deployed traditionally using DigitalOcean buildpacks

## How It Works Now

```
Developer pushes to main
         ↓
    GitHub Actions
         ↓
  Builds Frontend
         ↓
  Publishes to
frontend-build-artifacts
  branch
         ↓
    DigitalOcean
         ↓
  Serves frontend     Builds & runs backend
  (no build needed)   (from main branch)
```

## Next Steps After Merge

### 1. Merge This PR
```bash
# This PR contains the necessary configuration changes
# Merge it to main branch
```

### 2. First Deployment
When you merge to main:
- GitHub Actions will automatically build the frontend
- It will create/update the `frontend-build-artifacts` branch
- DigitalOcean will detect both branches and deploy:
  - Backend from `main` branch
  - Frontend from `frontend-build-artifacts` branch

### 3. Verify Deployment

**Frontend:**
```bash
curl https://app.vendora.page/
# Should return the HTML of your React app
```

**Backend:**
```bash
curl https://api.vendora.page/health/
# Should return: {"status": "healthy"}
```

### 4. Monitor First Build

**GitHub Actions:**
1. Go to: https://github.com/Donsirmuel/Vendora-Unified/actions
2. Look for "Frontend Build (Artifact)" workflow
3. Check that it completes successfully
4. Verify a new branch `frontend-build-artifacts` was created

**DigitalOcean:**
1. Go to your App Platform dashboard
2. Check logs for both services
3. Verify both services show as "Active"

## Subsequent Deployments

### Normal Development Flow
```bash
# 1. Make changes to frontend or backend
git add .
git commit -m "Your changes"
git push origin main

# 2. CI automatically:
#    - Builds frontend (if changed)
#    - Updates artifacts branch
#    - Triggers DO deployments
```

### Manual Frontend Rebuild
If you need to rebuild frontend without code changes:
1. Go to GitHub Actions
2. Select "Frontend Build (Artifact)"
3. Click "Run workflow"
4. Select "main" branch
5. Click green "Run workflow" button

### Check Deployment Status
```bash
# Frontend build status
gh run list --workflow=frontend-build.yml

# View logs
gh run view --log
```

## Troubleshooting

### "Frontend not updating"
1. Check GitHub Actions completed successfully
2. Verify `frontend-build-artifacts` branch has new commit
3. Check DigitalOcean detected the branch update
4. Wait 1-2 minutes for CDN cache to clear

### "Backend failing to start"
1. Check DigitalOcean logs for errors
2. Verify environment variables are set
3. Check database connectivity
4. Review `backend/start.sh` logs

### "CORS errors in browser"
1. Verify `PRODUCTION_CORS_ORIGINS` includes your frontend domain
2. Check browser console for exact error
3. Ensure backend `ALLOWED_HOSTS` is correct

## Configuration Files

**Modified in this PR:**
- `.github/workflows/frontend-build.yml` - CI build workflow
- `.do/app.yaml` - DigitalOcean deployment config
- `CI_BUILD_DO_STATIC_DEPLOYMENT.md` - Full documentation

**No changes needed to:**
- `backend/` code or configuration
- `frontend/` code (except if you want to update env vars)
- `backend/Procfile` or `backend/start.sh`

## Benefits You'll See

✅ **Faster frontend deploys**: ~30 seconds vs 2-3 minutes
✅ **Cost savings**: No build time on DigitalOcean for frontend
✅ **Better visibility**: Build logs in GitHub Actions
✅ **Artifact storage**: Can download builds for testing
✅ **Independent scaling**: Frontend and backend deploy separately

## Rollback If Needed

If something goes wrong:

**Option 1: Revert the PR**
```bash
git revert HEAD
git push origin main
```

**Option 2: Modify .do/app.yaml**
Add back build command to frontend service:
```yaml
- name: frontend
  type: static
  source_dir: frontend
  build_command: npm ci && npm run build
  output_dir: dist
```

## Questions?

- Read full docs: `CI_BUILD_DO_STATIC_DEPLOYMENT.md`
- Check GitHub Actions logs
- Review DigitalOcean deployment logs
- Test locally: `cd frontend && npm run build`

---

**Summary**: This change makes deployments faster, cheaper, and more reliable by using CI to build the frontend instead of building on DigitalOcean. The configuration is done - just merge and monitor the first deployment! 🚀
