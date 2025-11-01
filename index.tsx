import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Register Service Worker for PWA functionality with auto-update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is waiting
                console.log('New service worker available');
                // Dispatch custom event to notify app
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          }
        });
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    
    // Listen for service worker controller changes (when update is activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed - reloading to get update');
      window.location.reload();
    });
  });
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