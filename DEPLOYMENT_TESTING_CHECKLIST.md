# Deployment Testing Checklist

Use this checklist to verify the new CI build + DO static serve deployment is working correctly.

## Pre-Merge Verification ✓

- [x] YAML syntax validated for `.github/workflows/frontend-build.yml`
- [x] YAML syntax validated for `.do/app.yaml`
- [x] Workflow has `contents: write` permission
- [x] Frontend service points to `frontend-build-artifacts` branch
- [x] Backend service configuration unchanged
- [x] Documentation created (3 new files)

## Post-Merge Steps

### 1. Merge to Main Branch
```bash
# Through GitHub UI or CLI:
gh pr merge <PR-NUMBER> --merge
```

**Expected**: PR merged successfully to main branch

---

### 2. Monitor GitHub Actions Build

**Navigate to**: https://github.com/Donsirmuel/Vendora-Unified/actions

**Check**:
- [ ] "Frontend Build (Artifact)" workflow triggered automatically
- [ ] Workflow status shows as "running" then "success" (green check)
- [ ] Build completes in 1-3 minutes
- [ ] No errors in build logs

**View Logs**:
```bash
gh run list --workflow=frontend-build.yml
gh run view <RUN-ID> --log
```

**Expected Output**:
```
✓ Checkout
✓ Use Node 20
✓ Install deps
✓ Build frontend
✓ Upload dist artifact
✓ Publish dist to frontend-build-artifacts branch
✓ Summary
```

---

### 3. Verify Artifacts Branch Created

**Check in GitHub**:
```bash
git fetch origin
git branch -r | grep frontend-build-artifacts
```

**Expected**: `origin/frontend-build-artifacts` appears in branch list

**Inspect Branch**:
```bash
git checkout frontend-build-artifacts
ls -la
```

**Expected Structure**:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── vite.svg
```

---

### 4. Monitor DigitalOcean Backend Deployment

**Navigate to**: DigitalOcean App Platform Dashboard

**Check Backend Service**:
- [ ] Status shows "Building" then "Deployed"
- [ ] No errors in build logs
- [ ] Build completes in 2-3 minutes
- [ ] Health check passes

**Look for in logs**:
```
=== Vendora Backend Startup ===
✓ vendora/asgi.py found
✓ Gunicorn is available
✓ Database is accessible
=== Running database migrations ===
=== Collecting static files ===
=== Starting Gunicorn with Uvicorn workers ===
```

---

### 5. Monitor DigitalOcean Frontend Deployment

**Navigate to**: DigitalOcean App Platform Dashboard

**Check Frontend Service**:
- [ ] Status shows "Deploying" then "Active"
- [ ] No build step (should be fast, ~30 seconds)
- [ ] No errors in deployment logs
- [ ] Branch shows as `frontend-build-artifacts`

**Look for in logs**:
```
Pulling from frontend-build-artifacts branch
Serving static files from dist/
```

---

### 6. Test Backend Endpoint

**Health Check**:
```bash
curl -i https://api.vendora.page/health/
```

**Expected Response**:
```
HTTP/2 200
content-type: application/json
...

{"status":"healthy","database":"connected"}
```

**API Test**:
```bash
curl -i https://api.vendora.page/api/v1/
```

**Expected**: JSON response (not 404 or 500)

---

### 7. Test Frontend Application

**Home Page**:
```bash
curl -i https://app.vendora.page/
```

**Expected Response**:
```
HTTP/2 200
content-type: text/html
...

