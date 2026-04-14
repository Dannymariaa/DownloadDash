@echo off
echo 🚀 DownloadDash GitHub Setup
echo ================================
cd /d "c:\Users\MICHAEL-DAVID\Videos\DownloadDash"

echo 🔍 Checking Git status...
git status --porcelain >nul 2>&1
if errorlevel 1 (
    echo ❌ Not a Git repository. Please run the setup again.
    pause
    exit /b 1
)

echo 📝 Checking if GitHub CLI is installed...
gh --version >nul 2>&1
if errorlevel 1 (
    echo ❌ GitHub CLI not found. Installing...
    winget install --id GitHub.cli --source winget
    if errorlevel 1 (
        echo ❌ Failed to install GitHub CLI.
        echo Please install manually from: https://cli.github.com/
        pause
        exit /b 1
    )
)

echo 🔐 Checking GitHub CLI authentication...
gh auth status >nul 2>&1
if errorlevel 1 (
    echo ❌ Not logged in to GitHub CLI.
    echo Please run: gh auth login
    echo Then re-run this script.
    pause
    exit /b 1
)

echo 📁 Creating GitHub repository 'DownloadDash'...
gh repo create DownloadDash --description "Social media downloader with web and mobile apps" --public --source . --remote origin --push

if errorlevel 1 (
    echo ❌ Failed to create repository.
    echo Please check your GitHub CLI authentication.
    pause
    exit /b 1
)

echo ✅ Repository created and code pushed successfully!
for /f "tokens=*" %%i in ('gh api user -q ".login"') do set USERNAME=%%i
echo 🌐 Your repository is now live at: https://github.com/%USERNAME%/DownloadDash
echo.
echo 🎉 Setup complete! Your DownloadDash project is now on GitHub.
pause