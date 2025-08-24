@echo off
REM collect.cmd - Windows wrapper to run the collect-icons CLI
REM Usage: collect.cmd [--srcDir <path>] [--outFile <file>] [--exportFolderName <name>] [--mode <bare|prefixed|absolute>] [--verbose]
SETLOCAL ENABLEDELAYEDEXPANSION

REM Directory of this script (with trailing backslash)
SET SCRIPT_DIR=%~dp0

REM Try compiled JS first: ../dist/index.js
IF EXIST "%SCRIPT_DIR%..\dist\index.js" (
  node "%SCRIPT_DIR%..\dist\index.js" %*
  EXIT /B %ERRORLEVEL%
)

REM If no compiled build, try running TypeScript directly via npx ts-node (will fetch if not present)
echo "Compiled binary not found; attempting to run via npx ts-node (may download if not present)"
npx ts-node "%SCRIPT_DIR%collect.ts" %*
IF %ERRORLEVEL%==0 (
  EXIT /B 0
)

REM Final fallback: try node with ts-node/register (requires ts-node installed locally)
echo "npx ts-node failed; attempting node -r ts-node/register"
node -r ts-node/register "%SCRIPT_DIR%collect.ts" %*
EXIT /B %ERRORLEVEL%
