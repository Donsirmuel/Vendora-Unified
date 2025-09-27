# DigitalOcean Deployment Guide for Vendora

## Pre-Deployment Checklist ✅

### 1. Repository Status
- [x] Settings configured for DigitalOcean App Platform
- [x] Frontend URLs updated to use environment variables
- [x] DigitalOcean app.yaml created
- [x] Production dependencies added to requirements.txt
- [x] Health endpoints configured
- [x] ASGI configuration ready for production

### 2. Required Services Setup

#### A. Database (Neon PostgreSQL)
- [x] You already have this configured
- Make sure you have the DATABASE_URL ready

#### B. Domain Configuration (Name.com)
- You need to configure these DNS records:
  - `api.yourdomain.com` → CNAME to your DigitalOcean app
  - `app.yourdomain.com` → CNAME to your DigitalOcean app

#### C. Telegram Bot
- [x] Bot token ready
- Update webhook URL to: `https://api.yourdomain.com/api/v1/telegram/webhook/`

## Deployment Steps

### Step 1: Domain Configuration ✅
Your domain configuration is already set up for `vendora.page`:

1. **`.do/app.yaml`** - Updated with `api.vendora.page` and `app.vendora.page`
2. **`frontend/.env.production.example`** - Updated with `api.vendora.page`

### Step 2: Environment Variables Preparation
Prepare these environment variables for DigitalOcean:

#### Backend Service Environment Variables:
```bash
# Security
SECRET_KEY=your-256-bit-secret-key
DEBUG=false
DIGITALOCEAN_APP_PLATFORM=true

# Domain Configuration
ALLOWED_HOSTS=api.vendora.page,vendora.page
CSRF_TRUSTED_ORIGINS=https://api.vendora.page,https://app.vendora.page
PRODUCTION_CORS_ORIGINS=https://app.vendora.page,https://vendora.page

# Database
DATABASE_URL=your-neon-postgres-connection-string

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your-bot-username
TELEGRAM_WEBHOOK_URL=https://api.vendora.page/api/v1/telegram/webhook/
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret

# Frontend
FRONTEND_URL=https://app.vendora.page
```

#### Frontend Build Environment Variables:
```bash
VITE_API_BASE=https://api.vendora.page
VITE_WS_PROTOCOL=wss
VITE_API_HOST=api.vendora.page
```

### Step 3: Create DigitalOcean App

1. **Login to DigitalOcean**
   - Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
   - Click "Create App"

2. **Source Configuration**
   - Choose "GitHub" as source
   - Connect your GitHub account if not already connected
   - Select repository: `Donsirmuel/Vendora-Unified`
   - Branch: `main`
   - Auto-deploy: ✅ Enabled

3. **Import App Spec**
   - Choose "Import app spec from repository"
   - Select the `.do/app.yaml` file
   - Review the configuration

4. **Configure Environment Variables**
   - For the backend service, add all the environment variables listed above
   - Mark sensitive ones (SECRET_KEY, DATABASE_URL, TELEGRAM_BOT_TOKEN, etc.) as "Encrypted"

5. **Configure Domains**
   - Add your custom domains:
     - `api.yourdomain.com` (for backend)
     - `app.yourdomain.com` (for frontend)

### Step 4: DNS Configuration on Name.com

1. **Login to Name.com**
2. **Go to Domain Management**
3. **Add DNS Records**:
   ```
   Type: CNAME
   Host: api
   Answer: [your-do-app-url] (provided by DigitalOcean after deployment)
   TTL: 300
   
   Type: CNAME  
   Host: app
   Answer: [your-do-app-url]
   TTL: 300
   ```
   
   **Note**: Your domains will be:
   - Backend API: `api.vendora.page`
   - Frontend App: `app.vendora.page`

### Step 5: Update Telegram Webhook

After deployment, update your Telegram bot webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://api.vendora.page/api/v1/telegram/webhook/",
       "secret_token": "your-webhook-secret"
     }'
```

### Step 6: Verify Deployment

1. **Check Health Endpoints**:
   - Backend: `https://api.vendora.page/health/`
   - Simple check: `https://api.vendora.page/healthz/`

2. **Test Frontend**:
   - Visit: `https://app.vendora.page`
   - Verify API connectivity

3. **Test Telegram Bot**:
   - Send a message to your bot
   - Check webhook delivery

## File Changes Summary

### Modified Files:
1. **`backend/vendora/settings.py`**
   - Updated CORS configuration for environment-driven origins
   - Changed platform detection from RENDER to DIGITALOCEAN_APP_PLATFORM

2. **`frontend/src/lib/http.ts`**
   - Updated default baseURL to use localhost for development

3. **`frontend/src/lib/ws.ts`**
   - Updated default WebSocket host to use localhost for development

4. **`frontend/.env.production.example`**
   - Added WebSocket protocol and host configuration

### Created Files:
1. **`.do/app.yaml`**
   - Complete DigitalOcean App Platform configuration
   - Backend and frontend service definitions
   - Environment variables and domain configuration

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure `PRODUCTION_CORS_ORIGINS` matches your frontend domains
2. **Database Connection**: Verify `DATABASE_URL` format and credentials
3. **Static Files**: App Platform automatically handles static file serving
4. **Webhook Issues**: Ensure webhook URL is accessible and matches bot configuration

### Monitoring:
- DigitalOcean provides built-in logging and monitoring
- Health endpoint: `/health/` provides database connectivity status
- Metrics endpoint: `/metrics/` for application metrics

## Cost Estimate (GitHub Student Account):
- Basic-XXS instances: ~$12-18/month total for both services
- With GitHub Student credits: FREE for significant period
- Domain: Already purchased
- Database: Using existing Neon (free tier)

Your application is now ready for DigitalOcean deployment! 🚀