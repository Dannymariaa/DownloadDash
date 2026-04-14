# DownloadDash - GitHub Setup

## 🚀 Automated Setup

Your DownloadDash project is ready to be connected to GitHub! Choose one of the automated methods below:

### Option 1: PowerShell Script (Recommended)
1. Open PowerShell as Administrator
2. Navigate to your project folder:
   ```powershell
   cd "c:\Users\MICHAEL-DAVID\Videos\DownloadDash"
   ```
3. Run the setup script:
   ```powershell
   .\setup-github.ps1
   ```

### Option 2: Batch Script
1. Double-click `setup-github.bat` in your project folder
2. Follow the on-screen instructions

## 🔐 First Time Setup
If you haven't used GitHub CLI before, you'll need to authenticate:
```bash
gh auth login
```
Choose "GitHub.com" and follow the browser authentication process.

## 📋 What the Script Does
- ✅ Installs GitHub CLI (if not already installed)
- ✅ Authenticates with your GitHub account
- ✅ Creates a public repository named "DownloadDash"
- ✅ Pushes all your code to GitHub
- ✅ Sets up the remote origin

## 🎯 Manual Alternative
If the automated script doesn't work, follow these manual steps:

1. Go to https://github.com/new
2. Create repository: `DownloadDash`
3. Description: `Social media downloader with web and mobile apps`
4. Make it Public
5. Don't add README/.gitignore/license
6. Run these commands:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/DownloadDash.git
   git branch -M main
   git push -u origin main
   ```

## 📁 Your Project Structure
- 🌐 Web App (React + Vite)
- 📱 Mobile App (Expo React Native)
- 🔧 API Server (FastAPI + Python)
- 📊 AdMob Integration
- 📖 Complete Documentation

Your repository will be live at: `https://github.com/YOUR_USERNAME/DownloadDash`