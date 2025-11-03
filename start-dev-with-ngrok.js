/**
 * Combined script to start dev server and ngrok together
 * Usage: node start-dev-with-ngrok.js [port]
 */

import { spawn } from 'child_process';
import ngrok from 'ngrok';
import fs from 'fs';

const port = process.argv[2] || '5175';
const localUrl = `http://localhost:${port}`;

console.log('🚀 Starting development environment...\n');
console.log(`📡 Port: ${port}`);
console.log(`🌐 Local URL: ${localUrl}\n`);

// Start Vite dev server
console.log('1️⃣ Starting Vite dev server...');
const vite = spawn('npm', ['run', 'dev:5175'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit for Vite to start, then start ngrok
setTimeout(async () => {
  console.log('\n2️⃣ Starting ngrok tunnel...');
  
  try {
    const authtoken = process.env.NGROK_AUTH_TOKEN || '';
    const config = {
      addr: parseInt(port),
    };
    
    if (authtoken) {
      config.authtoken = authtoken;
    }
    
    const url = await ngrok.connect(config);
    
    console.log('\n✅ Ngrok tunnel established!');
    console.log(`🌐 Public URL: ${url}`);
    console.log(`🔒 HTTPS enabled (required for Web Serial API)`);
    console.log(`📋 Copy this URL and use it on your tablet/phone`);
    console.log(`\n⚠️  Keep this terminal open while testing`);
    console.log(`\nPress Ctrl+C to stop both dev server and ngrok\n`);
    
    // Save URL to file
    fs.writeFileSync('ngrok-url.txt', url);
    console.log(`📝 URL saved to ngrok-url.txt\n`);
  } catch (error) {
    console.error('❌ Failed to start ngrok:', error.message);
    console.error('\n💡 Ngrok will continue trying...');
    console.error('   You can also start ngrok manually: npm run ngrok:5175\n');
  }
}, 3000); // Wait 3 seconds for Vite to start

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Stopping dev server and ngrok...');
  try {
    await ngrok.disconnect();
    console.log('✅ Ngrok stopped');
  } catch (e) {
    // Ignore errors
  }
  vite.kill();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await ngrok.disconnect();
  } catch (e) {
    // Ignore errors
  }
  vite.kill();
  process.exit(0);
});


