@echo off
setlocal
echo ===============================
echo  Vendora Backend-Only Start
echo ===============================

REM Ensure Python venv
if not exist .venv\Scripts\python.exe (
  echo Creating virtual environment...
  py -3 -m venv .venv 2>nul || python -m venv .venv
)
call .venv\Scripts\activate || goto :venv_error

REM Backend deps
echo Installing backend dependencies (quiet)...
pip install -q -r backend\requirements.txt

REM Ensure backend/.env exists
if not exist backend\.env (
  if exist backend\.env.dev.example (
    copy /Y backend\.env.dev.example backend\.env >nul
  ) else if exist backend\.env.prod.example (
    copy /Y backend\.env.prod.example backend\.env >nul
  )
)

REM Frontend deps + build
if not exist frontend\node_modules (
  echo Installing frontend dependencies (one-time)...
  pushd frontend >nul
  npm install
  popd >nul
)
echo Building frontend for Django to serve...
pushd frontend >nul
npm run build
popd >nul

REM Apply migrations and start backend
echo Applying Django migrations...
pushd backend >nul
python manage.py migrate
echo Starting Django (serving built SPA)...
python manage.py runserver
popd >nul

endlocal
goto :eof

:venv_error
echo Failed to activate .venv. Try running in a new PowerShell:
echo   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
exit /b 1
