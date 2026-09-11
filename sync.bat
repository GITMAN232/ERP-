@echo off
REM Automatic GitHub Sync Script for Mini ERP + CRM
setlocal enabledelayedexpansion

set MSG=%*
if "%MSG%"=="" set MSG=chore: auto sync update

git add .
git commit -m "%MSG%"
git push origin main
echo Git sync completed successfully!
