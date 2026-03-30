import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Register Service Worker for PWA functionality with auto-update detection
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported in this browser');
    return;
  }

  navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none'
  })
    .then(registration => {
      console.log('ServiceWorker registered with scope:', registration.scope);

      // Force update check
      registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Listen for new updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('New Service Worker activated');
            }
          });
        }
      });
    })
    .catch(err => {
      console.error('ServiceWorker registration failed:', err);
    });

  // Periodic update check
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) registration.update();
    }).catch(() => {});
  }, 60000);

  // Listen for controller change (SW swap)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller changed');
  });
}

// Register SW after page loads
if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker);
  }
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