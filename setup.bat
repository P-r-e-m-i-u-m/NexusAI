@echo off
setlocal enabledelayedexpansion

echo  _   _                   _    ___
echo  ^| \ ^| ^| _____  ___   _ _/ \  ^|_ _^|
echo  ^|  \^| ^|/ _ \ \/ / ^| ^| / _ \  ^| ^|
echo  ^| ^|\  ^|  __/^>  ^<^| ^|_^| / ___ \ ^| ^|
echo  ^|_^| \_^|\___/_/\_\__,_/_/   \_\___^|
echo.
echo   Unified AI Agent Platform - Setup
echo.

where docker >nul 2>&1 || (echo ERROR: Docker is required. Install from https://docker.com & pause & exit /b 1)

if not exist .env (
    copy .env.example .env >nul
    echo Created .env from .env.example
    echo Please edit .env and add your NVIDIA_API_KEY then re-run.
    notepad .env
    pause & exit /b 0
)

echo Starting NexusAI...
docker compose up -d --build

echo Waiting for services...
timeout /t 15 /nobreak >nul

echo.
echo  NexusAI is ready!
echo.
echo   Dashboard:  http://localhost:3000
echo   API Docs:   http://localhost:8000/docs
echo   Grafana:    http://localhost:3001
echo.
pause
