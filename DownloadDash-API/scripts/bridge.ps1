$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$bridgeRoot = Join-Path $repoRoot "social-media-downloader-api\\whatsapp-bridge"

Set-Location $bridgeRoot
node .\index.js

