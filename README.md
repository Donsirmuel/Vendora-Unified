<p align="center">
  <img src="frontend/public/icons/icon-192.png" width="72" alt="Vendora" />
</p>

# Vendora – Crypto Vendor Platform

Vendora is a platform for independent OTC/P2P crypto vendors. It provides vendor onboarding, order management, rate management, transaction tracking, customer queries, notifications, and Telegram integration in a unified stack.

## Stack
- Backend: Django + Django REST Framework + SimpleJWT
- Frontend: React + TypeScript + Vite (PWA)
- Real-time updates: Server-Sent Events
- Notifications: Web push + Telegram webhook integration

## Core Features
- Vendor accounts with trial gating
- Order lifecycle and status updates
- Vendor rate management
- Transaction and proof workflow
- Customer query handling
- JWT authentication and API throttling

## Key Endpoints
- Health: `/health/`, `/healthz/`
- Stream: `/api/v1/stream/`
- Upgrade: `/api/v1/accounts/upgrade/`


## Documentation
- Operations: `docs/OPERATIONS.md`
- Environment setup: `docs/environment.md`
- Environment checklist: `docs/env-checklist.md`
- Throttling: `docs/throttling.md`
- Deployment scripts/guides: `deployment/`

## License
Proprietary. See `LICENSE`.
