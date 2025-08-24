@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem One-click: git init (if needed) -> add -> commit -> push

rem Ensure Git is available
git --version >NUL 2>&1
if errorlevel 1 (
  echo [ERROR] Git is not installed or not in PATH.
  echo Install Git from https://git-scm.com/downloads and try again.
  pause
  exit /b 1
)

rem Run from the folder this script lives in
cd /d "%~dp0"

rem Detect if we're already inside a repo
git rev-parse --is-inside-work-tree >NUL 2>&1
if errorlevel 1 (
  echo [INFO] No Git repository detected. Initializing...
  rem Prefer init with main as default branch (Git 2.28+)
  git init -b main >NUL 2>&1
  if errorlevel 1 (
    git init || (echo [ERROR] git init failed. & pause & exit /b 1)
    git branch -M main
  )
)

rem Ensure we're on branch "main"
for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD 2^>NUL') do set CURBR=%%b
if not defined CURBR set CURBR=main
if /I not "%CURBR%"=="main" (
  echo [INFO] Switching to main...
  git checkout -B main || (echo [ERROR] Failed to switch/create branch main. & pause & exit /b 1)
)

rem Ensure remote "origin" exists
git remote get-url origin >NUL 2>&1
if errorlevel 1 (
  echo [INFO] No 'origin' remote found.
  set "DEFAULT_REMOTE=https://github.com/belisario-afk/spoti.git"
  echo Use default remote (%DEFAULT_REMOTE%) ? [Y/n]:
  set /p ANSWER=
  if /I "%ANSWER%"=="n" (
    set /p REMOTE_URL=Enter remote URL (e.g., https://github.com/USER/REPO.git): 
  ) else (
    set "REMOTE_URL=%DEFAULT_REMOTE%"
  )
  git remote add origin "%REMOTE_URL%" || (echo [ERROR] Failed to add remote. & pause & exit /b 1)
)

rem Stage all changes (new/modified/deleted)
git add -A

rem If nothing is staged, skip commit
git diff --cached --quiet
if not errorlevel 1 (
  echo [INFO] No changes to commit.
) else (
  rem Use passed arguments as commit message, otherwise prompt
  set "MSG=%*"
  if "%MSG%"=="" (
    set /p MSG=Commit message [Auto commit]: 
    if "%MSG%"=="" set "MSG=Auto commit"
  )
  git commit -m "%MSG%" || (echo [ERROR] Commit failed. & pause & exit /b 1)
)

rem Push: set upstream on first push
git rev-parse --abbrev-ref --symbolic-full-name @{u} >NUL 2>&1
if errorlevel 1 (
  echo [INFO] First push to origin/main (setting upstream)...
  git push -u origin main || (echo [ERROR] Push failed. Check your credentials/permissions. & pause & exit /b 1)
) else (
  git push || (echo [ERROR] Push failed. Check your credentials/permissions. & pause & exit /b 1)
)

echo [DONE] All set.
pause
endlocal