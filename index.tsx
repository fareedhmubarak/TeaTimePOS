import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Auto-clear ALL caches on every page load to prevent stale cache issues
// This ensures the app always loads fresh code
async function clearAllCachesOnLoad() {
  try {
    // Clear ALL service worker caches - be aggressive about preventing stale cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => {
        console.log('Clearing cache on load:', cacheName);
        return caches.delete(cacheName);
      }));
      console.log('All caches cleared on page load');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// Register Service Worker for PWA functionality with auto-update detection
let registrationAttempted = false;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported in this browser');
    return;
  }
  
  // Prevent multiple registration attempts
  if (registrationAttempted) {
    console.log('Service Worker registration already attempted');
    return;
  }
  registrationAttempted = true;
  
  console.log('Attempting to register service worker at /sw.js');
  
  // Register with update on reload
  navigator.serviceWorker.register('/sw.js', { 
    scope: '/',
    updateViaCache: 'none' // Never use cache for service worker itself
  })
    .then(registration => {
      console.log('✅ ServiceWorker registration successful with scope:', registration.scope);
      
      // Force immediate update check
      registration.update();
      
      // Wait for service worker to be ready
      if (registration.installing) {
        console.log('Service Worker installing...');
        registration.installing.addEventListener('statechange', (e) => {
          const sw = e.target as ServiceWorker;
          if (sw.state === 'activated') {
            console.log('✅ Service Worker activated and ready!');
            // Reload to ensure fresh code
            window.location.reload();
          }
        });
      } else if (registration.waiting) {
        console.log('Service Worker waiting, activating...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      } else if (registration.active) {
        console.log('✅ Service Worker already active!');
        // Force update check
        registration.update();
      }
    })
    .catch(err => {
      console.error('❌ ServiceWorker registration failed:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // Reset flag so user can retry
      registrationAttempted = false;
    });
  
  // Check for updates frequently
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        registration.update();
      }
    }).catch(() => {
      // Ignore errors during update checks
    });
  }, 30000); // Check every 30 seconds
  
  // Listen for service worker updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller changed - reloading to get update');
    window.location.reload();
  });
}

// Global error handler to catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  console.error('Error message:', event.message);
  console.error('Error filename:', event.filename);
  console.error('Error lineno:', event.lineno);
  console.error('Error colno:', event.colno);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent default browser error handling
});

// Clear ALL caches and register service worker when page loads
if ('serviceWorker' in navigator) {
  // Clear all caches first to ensure fresh code, then register service worker
  clearAllCachesOnLoad().then(() => {
    // Wait a bit for cache clearing to complete
    setTimeout(() => {
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', () => {
          setTimeout(registerServiceWorker, 500);
        });
      }
    }, 100);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Wrap render in try-catch to handle initialization errors
try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error: any) {
  console.error('Fatal error during app initialization:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif;">
      <h1 style="color: red;">Fatal Error</h1>
      <p>Failed to initialize the application.</p>
      <pre style="text-align: left; background: #f5f5f5; padding: 10px; overflow: auto;">${error.toString()}</pre>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #6b21a8; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}