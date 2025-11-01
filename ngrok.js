/**
 * Ngrok Tunnel Script
 * Exposes local Vite dev server to the internet via ngrok
 * 
 * Usage:
 *   npm run ngrok        - Start ngrok tunnel (default port 5173)
 *   npm run ngrok:5175   - Start ngrok tunnel on port 5175
 */

import ngrok from 'ngrok';
import fs from 'fs';

// Get port from command line argument or use default
const port = process.argv[2] || '5173';
const localUrl = `http://localhost:${port}`;

console.log('🚀 Starting ngrok tunnel...');
console.log(`📡 Local server: ${localUrl}`);

// Start ngrok tunnel
(async function() {
  try {
    // Try to get authtoken from environment or config
    let authtoken = process.env.NGROK_AUTH_TOKEN || '';
    
    // If no authtoken, ngrok will try without it (may work for basic usage)
    const config = {
      addr: parseInt(port),
    };
    
    // Only add authtoken if provided
    if (authtoken) {
      config.authtoken = authtoken;
    }
    
    // Try connecting
    const url = await ngrok.connect(config);
    
    console.log('\n✅ Ngrok tunnel established!');
    console.log(`🌐 Public URL: ${url}`);
    console.log(`🔒 HTTPS enabled (required for Web Serial API)`);
    console.log('\n📋 Copy this URL and use it on your tablet/phone to test');
    console.log(`\n⚠️  Keep this terminal open while testing`);
    console.log(`\nPress Ctrl+C to stop ngrok\n`);
    
    // Save URL to file for easy access
    fs.writeFileSync('ngrok-url.txt', url);
    console.log(`📝 URL saved to ngrok-url.txt\n`);
  } catch (error) {
    console.error('❌ Failed to start ngrok:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Your local dev server is running on port', port);
    console.error('   2. You have internet connection');
    console.error('   3. If using authtoken, set NGROK_AUTH_TOKEN in .env file');
    process.exit(1);
  }
})();

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping ngrok tunnel...');
  ngrok.disconnect().then(() => {
    console.log('✅ Ngrok tunnel stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  ngrok.disconnect().then(() => {
    process.exit(0);
  });
});

