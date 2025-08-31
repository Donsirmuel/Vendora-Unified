@echo off
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
