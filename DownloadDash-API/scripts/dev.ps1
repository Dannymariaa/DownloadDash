param(
  [switch]$NoBridge
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $repoRoot "DownnloadDash-API"
$bridgeRoot = Join-Path $apiRoot "whatsapp-bridge"

$apiPython = Join-Path $apiRoot "venv\\Scripts\\python.exe"

if (-not (Test-Path $apiRoot)) { throw "Missing folder: $apiRoot" }
if (-not (Test-Path $apiPython)) { throw "Missing Python venv: $apiPython (run: npm run setup)" }

& $apiPython -c "import fastapi, uvicorn" > $null 2>&1
if ($LASTEXITCODE -ne 0) { throw "Python dependencies not installed. Run: npm run setup" }

if (-not $NoBridge) {
  if (-not (Test-Path $bridgeRoot)) { throw "Missing folder: $bridgeRoot" }
  if (-not (Test-Path (Join-Path $bridgeRoot "node_modules\\@whiskeysockets\\baileys"))) {
    Write-Host "WhatsApp bridge dependencies missing. Run: cd $bridgeRoot; npm install"
    $NoBridge = $true
  }
  $bridgeUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 3001 -WarningAction SilentlyContinue).TcpTestSucceeded
  if (-not $bridgeUp) {
    Start-Process powershell -ArgumentList @(
      "-NoExit",
      "-Command",
      "Set-Location '$bridgeRoot'; node .\\index.js"
    )
  } else {
    Write-Host "Bridge already running on http://127.0.0.1:3001"
  }
}

$apiUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $apiUp) {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$apiRoot'; & .\\venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
  )
} else {
  Write-Host "API already running on http://127.0.0.1:8000"
}

Write-Host "Opened servers:"
Write-Host "  API:    http://127.0.0.1:8000/docs"
if (-not $NoBridge) { Write-Host "  Bridge: http://127.0.0.1:3001/status" }
