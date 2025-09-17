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

### Transaction Lifecycle & Completion Rules

Transaction statuses:

| Status | Meaning | Allowed Next |
|--------|---------|--------------|
| uncompleted | Created; awaiting action | completed, declined, expired |
| completed | Fully settled (timestamps set) | (terminal) |
| declined | Vendor declined; trade not proceeding | (terminal) |
| expired | Auto-expired based on TTL | (terminal) |

Declined transactions are immutable: attempting to call `POST /api/v1/transactions/{id}/complete/` on a declined transaction returns HTTP 400.

`POST /api/v1/transactions/{id}/complete/` body fields:
* `status`: `completed` or `declined` (required)
* `proof`: optional file upload stored in `proof`
* `vendor_proof`: optional file upload stored separately in `vendor_proofs/`

If `status=completed` the endpoint stamps `vendor_completed_at` (and `completed_at` if not already set) and may update the parent order to completed when appropriate.


## Testing

Run backend tests: `pytest`
Check test coverage: `pytest --cov`
