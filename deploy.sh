#!/bin/bash

# DownloadDash Deployment Script
echo "🚀 Building DownloadDash for production..."

# Build the application
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📦 Production files are ready in the 'dist/' directory"
    echo ""
    echo "🌐 To deploy:"
    echo "1. Upload the 'dist/' folder to your web hosting service"
    echo "2. Or use one of these commands:"
    echo ""
    echo "   Vercel: npx vercel --prod"
    echo "   Netlify: npx netlify deploy --prod --dir=dist"
    echo "   Surge: npx surge dist"
    echo ""
    echo "📱 PWA Features:"
    echo "- Installable web app"
    echo "- Offline caching"
    echo "- Native app experience"
    echo ""
    echo "🔧 Environment Variables:"
    echo "Make sure to set VITE_SMD_API_BASE_URL (and optionally VITE_SMD_API_KEY) in your hosting platform"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
