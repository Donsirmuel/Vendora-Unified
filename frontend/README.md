# Vendora - Crypto Vendor PWA

A professional Progressive Web App for crypto vendors to manage orders, transactions, queries, rates, and broadcast messages to customers via Telegram bot.

## Features

- **Authentication**: JWT-based login with Django backend
- **Dashboard**: Real-time overview of business metrics
- **Orders Management**: Accept/decline customer orders
- **Transactions**: Track and complete transactions with proof uploads
- **Rates Management**: Set buy/sell rates for different cryptocurrencies
- **Customer Queries**: Handle and respond to customer inquiries
- **Broadcast Messages**: Send announcements to all customers via Telegram bot
- **Responsive Design**: Works on all devices (mobile, tablet, desktop)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **State Management**: React Context + React Query
- **Backend**: Django + Django REST Framework
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: SQLite (development) / PostgreSQL (production)
- **Bot Integration**: Telegram Bot API

## Quick Start

### Prerequisites

- Node.js 18+ and npm/bun
- Python 3.8+ and pip
- Django backend running (see backend setup)

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

2. **Environment Configuration**:
   Create `.env` file in the root directory:
   ```env
   VITE_API_BASE=http://127.0.0.1:8000
   VITE_JWT_STORAGE_KEY=vendora_jwt
   # Optional: Banner DM link for upgrades (Telegram handle or any URL)
   VITE_DM_URL=https://t.me/your_username
   ```

3. **Start development server**:
   ```bash
   npm run dev
   # or
   bun run dev
   ```

4. **Open in browser**: http://localhost:5173

### Backend Setup

1. **Navigate to Django project**:
   ```bash
   cd ../vendora
   ```

2. **Activate virtual environment**:
   ```bash
   source .venv/Scripts/activate  # Windows
   # or
   source .venv/bin/activate      # Linux/Mac
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Create test vendor**:
   ```bash
   python manage.py shell -c "
   import django; django.setup()
   from accounts.models import Vendor
   Vendor.objects.create_user(email='test@vendor.com', name='Test Vendor', password='testpass123')
   print('Vendor created: test@vendor.com / testpass123')
   "
   ```

6. **Start Django server**:
   ```bash
   python manage.py runserver
   ```

7. **Configure Telegram bot** (optional):
   - Set `TELEGRAM_BOT_TOKEN` in `.env`
   - Run ngrok: `ngrok http 8000`
   - Set webhook: `curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "{\"url\":\"https://<ngrok-url>/api/v1/telegram/webhook/\"}"`

## Test Credentials

- **Email**: `test@vendor.com`
- **Password**: `testpass123`

## API Endpoints

- **Authentication**: `/api/v1/accounts/token/`
- **Vendor Profile**: `/api/v1/accounts/vendors/me/`
- **Broadcasts**: `/api/v1/accounts/broadcast-messages/`
- **Orders**: `/api/v1/orders/`
- **Transactions**: `/api/v1/transactions/`
- **Rates**: `/api/v1/rates/`
- **Queries**: `/api/v1/queries/`

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── hooks/              # Custom React hooks
├── lib/                # API functions and utilities
│   ├── auth.ts        # Authentication functions
│   ├── broadcast.ts   # Broadcast API
│   ├── http.ts        # HTTP client with JWT
│   ├── orders.ts      # Orders API
│   ├── queries.ts     # Queries API
│   ├── rates.ts       # Rates API
│   └── transactions.ts # Transactions API
├── pages/              # Page components
└── App.tsx            # Main app component
```

### Key Features

- **JWT Authentication**: Automatic token refresh on 401 responses
- **Protected Routes**: Automatic redirect to login for unauthenticated users
- **Real-time Updates**: Live data from Django backend
- **Error Handling**: Comprehensive error messages and user feedback
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Deployment

### Frontend

```bash
npm run build
# or
bun run build
```

### Backend

- Set `DEBUG = False` in Django settings
- Configure production database (PostgreSQL recommended)
- Set up static file serving
- Configure CORS for production domain
- Set secure JWT settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for Vendora platform.
