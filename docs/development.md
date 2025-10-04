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

## Password Reset Smoke Test

1. From the backend shell set a verified sender (for local dev the console backend already prints emails):
	- Ensure `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in `.env.local`.
	- Set `DEFAULT_FROM_EMAIL="Vendora <no-reply@vendora.local>"` for clearer UX.
2. Visit `/auth/password-reset` in the SPA, submit the vendor's login email, and confirm a `200` JSON response.
3. Grab the reset link from the console output, open it in the browser, and choose a new password that satisfies validator rules (minimum length, no simple numeric strings).
4. After submission verify:
	- API returns `204` and the form routes back to the login screen with a success toast.
	- The previous JWT refresh token is revoked (try `POST /api/v1/accounts/token/refresh/` with the old refresh token — it should fail).
5. In the Django admin confirm `accounts.PasswordReset` entries show `used=True` to prevent token replay.

## Push Notification Quickstart

1. Generate a VAPID keypair (once per environment):
	```bash
	npx web-push generate-vapid-keys
	```
	Store the public and private keys as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`; keep the private key secret.
2. Set `VAPID_EMAIL` to an operational contact (`mailto:ops@yourdomain.com`). This value is used in the VAPID claims.
3. Ensure the frontend is served over HTTPS (required by the Push API). For local dev, use `npm run dev -- --https` or a reverse proxy like Caddy.
4. Log in as a vendor, open the notification prompt in the top navigation, and allow push notifications. A subscription record should appear in Django admin under **Notifications → Push subscriptions**.
5. Trigger a real event:
	- Create a new order or respond to a customer query; the backend calls `send_web_push_to_vendor(...)`.
	- Alternatively, hit `POST /api/v1/notifications/test-push/` with a custom title/message.
6. Confirm the browser shows the notification and the service worker console logs `push` reception. If it fails, tail backend logs for `WebPushException`; invalid subscriptions are auto-pruned.
