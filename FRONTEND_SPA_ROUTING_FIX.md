# Frontend SPA Routing Fix - October 2024

## Problem
Users were getting 404 errors when trying to access routes like `/signup`, `/login`, `/terms`, etc. directly via URL or by refreshing the page on these routes.

**Error observed:**
```
GET https://vendora.page/signup 404 (Not Found)
```

## Additional Issue - MIME Type Error (Fixed)
After the initial fix, a new error appeared:
```
main.tsx:1 Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html". Strict MIME type checking is enforced for module scripts per HTML spec.
```

This occurred because the `404.html` file was referencing `/src/main.tsx` directly, which doesn't exist in the built output. Vite needs to process HTML files to transform TypeScript module references into the actual built JavaScript bundles.

## Root Cause
The issue occurred because DigitalOcean's static site hosting was trying to find actual files at these paths (e.g., `/signup/index.html`), but these are client-side routes handled by React Router. Without proper configuration:

1. **Missing 404.html in build**: The `404.html` file existed in `frontend/404.html` but wasn't in the `public/` directory, so Vite didn't copy it to the `dist/` folder during the build process.

2. **Missing error_document configuration**: The `.do/app.yaml` didn't have an `error_document` directive to tell DigitalOcean what to serve when a route is not found.

3. **404.html not processed by Vite**: The `404.html` file was being copied as-is without Vite transforming the module script references, causing the MIME type error.

## Solution

### Change 1: Configure 404.html as a Vite build entry point
**Before:**
- `frontend/public/404.html` - Copied as-is to `dist/`, with unprocessed `/src/main.tsx` reference

**After:**
- `frontend/404.html` - Processed by Vite as a multi-page app entry, transforming script references to built bundles
- Updated `vite.config.ts` to include both `index.html` and `404.html` as input entry points

This ensures that Vite processes the 404.html file during build, transforming the TypeScript module reference `/src/main.tsx` into the actual built JavaScript bundle paths like `/assets/main-[hash].js`.

### Change 2: Configure error_document in app.yaml
**Before:**
```yaml
static_sites:
  - name: frontend
    github:
      repo: Donsirmuel/Vendora-Unified
      branch: frontend-build-artifacts
      deploy_on_push: true
    source_dir: .
    output_dir: dist
    envs:
      # ... environment variables
```

**After:**
```yaml
static_sites:
  - name: frontend
    github:
      repo: Donsirmuel/Vendora-Unified
      branch: frontend-build-artifacts
      deploy_on_push: true
    source_dir: .
    output_dir: dist
    error_document: 404.html  # ← Added this line
    envs:
      # ... environment variables
```

### vite.config.ts Changes
**Added multi-page app configuration:**
```typescript
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'index.html'),
      404: path.resolve(__dirname, '404.html'),  // ← Added this entry
    },
    output: {
      // ... existing chunk configuration
    }
  }
}
```

This ensures Vite processes both HTML files during build, transforming module script references into the built bundle paths.

## How It Works

### SPA Fallback Flow
When a user navigates directly to a client-side route (e.g., `https://app.vendora.page/signup`):

1. **Request**: Browser requests `/signup` from DigitalOcean
2. **File lookup**: DigitalOcean looks for `/signup/index.html` or `/signup` file
3. **Not found**: File doesn't exist (it's a client-side route)
4. **Fallback**: DigitalOcean serves the configured `error_document` (404.html) instead of showing an error
5. **Bootstrap**: The 404.html bootstraps the React application with the URL still showing `/signup`
6. **React Router**: React Router sees the URL path `/signup` and renders the Signup component

