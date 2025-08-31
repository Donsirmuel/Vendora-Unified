# Development Guide

## Setting Up Development Environment

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup
1. Navigate to backend directory
2. Create virtual environment: `python -m venv .venv`
3. Activate virtual environment: `.venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run migrations: `python manage.py migrate`
6. Create superuser: `python manage.py createsuperuser`
7. Start server: `python manage.py runserver`

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open browser to `http://localhost:8080`

## API Endpoints

- Authentication: `/api/v1/accounts/`
- Orders: `/api/v1/orders/`
- Rates: `/api/v1/rates/`
- Transactions: `/api/v1/transactions/`

## Testing

Run backend tests: `pytest`
Check test coverage: `pytest --cov`
