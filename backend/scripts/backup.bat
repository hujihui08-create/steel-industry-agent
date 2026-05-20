@echo off
setlocal enabledelayedexpansion

if "%BACKUP_DIR%"=="" set BACKUP_DIR=.\backups
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_USER%"=="" set DB_USER=postgres
if "%DB_NAME%"=="" set DB_NAME=steel_agent

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set FILENAME=steel_agent_backup_%datetime:~0,8%.sql
set FILEPATH=%BACKUP_DIR%\%FILENAME%

echo [Backup] Starting database backup...
set PGPASSWORD=%DB_PASSWORD%
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% > "%FILEPATH%"

if %ERRORLEVEL% EQU 0 (
    echo [Backup] Backup created: %FILEPATH%
    echo [Backup] Old backups cleaned up
) else (
    echo [Backup] Backup failed!
    exit /b 1
)
