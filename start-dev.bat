@echo off
setlocal enabledelayedexpansion
echo ===============================
echo  Vendora Local Dev Bootstrap
echo ===============================
echo.

REM Choose venv location: prefer repo-root .venv if exists, else backend\.venv
set VENV=.venv
if not exist "%VENV%\Scripts\python.exe" (
	set VENV=backend\.venv
)

REM Ensure venv exists
if not exist "%VENV%\Scripts\python.exe" (
	echo Creating Python virtual environment at %VENV% ...
	if exist "%ProgramFiles%\Python311\python.exe" (
		"%ProgramFiles%\Python311\python.exe" -m venv %VENV%
	) else (
		py -3 -m venv %VENV% 2>nul || python -m venv %VENV%
	)
)

REM Activate venv and install backend requirements
call "%VENV%\Scripts\activate" || goto :venv_error
echo Installing/Updating backend dependencies (quiet)...
pip install -q -r backend\requirements.txt

REM Create backend/.env if missing (python-decouple default)
if not exist backend\.env (
	if exist backend\.env.dev.example (
		echo Creating backend/.env from .env.dev.example ...
		copy /Y backend\.env.dev.example backend\.env >nul
	) else (
		if exist backend\.env.prod.example (
			echo Creating backend/.env from .env.prod.example ...
			copy /Y backend\.env.prod.example backend\.env >nul
		) else (
			if exist backend\.env.example (
				echo Creating backend/.env from .env.example ...
				copy /Y backend\.env.example backend\.env >nul
			)
		)
	)
)

REM Apply migrations
echo Applying Django migrations...
pushd backend >nul
python manage.py migrate
popd >nul

REM Install frontend deps if needed
if not exist frontend\node_modules (
	echo Installing frontend dependencies (this may take a moment)...
	pushd frontend >nul
	npm install
	popd >nul
)

REM Start backend server
echo Starting Django backend (http://localhost:8000)...
start "Django Backend" cmd /k "cd backend && call ..\%VENV%\Scripts\activate && python manage.py runserver"

REM Start frontend server
echo Starting React frontend (http://localhost:8080)...
start "React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both servers launching.
echo - Backend:  http://localhost:8000
echo - Frontend: http://localhost:8080
echo - To seed demo data:  seed-demo-data.bat
echo.
endlocal
goto :eof

:venv_error
echo Failed to activate virtual environment at %VENV%\Scripts\activate
echo If PowerShell blocks activation, run this in a new PowerShell first:
echo   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
exit /b 1
