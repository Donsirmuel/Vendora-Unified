# CI Build + DO Static Serve - Visual Flow

## Deployment Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       DEVELOPER                                  │
│                                                                  │
│  git add .                                                       │
│  git commit -m "Update feature"                                 │
│  git push origin main                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GITHUB (main branch)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Repository Files:                                      │   │
│  │  ├── backend/        (Django/Python code)              │   │
│  │  ├── frontend/       (React/TypeScript code)           │   │
│  │  ├── .do/app.yaml   (Deployment config)               │   │
│  │  └── .github/workflows/                                │   │
│  └────────────────────────────────────────────────────────┘   │
└───┬──────────────────────────────────────────┬─────────────────┘
    │                                           │
    │ Triggers                                  │ Triggers
    │ on push                                   │ on push
    │                                           │
    ▼                                           ▼
┌──────────────────────────────────┐  ┌──────────────────────────┐
│   GITHUB ACTIONS (CI)            │  │  DIGITALOCEAN APP        │
│                                  │  │  PLATFORM                │
│  Frontend Build Workflow:        │  │                          │
│  1. Checkout main branch         │  │  Backend Service:        │
│  2. Setup Node.js 20             │  │  1. Clone main branch    │
│  3. npm ci (install deps)        │  │  2. cd backend/          │
│  4. npm run build                │  │  3. Install Python deps  │
│  5. Create artifacts branch      │  │  4. Run Procfile         │
│  6. Push to artifacts            │  │  5. bash start.sh        │
│                                  │  │     - migrate DB         │
│  Result: frontend-build-         │  │     - collectstatic      │
│          artifacts branch        │  │     - start gunicorn     │
│          created/updated         │  │  6. Health check         │
│                                  │  │                          │
│  Time: 1-2 minutes               │  │  Time: 2-3 minutes       │
│  Cost: FREE (GitHub)             │  │  Cost: $$$ (DO)          │
└──────┬───────────────────────────┘  └──────────────────────────┘
       │                                         │
       │ Push to                                 │
       │ frontend-build-artifacts                │
       │                                         │
       ▼                                         ▼
┌──────────────────────────────────┐  ┌──────────────────────────┐
│  GITHUB (artifacts branch)       │  │  BACKEND DEPLOYED        │
│                                  │  │                          │
│  ┌─────────────────────────┐   │  │  https://api.vendora     │
│  │  dist/                  │   │  │        .page             │
│  │  ├── index.html         │   │  │                          │
│  │  ├── assets/            │   │  │  ┌────────────────────┐  │
│  │  │   ├── index-xxx.js   │   │  │  │ Django App         │  │
│  │  │   ├── index-xxx.css  │   │  │  │ + Gunicorn         │  │
│  │  │   └── ...            │   │  │  │ + Database         │  │
│  │  └── vite.svg           │   │  │  └────────────────────┘  │
│  └─────────────────────────┘   │  │                          │
│                                  │  │  Port: 8080              │
│  (Only built files,              │  │  Health: /health/        │
│   no source code)                │  │                          │
└──────┬───────────────────────────┘  └──────────────────────────┘
       │
       │ Triggers DO deployment
       │
       ▼
┌──────────────────────────────────┐
│  DIGITALOCEAN APP PLATFORM       │
│                                  │
│  Frontend Service:               │
│  1. Clone artifacts branch       │
│  2. Serve files from dist/       │
│  3. No build step!               │
│  4. CDN distribution             │
│                                  │
│  Time: 30 seconds                │
│  Cost: FREE (Static)             │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  FRONTEND DEPLOYED               │
│                                  │
│  https://app.vendora.page        │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Static Files:             │ │
│  │  - index.html              │ │
│  │  - JavaScript bundles      │ │
│  │  - CSS stylesheets         │ │
│  │  - Images/assets           │ │
│  │                            │ │
│  │  Served by:                │ │
│  │  - CDN (fast)              │ │
│  │  - Cached globally         │ │
│  └────────────────────────────┘ │
│                                  │
│  Connects to backend API         │
│  for dynamic data                │
└──────────────────────────────────┘
```

## Timeline Comparison

### Old Method (Build on DigitalOcean)
```
Push to main
    ↓
    ├─ Backend build:   [===========] 2-3 min
    └─ Frontend build:  [===========] 2-3 min
    
