# DownloadDash - YouTube HD/SD Video/Audio Downloader

A modern, fast, and easy-to-use downloader for YouTube videos and audio in HD/SD quality.

## 🚀 Features

- **YouTube focused**: Download videos and audio from YouTube in HD/SD quality
- **No watermarks**: Clean downloads without platform branding
- **Fast downloads**: Optimized for speed and reliability
- **Local storage**: Downloads saved directly to your device
- **PWA ready**: Install as a web app on mobile and desktop
- **Responsive design**: Works perfectly on all devices

## 🛠️ Local Development (Localhost)

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone or download the project
2. Navigate to the project directory:
   ```bash
   cd downloaddash
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit `http://localhost:3001`

### Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Check code quality
- `npm run typecheck` - Run TypeScript checks

## 🌐 Website Deployment

### Build for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. The built files will be in the `dist/` directory

### Deploy to Web Platforms

DownloadDash can be deployed to any static hosting service:

#### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

#### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Other Platforms
- Upload the `dist/` folder to any static hosting service
- Configure the domain in your DNS settings

### Environment Variables

Create a `.env.local` file for local development:
```
VITE_SMD_API_BASE_URL=/api
# Optional (only if the API requires a key):
# VITE_SMD_API_KEY=your_api_key_here

## Testing Checklist

- Single photo post downloads correctly
- Multi-photo album shows all images
- Video posts still work
- Quality selection changes image/video resolution
- Error messages display properly
- Download buttons work for all media types
- Loading states show while resolving
- Invalid URLs show appropriate errors

## Feature Backlog (Optional)

- Batch downloads: download all images in an album as ZIP
- Preview before download: show thumbnail then confirm
- Download progress: show percentage for large files
- Format options: JPG/PNG/WebP selection
- Instagram Stories support (if needed)

## Deployment Considerations

- Environment variables: store API URL in `.env`
- Rate limiting: Instagram may throttle requests, add delays
- Caching: cache resolved URLs to avoid repeated requests
- Logging: monitor which URLs fail vs succeed
- Keep `yt-dlp` updated:
  ```bash
  pip install --upgrade yt-dlp
  ```
```

## 📱 PWA Features

- **Installable**: Add to home screen on mobile devices
- **Offline capable**: Service worker for caching
- **Native app feel**: Standalone display mode
- **Push notifications**: Ready for future enhancements

## 🏗️ Project Structure

```
src/
├── api/           # API integrations
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── lib/           # Utilities and shared logic
├── pages/         # Platform-specific download pages
└── utils/         # Helper functions

public/            # Static assets
├── manifest.json  # PWA manifest
├── sw.js         # Service worker
└── robots.txt    # SEO configuration
```

## 🔧 Configuration

- **Vite**: Fast build tool and dev server
- **React**: UI framework
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
- Railway
- Your own VPS

---

## License

This project is privately owned and developed under the DownloadDash brand.

� 2026 DownloadDash. All rights reserved.
