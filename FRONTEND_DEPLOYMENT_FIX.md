# Frontend Deployment Fix - October 2024

## Problem
The frontend service was failing to deploy on DigitalOcean App Platform with these errors:
```
ERROR: failed to launch: determine start command: when there is no default process a command is required
ERROR component terminated with non-zero exit code: 190
ERROR failed health checks after 1 attempts with error Readiness probe failed: dial tcp 10.244.30.119:8080: connect: connection refused
```

## Root Cause
The `.do/app.yaml` configuration file had the `github:` section incorrectly placed **inside each service definition** (both backend and frontend services). According to DigitalOcean App Platform specification, the `github:` configuration should be at the **spec level** (top-level), not nested within individual services.

### Incorrect Configuration (Before):
```yaml
spec:
  name: vendora-unified
  services:
  - name: backend
    source_dir: backend
    github:              # ❌ Wrong: github config inside service
      repo: Donsirmuel/Vendora-Unified
      branch: main
      deploy_on_push: true
    environment_slug: python
    ...
    
  - name: frontend
    type: static
    source_dir: frontend
    github:              # ❌ Wrong: github config inside service
      repo: Donsirmuel/Vendora-Unified
      branch: main
      deploy_on_push: true
    build_command: npm ci --prefer-offline --no-audit && npm run build
    ...
```

This misconfiguration caused DigitalOcean to misinterpret the deployment specification, leading to the "failed to launch" errors.

## Solution
Moved the `github:` configuration to the top level of the spec (directly under `spec:`), where it applies to all services, and removed the duplicate sections from individual service definitions.

### Correct Configuration (After):
```yaml
spec:
  name: vendora-unified
  # GitHub source configuration - applies to all services
  github:                # ✅ Correct: github config at spec level
    repo: Donsirmuel/Vendora-Unified
    branch: main
    deploy_on_push: true
  
  services:
  - name: backend
    source_dir: backend
    # No github section here
    environment_slug: python
    ...
    
  - name: frontend
    type: static
    source_dir: frontend
    # No github section here
    build_command: npm ci --prefer-offline --no-audit && npm run build
    ...
```

## Why This Works
- **Spec-level GitHub config**: When `github:` is at the spec level, DigitalOcean uses it as the source for ALL services in the app
- **Single source of truth**: Having one GitHub configuration avoids conflicts and ensures consistent deployment settings
- **Proper service detection**: With the correct structure, DigitalOcean can properly identify the frontend as a static site and the backend as a Python web service

## Changes Made
1. Moved `github:` section from backend service to spec level (lines 4-7)
2. Removed duplicate `github:` section from backend service
3. Removed duplicate `github:` section from frontend service
4. Added comment to clarify the GitHub configuration applies to all services

## Expected Outcome
After this fix:
- ✅ Frontend should build successfully as a static site
- ✅ Backend should start correctly using the Procfile
- ✅ No "failed to launch" errors
- ✅ No "no default process" errors
- ✅ Proper health checks for both services

## Verification Steps
1. Push this change to trigger a new deployment
2. Monitor DigitalOcean build logs for both services
3. Verify backend health endpoint: `https://api.vendora.page/health/`
4. Verify frontend loads: `https://app.vendora.page/`

## Related Documentation
- See `DEPLOYMENT_FIX_BUILDPACK.md` for backend-specific fixes
- See `DIGITALOCEAN_FIXES.md` for previous deployment fixes
- See `QUICK_DEPLOY.md` for deployment checklist
