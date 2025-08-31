# Vendora-Unified

# Vendora - Crypto Vendor Management Platform

A comprehensive platform for managing cryptocurrency transactions with integrated Telegram bot functionality.

## Project Structure

```
Vendora-Unified/
├── backend/          # Django REST API
├── frontend/         # React PWA
├── README.md         # This file
└── docs/            # Documentation
```

## Quick Start

### Backend (Django)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## Development

- Backend: Django 5.2.5 + DRF + JWT Authentication
- Frontend: React 18 + TypeScript + Vite + shadcn/ui
- Database: SQLite (development) / PostgreSQL (production)
- API: RESTful API with JWT authentication

## Features

- Email-based authentication
- Order management
- Rate management
- Transaction tracking
- Telegram bot integration
- PWA support

## Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests (when added)
cd frontend
npm test
```
