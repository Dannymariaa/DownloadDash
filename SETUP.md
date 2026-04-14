# DownloadDash - Quick Start Guide

## ✅ Status
The application is now fully working and ready to use!

## 🚀 Getting Started

### Start the Social Downloader API (required)

In a separate terminal:

```bash
cd social-media-downloader-api
npm.cmd run setup
npm.cmd run dev
```

API defaults to `http://127.0.0.1:8000`. The webapp is configured to run locally at `http://localhost:3001`.

### Start the Development Server

Run:

```bash
npm run dev
```

The app will start on:
- `http://localhost:3001`

### API Docs

Open the API docs at:
- `http://127.0.0.1:8000/docs`

### Build for Production

```bash
npm run build
```

The optimized files will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## 📋 Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code quality |
| `npm run typecheck` | Run TypeScript checks |

## 🔧 Port Configuration

The development port is configured in `vite.config.js`:

```javascript
server: {
  host: true,
  port: 3001,
}
```

To change it, edit the `port` value in `vite.config.js` and restart the dev server.

## 🌐 Features

- ✅ Clean, modern UI
- ✅ Responsive design
- ✅ Dark theme
- ✅ Multi-platform support
- ✅ Ready for expansion

## 📦 Dependencies

All required dependencies are installed. Key packages include:

- React 18+
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React Icons

## 🐛 Troubleshooting

### If the app doesn't load:

1. **Clear cache**: 
   ```bash
   Remove-Item -Recurse -Force node_modules/.vite
   npm run dev
   ```

2. **Reinstall dependencies**:
   ```bash
   rm -r node_modules package-lock.json
   npm install
   npm run dev
   ```

3. **Check ports**: Make sure the configured port is not in use
   ```bash
   netstat -ano | findstr :3001
   ```

4. **Try different port**: Edit `vite.config.js` and change the port number

### App showing "Something went wrong"?

- Make sure you're accessing the correct URL
- Check the browser console for errors (F12)
- Try clearing browser cache and refreshing
- Try a different port

## 📱 Next Steps

To expand the app with full functionality:

1. Add routing and pages
2. Integrate API calls
3. Add authentication
4. Implement download functionality
5. Add user dashboard

## 📞 Support

For issues or questions, check:
- Browser console (F12) for errors
- Terminal output for build errors
- vite.config.js for configuration issues

---

**Happy coding! 🎉**
