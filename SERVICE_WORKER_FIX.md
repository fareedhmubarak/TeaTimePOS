# Service Worker Registration Fix Guide

If you see "Service Worker: Not Registered" in the PWA Diagnostics panel, follow these steps:

## Step 1: Use the "Fix Service Worker" Button

1. Click the **"Fix Service Worker"** button in the PWA Diagnostics panel
2. Wait for the success message
3. **Refresh the page** (Ctrl+R or F5)
4. Wait 10 seconds
5. Click **"Refresh Status"** to check again

## Step 2: Manual Fix via Browser DevTools

If the button doesn't work, try these manual steps:

### Chrome/Edge:

1. Open **DevTools** (F12)
2. Go to **Application** tab
3. Click **Service Workers** in the left sidebar
4. For any registered service workers:
   - Click **Unregister**
5. Click **Clear Storage** in the left sidebar
   - Check all boxes
   - Click **Clear site data**
6. **Close DevTools**
7. **Hard refresh** the page (Ctrl+Shift+R or Ctrl+F5)
8. Wait 10 seconds
9. Check the PWA Diagnostics panel again

### Check Service Worker File Access:

1. Open a new tab
2. Go to: `http://localhost:5175/sw.js`
3. You should see the service worker code
4. If you get a 404 error, the file isn't being served correctly

## Step 3: Verify File Location

The service worker file must be in the `public` folder:
- ✅ `public/sw.js` (correct)
- ❌ `sw.js` (wrong - root folder)

## Step 4: Common Issues

### Issue: "Failed to fetch"
- **Cause**: Service worker file not accessible
- **Fix**: Make sure `public/sw.js` exists and Vite dev server is running

### Issue: "Script error"
- **Cause**: Syntax error in service worker file
- **Fix**: Check browser console for specific error message

### Issue: "Registration failed"
- **Cause**: Browser security restrictions or cache issues
- **Fix**: Clear browser cache and try in incognito mode

### Issue: Service Worker registers but doesn't activate
- **Cause**: Cache conflicts
- **Fix**: Clear all caches using DevTools → Application → Clear Storage

## Step 5: Test in Incognito Mode

Sometimes browser extensions or cache interfere:

1. Open an **Incognito/Private window**
2. Go to `http://localhost:5175`
3. Check if service worker registers there
4. If it works in incognito, the issue is likely cache or extensions

## Still Not Working?

If the service worker still won't register:

1. **Check browser console** (F12) for specific error messages
2. **Check Network tab** - ensure `/sw.js` returns 200 status code
3. **Try a different browser** (Chrome, Edge, or Opera)
4. **Restart the dev server**: Stop (Ctrl+C) and run `npm run dev` again

## After Service Worker is Registered

Once the service worker is registered and active:
1. Wait 30-60 seconds
2. The install option should appear in the browser's 3-dot menu
3. If it doesn't, try:
   - Refreshing the page
   - Interacting with the page (click buttons, navigate)
   - Checking the browser's installability criteria

