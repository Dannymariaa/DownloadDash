$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $repoRoot "DownnloadDash-API"
$venvDir = Join-Path $apiRoot "venv"
$venvPython = Join-Path $venvDir "Scripts\\python.exe"
$requirements = Join-Path $apiRoot "requirements.txt"

if (-not (Test-Path $apiRoot)) { throw "Missing folder: $apiRoot" }
if (-not (Test-Path $requirements)) { throw "Missing file: $requirements" }

if (-not (Test-Path $venvPython)) {
  Write-Host "Creating venv at $venvDir"
  python -m venv $venvDir
}

Write-Host "Upgrading pip"
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed ($LASTEXITCODE)" }

Write-Host "Installing Python dependencies"
& $venvPython -m pip install --upgrade -r $requirements
if ($LASTEXITCODE -ne 0) { throw "pip install failed ($LASTEXITCODE). Try: $venvPython -m pip install -r $requirements" }

Write-Host "Setup complete. Start with: npm run dev"
