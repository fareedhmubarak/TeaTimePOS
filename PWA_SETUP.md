# PWA Setup & Auto-Update Guide

## PWA Installation

The app is now configured as a Progressive Web App (PWA) and can be installed on devices.

### How to Install:

1. **On Desktop (Chrome/Edge)**:
   - Visit the app in your browser
   - Look for the install icon in the address bar
   - Or click the "Install App" card on the home screen (if available)
   - Click "Install" when prompted

2. **On Mobile (Android)**:
   - Open the app in Chrome
   - Tap the menu (3 dots) → "Add to Home screen"
   - Or look for the install banner

3. **On iOS (Safari)**:
   - Open the app in Safari
   - Tap the Share button → "Add to Home Screen"

## Automatic Updates

The app automatically detects when new code is deployed and prompts users to update.

### How Auto-Updates Work:

1. **Check for Updates**: The app checks for service worker updates every 30 seconds
2. **Detect New Version**: When new code is deployed, a new service worker version is detected
3. **Show Notification**: A purple notification appears at the bottom-right: "Update Available"
4. **Update on Click**: Users click "Update" to reload with the new version

### To Trigger Updates When You Push Code:

**Important**: When you deploy new code, update the version number in `public/sw.js`:

```javascript
const APP_VERSION = '1.0.1'; // ← Change this number (e.g., 1.0.2, 1.0.3, etc.)
```

**Steps:**
1. Make your code changes
2. Update `APP_VERSION` in `public/sw.js` (increment the version number)
3. Build and deploy: `npm run build`
4. Deploy the build to your server
5. Users will automatically see the update notification within 30 seconds

### Version Number Format:
- Use semantic versioning: `1.0.1`, `1.0.2`, `1.1.0`, etc.
- Or use date-based: `1.20250101`, `1.20250102`, etc.
- Any change to this number triggers an update detection

### Update Notification:
- Appears at bottom-right corner
- Shows "Update Available" message
- Has "Update" button to reload
- Can be dismissed with X button

## PWA Features Enabled:

✅ Installable on desktop and mobile
✅ Works offline (cached resources)
✅ Fast loading (service worker caching)
✅ Automatic update detection
✅ Update notifications
✅ Standalone app experience

## Development Notes:

- In development (localhost), the service worker doesn't cache JS/TS files to allow hot reloading
- In production, all assets are cached for offline use
- Updates are detected automatically and users are prompted to refresh

