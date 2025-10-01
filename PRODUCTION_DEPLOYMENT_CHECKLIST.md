# Production Deployment Checklist for Vendora on DigitalOcean

## ✅ Pre-Deployment Status

### ✅ Code Quality & Tests
- [x] **All tests passing**: 46/46 backend tests passed
- [x] **Frontend builds successfully**: Build completed with optimized chunks
- [x] **No critical placeholders**: Updated bot username and env files
- [x] **Environment validation**: `env_sanity.py` configured and ready

### ✅ Configuration Files
- [x] **DigitalOcean App Spec**: `.do/app.yaml` configured for `vendora.page`
- [x] **Frontend Environment**: `.env.production.example` updated
- [x] **Dependencies**: `requirements.txt` includes all production packages
- [x] **ASGI Configuration**: Gunicorn + Uvicorn workers for WebSocket support

### ✅ Security & Production Settings
- [x] **Django Settings**: Production-ready security headers and SSL enforcement
- [x] **CORS Configuration**: Environment-driven for proper cross-origin setup  
- [x] **Static File Serving**: Whitenoise + proper cache headers implemented
- [x] **Health Endpoints**: `/api/v1/health/` ready for DigitalOcean health checks

## 🔧 Required Environment Variables for DigitalOcean

### Backend Service (Mark as SECRET in DO)
```bash
# Core Security
SECRET_KEY=your-256-bit-secret-key
DEBUG=false
DIGITALOCEAN_APP_PLATFORM=true

# Domain & CORS
ALLOWED_HOSTS=api.vendora.page,vendora.page
CSRF_TRUSTED_ORIGINS=https://api.vendora.page,https://app.vendora.page
PRODUCTION_CORS_ORIGINS=https://app.vendora.page,https://vendora.page

# Database (Neon PostgreSQL)
DATABASE_URL=your-neon-postgres-connection-string

# Telegram Bot Integration
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=VendoraUnifiedBot
TELEGRAM_WEBHOOK_URL=https://api.vendora.page/api/v1/telegram/webhook/
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret

# Frontend & Push Notifications
FRONTEND_URL=https://app.vendora.page
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=admin@vendora.page

# Optional: Error Tracking
SENTRY_DSN=your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Optional: Business Settings
TRIAL_DAYS=14
ORDER_AUTO_EXPIRE_MINUTES=30
```

### Frontend Service (Build-time variables)
```bash
VITE_API_BASE=https://api.vendora.page
VITE_WS_PROTOCOL=wss
VITE_API_HOST=api.vendora.page
```

## 📋 Deployment Steps

### 1. Pre-Deploy Actions
- [ ] Generate strong SECRET_KEY (256-bit random string)
- [ ] Set up Neon PostgreSQL database and get DATABASE_URL
- [ ] Create Telegram bot and get token + username
- [ ] Generate VAPID keys for push notifications (optional)
- [ ] Set up Sentry project for error tracking (optional)

### 2. DigitalOcean App Creation
- [ ] Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
- [ ] Create new app from GitHub repo: `Donsirmuel/Vendora-Unified`
- [ ] Import app spec from `.do/app.yaml`
- [ ] Configure all environment variables above
- [ ] Mark sensitive variables as "Encrypted"

### 3. DNS Configuration (Name.com)
- [ ] Add CNAME: `api.vendora.page` → DigitalOcean app URL
- [ ] Add CNAME: `app.vendora.page` → DigitalOcean app URL
- [ ] Verify DNS propagation (may take 5-10 minutes)

### 4. Post-Deploy Verification
- [ ] Check app health: `https://api.vendora.page/api/v1/health/`
- [ ] Verify frontend loads: `https://app.vendora.page`
- [ ] Test user registration and login flow
- [ ] Configure Telegram webhook: POST to `/api/v1/telegram/webhook/set/`
- [ ] Verify webhook info: GET `/api/v1/telegram/webhook/info/`

### 5. Production Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure Sentry alerts for error rates
- [ ] Document backup and recovery procedures
- [ ] Schedule periodic security updates

## 🚨 Critical Security Notes

1. **Never commit `.env` files** - Use DigitalOcean's encrypted environment variables
2. **Rotate secrets regularly** - Especially after any security incidents
3. **Use strong passwords** - For database, bot tokens, and admin accounts
4. **Enable 2FA** - On DigitalOcean, GitHub, and other service accounts
5. **Monitor logs** - Watch for suspicious activity and error patterns

## 🔄 Update Workflow

1. **Development**: Make changes, test locally
2. **Push to GitHub**: `git push origin main`
3. **Auto-Deploy**: DigitalOcean deploys automatically from main branch
4. **Health Check**: Verify deployment via health endpoint
5. **Rollback**: Use DigitalOcean console if issues detected

## 📞 Emergency Contacts

- **DigitalOcean Support**: https://cloud.digitalocean.com/support
- **Neon Support**: https://console.neon.tech/support  
- **Repository**: https://github.com/Donsirmuel/Vendora-Unified

---

**Last Updated**: October 1, 2025
**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT