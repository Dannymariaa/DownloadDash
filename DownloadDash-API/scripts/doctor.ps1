$ErrorActionPreference = "Continue"

function Check-Port($port, $name) {
  $result = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
  if ($result.TcpTestSucceeded) {
    Write-Host "[OK]   $name port $port is open"
  } else {
    Write-Host "[FAIL] $name port $port is NOT open"
  }
}

Check-Port 8000 "API"
Check-Port 3001 "Bridge"

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 3
  Write-Host "[OK]   GET /health =>" ($health | ConvertTo-Json -Compress)
} catch {
  Write-Host "[FAIL] GET /health failed:" $_.Exception.Message
}

try {
  $status = Invoke-RestMethod -Uri "http://127.0.0.1:8000/status" -TimeoutSec 3
  Write-Host "[OK]   GET /status => ok"
} catch {
  Write-Host "[FAIL] GET /status failed:" $_.Exception.Message
}

Write-Host "If API is not open, run: npm run setup ثم npm run dev"
