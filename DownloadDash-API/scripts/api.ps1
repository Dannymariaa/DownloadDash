$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $repoRoot "social-media-downloader-api"
$apiPython = Join-Path $apiRoot "venv\\Scripts\\python.exe"

Set-Location $apiRoot
if (-not (Test-Path $apiPython)) { throw "Missing Python venv: $apiPython (run: npm run setup)" }

$apiUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($apiUp) { Write-Host "API already running on http://127.0.0.1:8000"; exit 0 }

& $apiPython -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
