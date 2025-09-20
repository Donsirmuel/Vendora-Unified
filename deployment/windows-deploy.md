## Deploying Vendora-Unified on Windows (no Docker)

If you must host on Windows, use Waitress (WSGI) behind IIS or use NSSM to run Waitress as a service. This guide provides a minimal approach.

1) Install Python and virtualenv.

2) Create a virtual environment and install requirements:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r backend\requirements.txt
```

3) Configure environment variables (System or process-level):
- DJANGO_SETTINGS_MODULE=vendora.settings
- SECRET_KEY=replace-with-secret
- DEBUG=False
- ALLOWED_HOSTS=your.domain.com
- DATABASE_URL=postgres://user:pass@db-host:5432/dbname

4) Run migrations and collect static:
```powershell
cd backend
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

5) Start with Waitress (for testing):
```powershell
pip install waitress
waitress-serve --port=8000 vendora.wsgi:application
```

6) Run as a Windows service with NSSM (recommended for production):
- Download NSSM (Non-Sucking Service Manager)
- Install a service pointing to `C:\path\to\python.exe` with arguments: `C:\path\to\venv\Scripts\waitress-serve --port=8000 vendora.wsgi:application`
- Configure service to run as a dedicated user and set environment variables in the service config.

7) Use IIS as a reverse proxy to the Waitress port (ARR and URL Rewrite):
- Install Application Request Routing
- Add reverse proxy rule to forward requests to http://localhost:8000

Notes
- Windows hosting is acceptable for small deployments but Linux hosting is recommended for performance, tooling, and reliability.
- Ensure proper HTTPS termination via IIS or a load balancer.
