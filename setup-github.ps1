# DownloadDash GitHub Setup Script
# This script will help you create a GitHub repository and push your code

Write-Host "🚀 DownloadDash GitHub Setup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if GitHub CLI is installed
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "❌ GitHub CLI not found. Installing..." -ForegroundColor Yellow
    winget install --id GitHub.cli --source winget
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install GitHub CLI. Please install it manually from: https://cli.github.com/" -ForegroundColor Red
        exit 1
    }
}

# Check if user is logged in to GitHub CLI
Write-Host "🔐 Checking GitHub CLI authentication..." -ForegroundColor Yellow
gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to GitHub CLI. Please run: gh auth login" -ForegroundColor Red
    Write-Host "Then re-run this script." -ForegroundColor Yellow
    exit 1
}

# Create the repository
Write-Host "📁 Creating GitHub repository 'DownloadDash'..." -ForegroundColor Yellow
gh repo create DownloadDash --description "Social media downloader with web and mobile apps" --public --source . --remote origin --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Repository created and code pushed successfully!" -ForegroundColor Green
    Write-Host "🌐 Your repository is now live at: https://github.com/$(gh api user -q '.login')/DownloadDash" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create repository. Please check your GitHub CLI authentication." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup complete! Your DownloadDash project is now on GitHub." -ForegroundColor Green