<!DOCTYPE html>
<html lang="en">
...
```

**Browser Test**:
1. [ ] Open https://app.vendora.page/ in browser
2. [ ] Page loads without errors
3. [ ] No console errors in browser DevTools
4. [ ] Assets (JS, CSS, images) load correctly
5. [ ] SPA routing works (try navigating to /login, /signup)

---

### 8. Test Full Flow Integration

**Create Account Flow**:
1. [ ] Navigate to signup page
2. [ ] Fill in registration form
3. [ ] Submit form
4. [ ] Verify API call succeeds (check Network tab)
5. [ ] Verify no CORS errors

**Login Flow**:
1. [ ] Navigate to login page
2. [ ] Enter credentials
3. [ ] Submit form
4. [ ] Verify successful authentication
5. [ ] Verify redirect to dashboard

---

### 9. Verify Environment Variables

**Frontend**:
```bash
# In browser console at app.vendora.page:
console.log(import.meta.env.VITE_API_BASE)
# Should output: https://api.vendora.page
```

**Backend**:
```bash
curl https://api.vendora.page/api/v1/health/
# Should respond without errors
```

---

### 10. Test Subsequent Deployments

**Make a small change**:
```bash
# Edit frontend/src/App.tsx or any frontend file
git add frontend/
git commit -m "test: minor frontend change"
git push origin main
```

**Verify**:
- [ ] GitHub Actions triggers automatically
- [ ] New build completes successfully
- [ ] Artifacts branch updated with new commit
- [ ] DigitalOcean detects branch update
- [ ] Frontend redeploys (~30 seconds)
- [ ] Changes visible at app.vendora.page

---

### 11. Performance Check

**Frontend Deploy Time**:
- [ ] Should be ~20-40 seconds (vs 2-3 minutes before)

**Backend Deploy Time** (if changed):
- [ ] Should be ~2-3 minutes (unchanged)

**Total Time** (both):
- [ ] Should be ~3 minutes in parallel (vs 5+ minutes before)

---

### 12. Verify Artifacts Storage

**GitHub Actions Artifacts**:
```bash
gh run list --workflow=frontend-build.yml
gh run view <RUN-ID>
```

**Expected**:
- [ ] Artifacts section shows `frontend-dist-<SHA>`
- [ ] Artifact is downloadable
- [ ] Retention: 7 days

**Download Test**:
```bash
gh run download <RUN-ID>
ls frontend-dist-*/
```

**Expected**: Contains dist/ directory with built files

---

## Troubleshooting Checks

### If Frontend Not Updating

**Check**:
```bash
# 1. Verify workflow ran
gh run list --workflow=frontend-build.yml --limit 5

# 2. Check artifacts branch
git fetch origin
git log origin/frontend-build-artifacts -n 1

# 3. Check DO detection
# In DO dashboard: check last deployment time
```

**Fix**:
- Wait 1-2 minutes for CDN cache
- Manually trigger redeploy in DO dashboard
- Check workflow logs for errors

---

### If Backend Failing

**Check**:
```bash
# 1. Test locally
cd backend
python manage.py check
python manage.py migrate

# 2. Check DO environment variables
# In DO dashboard: verify all secrets are set
```

**Fix**:
- Verify DATABASE_URL is correct
- Check SECRET_KEY is set
- Review start.sh logs in DO

---

### If CORS Errors

**Check**:
```bash
# In browser console at app.vendora.page:
# Check the error message
```

**Verify in DO dashboard**:
- [ ] `PRODUCTION_CORS_ORIGINS` includes `https://app.vendora.page`
- [ ] `CSRF_TRUSTED_ORIGINS` includes `https://app.vendora.page`
- [ ] `ALLOWED_HOSTS` includes `api.vendora.page`

---

## Success Criteria ✅

All of the following should be true:

- ✅ GitHub Actions workflow runs successfully
- ✅ `frontend-build-artifacts` branch exists and contains dist/
- ✅ Backend deploys and health check passes
- ✅ Frontend deploys in ~30 seconds
- ✅ https://api.vendora.page/health/ returns 200
- ✅ https://app.vendora.page/ loads correctly
- ✅ No CORS errors in browser console
- ✅ Login/signup flows work end-to-end
- ✅ Subsequent deployments work automatically

---

## Rollback Instructions

If any critical issues arise:

### Quick Rollback
```bash
git revert HEAD~3..HEAD
git push origin main
```

This will:
1. Revert the deployment changes
2. Trigger new deploys with old configuration
3. Frontend will build on DO again (slower but working)

### Manual Fix in DigitalOcean
1. Go to App Platform dashboard
2. Edit frontend service
3. Change branch from `frontend-build-artifacts` to `main`
4. Add build command: `npm ci && npm run build`
5. Add source_dir: `frontend`
6. Redeploy

---

## Post-Deployment Tasks

After successful deployment:

- [ ] Update team on new deployment method
- [ ] Archive old deployment docs (if any)
- [ ] Monitor logs for first 24 hours
- [ ] Set up monitoring alerts (optional)
- [ ] Document any issues encountered
- [ ] Celebrate faster deployments! 🎉

---

## Contact/Support

**Documentation**:
- `CI_BUILD_DO_STATIC_DEPLOYMENT.md` - Full technical documentation
- `DEPLOYMENT_QUICKSTART.md` - Quick reference guide
- `DEPLOYMENT_MIGRATION_GUIDE.md` - Comparison with old method

**Logs**:
- GitHub Actions: https://github.com/Donsirmuel/Vendora-Unified/actions
- DigitalOcean: App Platform Dashboard → Logs tab

**Testing**:
- Frontend: https://app.vendora.page/
- Backend Health: https://api.vendora.page/health/
- API Docs: https://api.vendora.page/api/v1/

---

**Note**: This checklist should be run in order. Each step depends on the previous steps completing successfully.
