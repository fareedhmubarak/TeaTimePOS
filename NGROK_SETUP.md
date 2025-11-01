# Ngrok Setup Guide

This project uses ngrok to expose your local development server to the internet, allowing you to test on real devices (tablets, phones) via a public URL.

## Quick Start

### Option 1: Using npm scripts (Recommended)

1. **Start your dev server** (in one terminal):
   ```bash
   npm run dev
   # or if you need port 5175:
   npm run dev:5175
   ```

2. **Start ngrok tunnel** (in another terminal):
   ```bash
   npm run ngrok
   # or for port 5175:
   npm run ngrok:5175
   ```

3. **Copy the public URL** from the ngrok output and use it on your tablet/phone!

### Option 2: Using standalone ngrok

If you prefer to use standalone ngrok:

1. Download ngrok from https://ngrok.com/download
2. Extract and add to your PATH
3. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
4. Run: `ngrok config add-authtoken YOUR_TOKEN`
5. Start tunnel: `ngrok http 5173`

## Features

- ✅ **HTTPS by default** - Ngrok provides HTTPS, which is required for Web Serial API
- ✅ **Public URL** - Accessible from anywhere on the internet
- ✅ **Web Serial API works** - HTTPS enables Web Serial API on tablets
- ✅ **Easy testing** - Test on real devices without deploying

## Port Configuration

The default Vite port is `5173`, but if it's busy, Vite will use `5175` or another port.

- `npm run ngrok` - Tunnels default port (usually 5173)
- `npm run ngrok:5175` - Explicitly tunnel port 5175

## Using the Public URL

1. Start dev server: `npm run dev`
2. Start ngrok: `npm run ngrok` (in another terminal)
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Open this URL on your tablet/phone
5. Test printing with Web Serial API! (should work over HTTPS)

## Environment Variables (Optional)

For persistent URLs or custom domains (paid ngrok accounts):

1. Create a `.env` file in the project root:
   ```
   NGROK_AUTH_TOKEN=your_ngrok_authtoken_here
   ```

2. Or set subdomain in `ngrok.js`:
   ```javascript
   subdomain: 'your-subdomain',
   ```

## Testing Web Serial API Over Ngrok

Since ngrok provides HTTPS, Web Serial API should work on:
- ✅ Desktop Chrome/Edge/Opera
- ✅ Android Chrome (better support over HTTPS)
- ❌ iOS Safari (still not supported, but HTTPS helps)

## Troubleshooting

### "Failed to start ngrok"
- Make sure your dev server is running first
- Check your internet connection
- Verify the port is correct (check Vite output)

### "Connection refused"
- Start the dev server before starting ngrok
- Make sure the port matches (5173 or 5175)

### Web Serial API still not working
- HTTPS is required - ngrok provides this automatically
- Make sure you're using Chrome/Edge/Opera
- Check browser console for Web Serial API support

### URL changes every time
- Free ngrok accounts get random URLs
- Get a paid ngrok account for persistent URLs
- Or use ngrok authtoken for reserved domains

## Ngrok URL File

The public URL is automatically saved to `ngrok-url.txt` for easy access.

## Security Note

⚠️ **Important**: The ngrok URL is public and accessible to anyone who knows it. Only use it for development/testing, not for production.

For production, deploy to a proper hosting service (Vercel, Netlify, etc.).

## Stopping Ngrok

Press `Ctrl+C` in the terminal running ngrok, or close the terminal window.

## Alternative: ngrok CLI

If you prefer the CLI directly:

```bash
# Install globally
npm install -g ngrok

# Start tunnel
ngrok http 5173
```

But the npm script (`npm run ngrok`) is easier and integrated with the project.

