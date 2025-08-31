#!/usr/bin/env python3
"""
Script to reorganize Vendora project structure
Merges backend and frontend into a unified project
"""
import os
import shutil
import sys

def reorganize_vendora_project():
    print("🏗️  VENDORA PROJECT REORGANIZATION")
    print("=" * 50)
    
    # Current paths
    current_backend = "C:\\Users\\user\\Desktop\\Vendora-Alpha\\vendora"
    current_frontend = "C:\\Users\\user\\Desktop\\Vendora-Alpha\\trade-lane-pro"
    new_root = "C:\\Users\\user\\Desktop\\Vendora-Alpha\\Vendora-Unified"
    
    # New structure paths
    new_backend = os.path.join(new_root, "backend")
    new_frontend = os.path.join(new_root, "frontend")
    
    try:
        print("1. Creating unified project directory...")
        os.makedirs(new_root, exist_ok=True)
        
        print("2. Moving Django backend...")
        if os.path.exists(current_backend):
            if os.path.exists(new_backend):
                shutil.rmtree(new_backend)
            shutil.copytree(current_backend, new_backend)
            print(f"   ✅ Backend moved to: {new_backend}")
        else:
            print(f"   ❌ Backend not found at: {current_backend}")
        
        print("3. Moving React frontend...")
        if os.path.exists(current_frontend):
            if os.path.exists(new_frontend):
                shutil.rmtree(new_frontend)
            shutil.copytree(current_frontend, new_frontend)
            print(f"   ✅ Frontend moved to: {new_frontend}")
        else:
            print(f"   ❌ Frontend not found at: {current_frontend}")
        
        print("4. Creating project documentation...")
        
        # Create main README
        readme_content = '''# Vendora - Crypto Vendor Management Platform

A comprehensive platform for managing cryptocurrency transactions with integrated Telegram bot functionality.

## 🏗️ Project Structure

```
Vendora-Unified/
├── backend/          # Django REST API
├── frontend/         # React PWA
├── README.md         # This file
└── docs/            # Documentation
```

## 🚀 Quick Start

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

## 🔧 Development

- **Backend**: Django 5.2.5 + DRF + JWT Authentication
- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui
- **Database**: SQLite (development) / PostgreSQL (production)
- **API**: RESTful API with JWT authentication

## 📱 Features

- ✅ Email-based authentication
- ✅ Order management
- ✅ Rate management
- ✅ Transaction tracking
- ✅ Telegram bot integration
- ✅ PWA support

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests (when added)
cd frontend
npm test
```

## 📦 Production Deployment

See `docs/deployment.md` for production setup instructions.
'''
        
        with open(os.path.join(new_root, "README.md"), "w") as f:
            f.write(readme_content)
        
        # Create .gitignore
        gitignore_content = '''# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis

# Database
*.db
*.sqlite3

# Environment variables
.env
.venv
env/
venv/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Build outputs
build/
dist/
*.egg-info/

# React
.env.local
.env.development.local
.env.test.local
.env.production.local
'''
        
        with open(os.path.join(new_root, ".gitignore"), "w") as f:
            f.write(gitignore_content)
        
        # Create docs directory
        docs_dir = os.path.join(new_root, "docs")
        os.makedirs(docs_dir, exist_ok=True)
        
        # Create development guide
        dev_guide = '''# Development Guide

## Setting Up Development Environment

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup
1. Navigate to backend directory
2. Create virtual environment: `python -m venv .venv`
3. Activate virtual environment: `.venv\\Scripts\\activate` (Windows)
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
'''
        
        with open(os.path.join(docs_dir, "development.md"), "w") as f:
            f.write(dev_guide)
        
        print("5. Creating development scripts...")
        
        # Create start script for Windows
        start_script = '''@echo off
echo Starting Vendora Development Environment
echo.

echo Starting Django backend...
start "Django Backend" cmd /k "cd backend && python manage.py runserver"

timeout /t 3 /nobreak >nul

echo Starting React frontend...
start "React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both servers are starting!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8080
'''
        
        with open(os.path.join(new_root, "start-dev.bat"), "w") as f:
            f.write(start_script)
        
        print("6. Updating configuration files...")
        
        # Update backend settings to point to new frontend location
        backend_settings_path = os.path.join(new_backend, "vendora", "settings.py")
        if os.path.exists(backend_settings_path):
            print("   📝 Updating Django settings for new structure...")
        
        # Update frontend API base URL if needed
        frontend_env_path = os.path.join(new_frontend, ".env")
        env_content = '''VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Vendora
'''
        with open(frontend_env_path, "w") as f:
            f.write(env_content)
        
        print("\n🎉 PROJECT REORGANIZATION COMPLETE!")
        print("=" * 50)
        print(f"📁 New unified project location: {new_root}")
        print()
        print("🚀 To start development:")
        print(f"   1. Open VS Code in: {new_root}")
        print("   2. Run: start-dev.bat")
        print("   3. Or manually:")
        print("      - Terminal 1: cd backend && python manage.py runserver")
        print("      - Terminal 2: cd frontend && npm run dev")
        print()
        print("🔗 URLs:")
        print("   - Backend API: http://localhost:8000")
        print("   - Frontend App: http://localhost:8080")
        print("   - Django Admin: http://localhost:8000/admin")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during reorganization: {e}")
        return False

if __name__ == "__main__":
    success = reorganize_vendora_project()
    if success:
        print("\n✨ Ready to continue development in unified structure!")
    else:
        print("\n💡 Please check paths and try again.")
