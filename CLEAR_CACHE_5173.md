# How to Clear Cache on Port 5173

The issue is that port 5173 has cached old code. Here's how to fix it:

## Option 1: Clear Service Worker Cache (Recommended)

1. **Open Chrome DevTools** (F12) on `http://localhost:5173`
2. Go to **Application** tab
3. Click **Service Workers** in the left sidebar
4. Click **Unregister** for any registered service workers
5. Go to **Storage** → **Clear storage**
6. Check "Cache storage" and "Service workers"
7. Click **Clear site data**
8. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)

## Option 2: Use Incognito/Private Window

1. Open a new **Incognito/Private window**
2. Navigate to `http://localhost:5173`
3. This bypasses cache

## Option 3: Stop and Restart Dev Server

1. Stop the dev server on port 5173 (Ctrl+C)
2. Clear the `.vite` cache folder if it exists
3. Restart the dev server: `npm run dev`
4. The server should now use the updated code

## Option 4: Use Port 5175 (Easiest)

Since port 5175 is already working:
- Just use `http://localhost:5175` instead of 5173
- Or stop the server on 5173 and let Vite use 5175 as default

## Verify Fix

After clearing cache, place an order and you should see:
- `=== NEW ORDER PLACED ===` in console
- `=== orderPlacedInfo STATE CHANGED ===` in console
- The "Order Placed!" popup should appear

