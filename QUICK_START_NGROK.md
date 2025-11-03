# Quick Start: Ngrok for Debugging

## 🚀 Fast Setup (3 Steps)

### Step 1: Start Your Dev Server
Open **Terminal 1** and run:
```bash
npm run dev:5175
```
Wait until you see: `Local: http://localhost:5175/`

### Step 2: Start Ngrok Tunnel
Open **Terminal 2** (keep Terminal 1 running) and run:
```bash
npm run ngrok:5175
```

You'll see output like:
```
✅ Ngrok tunnel established!
🌐 Public URL: https://abc123.ngrok.io
```

### Step 3: Use the URL on Your Tablet/Phone
1. Copy the HTTPS URL from Terminal 2 (e.g., `https://abc123.ngrok.io`)
2. Open this URL on your tablet/phone browser
3. Test your app!

## 📱 Why Use Ngrok?

✅ **No hosting needed** - Test directly from your local machine  
✅ **HTTPS enabled** - Required for Web Serial API and PWA features  
✅ **Access from anywhere** - Use on tablets, phones, or other devices  
✅ **Easy debugging** - Test PWA installation, Bluetooth printing, etc.

## 🔧 Alternative: PowerShell Script (Windows)

```powershell
.\start-ngrok.ps1 5175
```

## ⚠️ Important Notes

- **Keep both terminals open** while testing
- **URL changes** each time you restart ngrok (free account)
- **Public URL** - anyone with the link can access (use for testing only)
- **Press Ctrl+C** to stop ngrok when done

## 🎯 Quick Commands

```bash
# Start dev server on port 5175
npm run dev:5175

# Start ngrok tunnel for port 5175
npm run ngrok:5175

# Check ngrok URL (saved to file)
cat ngrok-url.txt    # Linux/Mac
type ngrok-url.txt   # Windows
```

## 💡 Pro Tips

1. **Get Ngrok Auth Token** (optional but recommended):
   - Sign up at https://dashboard.ngrok.com (free)
   - Get your authtoken
   - Create `.env` file: `NGROK_AUTH_TOKEN=your_token_here`
   - Benefits: Longer sessions, reserved domains

2. **Bookmark the URL**: After starting ngrok, bookmark the URL on your tablet for quick access

3. **Check Console**: Open browser DevTools on your tablet to see console logs

4. **Test PWA**: Install the PWA from the ngrok URL to test on real devices

## 🐛 Troubleshooting

**"Failed to start ngrok"**
- Make sure dev server is running first
- Check internet connection
- Verify port matches (5175)

**"Connection refused"**
- Start dev server BEFORE ngrok
- Check if port 5175 is correct

**Can't access from tablet**
- Make sure both devices are on internet (can be different networks)
- Copy the HTTPS URL exactly (not HTTP)
- Check firewall settings

## 📝 Example Workflow

1. **Start dev server**: `npm run dev:5175`
2. **Start ngrok**: `npm run ngrok:5175` 
3. **Copy URL**: `https://abc123.ngrok.io`
4. **Open on tablet**: Paste URL in tablet browser
5. **Test**: Install PWA, test printing, etc.
6. **Stop**: Press Ctrl+C in ngrok terminal when done

That's it! You're ready to debug without hosting! 🎉


