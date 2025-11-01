import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

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
  
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(registration => {
      console.log('✅ ServiceWorker registration successful with scope:', registration.scope);
      console.log('✅ Service Worker registered at:', registration.scope);
      
      // Wait for service worker to be ready
      return registration.update().then(() => {
        if (registration.installing) {
          console.log('Service Worker installing...');
          registration.installing.addEventListener('statechange', (e) => {
            const sw = e.target as ServiceWorker;
            if (sw.state === 'activated') {
              console.log('✅ Service Worker activated and ready!');
            }
          });
        } else if (registration.waiting) {
          console.log('Service Worker waiting...');
        } else if (registration.active) {
          console.log('✅ Service Worker already active!');
        }
      });
    })
    .catch(err => {
      console.error('❌ ServiceWorker registration failed:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // Check if it's a network error
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        console.error('Network error - make sure the dev server is running and sw.js is accessible');
      }
      
      // Reset flag so user can retry
      registrationAttempted = false;
    });
  
  // Check for updates periodically - start checking after a delay to allow initial registration
  setTimeout(() => {
    setInterval(() => {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.update();
        }
      }).catch(() => {
        // Ignore errors during update checks
      });
    }, 60000); // Check every minute
  }, 5000); // Start checking after 5 seconds
  
  // Listen for service worker updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller changed - reloading to get update');
    window.location.reload();
  });
}

// Register service worker when page loads
if ('serviceWorker' in navigator) {
  // Wait for page to be fully loaded
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', () => {
      setTimeout(registerServiceWorker, 1000); // Wait 1 second after load
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);