# PWA Install Icon Troubleshooting Guide

## Why Install Icon Might Not Appear

The PWA install icon in the address bar only appears when all of these criteria are met:

### Required Criteria:
1. ✅ **Valid manifest.json** - Must be accessible at `/manifest.json`
2. ✅ **Service Worker registered** - Must be registered and active
3. ✅ **HTTPS or localhost** - Must be served over secure connection
4. ✅ **Valid icons** - Icons must be real PNG images (not placeholders)
5. ✅ **User engagement** - User must have interacted with the site

## Quick Checks

### 1. Check Manifest
Open in browser: `http://localhost:5173/manifest.json`
- Should return valid JSON
- Check that all icon paths exist

### 2. Check Service Worker
Open Chrome DevTools → Application → Service Workers
- Should see "tea-time-pos" service worker registered
- Status should be "activated and is running"

### 3. Check Icons
Open in browser:
- `http://localhost:5173/icons/icon-192x192.png`
- `http://localhost:5173/icons/icon-512x512.png`
- Both should display as images (not broken icons)

### 4. Check Installability
In Chrome DevTools → Application → Manifest:
- Should show "Add to homescreen" as available
- Check for any errors or warnings

## Common Issues

### Issue 1: Icons Are Invalid
**Symptom**: Icons are placeholder files (very small file size)
**Solution**: Replace icon files with actual PNG images:
- Minimum 192x192px and 512x512px
- Valid PNG format
- At least 1KB in size

### Issue 2: Service Worker Not Registered
**Symptom**: No service worker in DevTools
**Solution**: 
- Check browser console for errors
- Verify `sw.js` is accessible at `/sw.js`
- Clear browser cache and reload

### Issue 3: Manifest Not Found
**Symptom**: 404 error for `/manifest.json`
**Solution**:
- Ensure `manifest.json` is in the root `public` folder
- Verify Vite is serving it correctly
- Check network tab in DevTools

### Issue 4: Browser Already Has PWA Installed
**Symptom**: App already installed
**Solution**: 
- Uninstall the existing PWA
- Clear site data
- Reload and try again

## Testing Steps

1. **Open DevTools Console** - Look for PWA-related logs
2. **Check Application Tab**:
   - Manifest → Verify all fields
   - Service Workers → Verify registration
   - Storage → Clear if needed
3. **Test Manifest**: 
   - Visit `/manifest.json` directly
   - Use Chrome's "Add to homescreen" tester
4. **Force Check**:
   - Close all tabs with the app
   - Clear browser cache
   - Reload and wait 5-10 seconds

## Browser-Specific Notes

### Chrome/Edge
- Install icon appears in address bar (next to URL)
- Or click menu (3 dots) → "Install Tea Time POS"
- Check `chrome://flags` for PWA-related flags

### Firefox
- Menu → More tools → "Install Site as App"
- Or use `about:debugging` to verify PWA

### Safari (iOS)
- Share button → "Add to Home Screen"
- No address bar icon (iOS limitation)

## Debugging Commands

Open browser console and run:

```javascript
// Check manifest
fetch('/manifest.json').then(r => r.json()).then(console.log);

// Check service worker
navigator.serviceWorker.getRegistration().then(console.log);

// Check installability
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install prompt available!', e);
});
```

## Manual Install (If Icon Doesn't Appear)

Even if the install icon doesn't appear, you can still install:

1. **Chrome/Edge**: 
   - Click menu (⋮) → "Install Tea Time POS"
   - Or Settings → "Apps" → "Install site as app"

2. **Via Code**:
   - The "Install App" card on home screen should work
   - Click it to trigger the install prompt programmatically

## Verification

After fixing issues:
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Wait 5-10 seconds for service worker to activate
3. Check DevTools → Application → Manifest
4. Look for install icon in address bar or menu

If still not appearing:
- Try incognito mode (fresh browser state)
- Try different browser
- Check if device/browser supports PWA installation