Total: ~5 minutes sequentially
```

### New Method (CI Build + Static Serve)
```
Push to main
    ↓
    ├─ CI frontend:     [=======] 1-2 min  → artifacts branch
    │                                             ↓
    │                                       Frontend deploy: [=] 30 sec
    └─ Backend build:   [===========] 2-3 min

Total: ~3 minutes (parallel execution)
Frontend alone: ~2 minutes (CI + deploy)
```

## Data Flow

### Build Time
```
┌──────────────┐
│  Source Code │
└──────┬───────┘
       │
       ├─→ CI Build (GitHub Actions)
       │   - Free tier: 2000 min/month
       │   - Fast runners
       │   - Parallel builds possible
       │
       └─→ DO Build (DigitalOcean)
           - Paid: $0.007/min
           - Backend only
           - Buildpack optimization
```

### Runtime
```
┌─────────┐         ┌─────────────┐
│ Browser │ ←─────→ │ Frontend    │
│         │  HTML   │ (Static CDN)│
└─────────┘  CSS/JS └─────────────┘
     │                      ↓
     │              (API requests)
     │                      ↓
     └──────────────→ ┌─────────────┐
          JSON        │ Backend     │
          Data        │ (Gunicorn)  │
                      └──────┬──────┘
                             │
                             ↓
                      ┌─────────────┐
                      │ Database    │
                      │ (PostgreSQL)│
                      └─────────────┘
```

## Branch Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  main branch                                                 │
│  ├── backend/              ← Backend source code            │
│  ├── frontend/             ← Frontend source code           │
│  ├── .do/app.yaml          ← Deployment config              │
│  └── .github/workflows/    ← CI workflows                   │
│                                                              │
│  Purpose: Development and backend deployment                 │
│  Used by: Backend deployment on DO                          │
└─────────────────────────────────────────────────────────────┘

                              ↓ CI Build
                              
┌─────────────────────────────────────────────────────────────┐
│  frontend-build-artifacts branch (generated)                 │
│  └── dist/                 ← Pre-built frontend files       │
│      ├── index.html                                         │
│      ├── assets/                                            │
│      └── ...                                                │
│                                                              │
│  Purpose: Deployment artifacts only (no source code)        │
│  Used by: Frontend deployment on DO                         │
│  History: Clean (orphan branch, force-pushed each build)    │
└─────────────────────────────────────────────────────────────┘
```

## Security & Access

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Permissions                                  │
│  ├── contents: write     ← Push to artifacts branch         │
│  └── actions: write      ← Manage workflow artifacts        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DigitalOcean Access                                         │
│  ├── Backend: main branch (read-only)                       │
│  └── Frontend: frontend-build-artifacts branch (read-only)  │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring & Debugging

```
Issue occurs
    ↓
    ├─ Frontend issue?
    │  ├─→ Check GitHub Actions logs
    │  │   https://github.com/.../actions
    │  │
    │  └─→ Check DO deployment logs
    │      (Frontend service)
    │
    └─ Backend issue?
       └─→ Check DO deployment logs
           (Backend service)
           └─→ Check start.sh output
```

## Rollback Strategy

```
┌──────────────────────────────────────────────────────────┐
│  ROLLBACK OPTIONS                                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend Rollback:                                       │
│  1. Revert artifacts branch to previous commit           │
│     git checkout frontend-build-artifacts                │
│     git reset --hard <previous-commit>                   │
│     git push -f origin frontend-build-artifacts          │
│                                                           │
│  2. Manual redeploy in DO dashboard                      │
│     - Select previous deployment                         │
│     - Click "Redeploy"                                   │
│                                                           │
│  Backend Rollback:                                        │
│  1. Revert main branch                                   │
│     git revert <commit-hash>                             │
│     git push origin main                                 │
│                                                           │
│  2. Manual redeploy in DO dashboard                      │
│     - Select previous deployment                         │
│     - Click "Redeploy"                                   │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

**Legend:**
- `[====]` Progress/time indicator
- `←→` Bidirectional communication
- `→` Data/control flow
- `↓` Sequential step