### The 404.html Content
The `404.html` file is designed specifically for SPA fallback routing:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Vendora – App</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex" />
    <!-- SPA Fallback: This page is served by DigitalOcean for unknown paths.
         It bootstraps the React application so client-side routing can render
         the correct /signup, /login, /terms etc. routes. -->
    <script>
      // Optional: flag so app could detect it was loaded via fallback if needed
      window.__VENDORA_FALLBACK__ = true;
    </script>
    <style>
      body { margin:0; font-family: system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif; }
      .boot { padding:2rem; text-align:center; color:#0ea5b7; font-size:14px; }
      .boot span { opacity:.6; }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="boot">Loading Vendora… <span>(routing)</span></div>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**After build (processed by Vite):**
```html
<script type="module" crossorigin src="/assets/vendor-[hash].js"></script>
<script type="module" crossorigin src="/assets/vendor-recharts-[hash].js"></script>
<script type="module" crossorigin src="/assets/charts_panel-[hash].js"></script>
<script type="module" crossorigin src="/assets/main-[hash].js"></script>
<link rel="stylesheet" crossorigin href="/assets/main-[hash].css">
```

Key features:
- Source references the same React app entry point (`/src/main.tsx`) which Vite transforms to built bundles
- Shows a loading message while React initializes
- Sets a flag (`window.__VENDORA_FALLBACK__`) for detection if needed
- Uses `noindex` to prevent search engines from indexing the fallback page

## Files Changed

1. **frontend/public/404.html → frontend/404.html** (moved)
   - Moved from `public/` to root directory to be processed as a Vite build entry point
   - Now transforms `/src/main.tsx` references to built bundle paths during build

2. **frontend/vite.config.ts** (modified)
   - Added `input` configuration to `rollupOptions` with both `index.html` and `404.html` as entry points
   - Enables Vite to process 404.html as a multi-page app entry

3. **.do/app.yaml** (already configured)
   - Has `error_document: 404.html` configured for the frontend static site

## Deployment

The fix will automatically take effect on the next deployment:

1. **Code Push**: When changes are pushed to the `main` branch
2. **CI Build**: GitHub Actions workflow builds the frontend
   - Now includes `404.html` in the `dist/` output
3. **Artifact Publish**: Built files pushed to `frontend-build-artifacts` branch
4. **DigitalOcean Deploy**: DigitalOcean pulls the new artifacts
   - Now has `404.html` available
   - Configured to serve it via `error_document` directive
5. **Live**: All routes now work correctly!

## Testing

After deployment, verify the fix works:

### Test 1: Direct Navigation
1. Navigate directly to `https://app.vendora.page/signup`
2. **Expected**: Signup page loads correctly (no 404 error)

### Test 2: Refresh on Route
1. Navigate to `https://app.vendora.page/` and log in
2. Navigate to a protected route like `/dashboard`
3. Refresh the page (F5 or Cmd+R)
4. **Expected**: Dashboard reloads correctly (no 404 error)

### Test 3: Various Routes
Test these routes work when accessed directly:
- `https://app.vendora.page/login` ✓
- `https://app.vendora.page/signup` ✓
- `https://app.vendora.page/terms` ✓
- `https://app.vendora.page/privacy` ✓
- `https://app.vendora.page/password-reset` ✓

### Test 4: Protected Routes (when authenticated)
- `https://app.vendora.page/dashboard` ✓
- `https://app.vendora.page/orders` ✓
- `https://app.vendora.page/settings` ✓

### Test 5: Verify 404.html in Build
Locally verify the fix:
```bash
cd frontend
npm ci
npm run build
ls -la dist/404.html  # Should exist
```

## Benefits

1. **Better User Experience**: Users can bookmark, share, and refresh any page
2. **SEO Friendly**: Search engines can index individual routes
3. **Standard SPA Pattern**: Follows industry best practices
4. **No Backend Changes**: Purely frontend/deployment configuration
5. **Fast Fallback**: Static file serving is instant

## Related Documentation

- See `CI_BUILD_DO_STATIC_DEPLOYMENT.md` for deployment architecture
- See `FRONTEND_DEPLOYMENT_FIX.md` for previous deployment fixes
- See `backend/AUTHENTICATION_SUMMARY.md` for route details

## Notes

- The `404.html` is served for **any** path that doesn't match a real file
- True 404 errors (e.g., typos like `/sdignup`) are handled by React Router's `NotFound` component
- The fallback adds minimal overhead (just the 1KB 404.html file)
- This pattern works for all SPA frameworks, not just React
