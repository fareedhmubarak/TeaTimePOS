import React, { useState, useEffect } from 'react';

interface PWADiagnosticsProps {
  onInstallClick?: () => void;
  installPromptEvent?: Event | null;
}

const PWADiagnostics: React.FC<PWADiagnosticsProps> = ({ onInstallClick, installPromptEvent }) => {
  const [diagnostics, setDiagnostics] = useState<{
    manifest: boolean;
    serviceWorker: boolean;
    icons: boolean;
    https: boolean;
    installable: boolean;
    errors: string[];
  }>({
    manifest: false,
    serviceWorker: false,
    icons: false,
    https: false,
    installable: false,
    errors: []
  });

  useEffect(() => {
    checkPWAStatus();
    // Recheck when installPromptEvent changes
    const interval = setInterval(() => {
      checkPWAStatus();
    }, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [installPromptEvent]);

  const checkPWAStatus = async () => {
    const errors: string[] = [];
    let manifest = false;
    let serviceWorker = false;
    let icons = false;
    let https = false;
    let installable = false;

    // Check HTTPS or localhost
    https = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!https) {
      errors.push('Not served over HTTPS or localhost');
    }

    // Check manifest
    try {
      const manifestResponse = await fetch('/manifest.json');
      if (manifestResponse.ok) {
        const manifestData = await manifestResponse.json();
        manifest = true;
        
        // Check icons
        if (manifestData.icons && manifestData.icons.length > 0) {
          try {
            const iconResponse = await fetch(manifestData.icons[0].src);
            if (iconResponse.ok) {
              icons = true;
            } else {
              errors.push(`Icon not found: ${manifestData.icons[0].src}`);
            }
          } catch (e) {
            errors.push(`Icon check failed: ${manifestData.icons[0].src}`);
          }
        } else {
          errors.push('No icons defined in manifest');
        }
      } else {
        errors.push('Manifest.json not found (404)');
      }
    } catch (e) {
      errors.push(`Manifest check failed: ${e}`);
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          serviceWorker = true;
        } else {
          errors.push('Service Worker not registered');
        }
      } catch (e) {
        errors.push(`Service Worker check failed: ${e}`);
      }
    } else {
      errors.push('Service Worker not supported in this browser');
    }

    // Check installability
    installable = manifest && serviceWorker && icons && https && !!installPromptEvent;

    // Add note if all technical requirements are met but prompt isn't available
    if (manifest && serviceWorker && icons && https && !installPromptEvent) {
      errors.push('All technical requirements met, but browser install prompt not available. Try manual installation via browser menu.');
    }

    setDiagnostics({
      manifest,
      serviceWorker,
      icons,
      https,
      installable,
      errors
    });
  };

  const getStatusColor = (status: boolean) => status ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (status: boolean) => status ? '✓' : '✗';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">PWA Installation Status</h3>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span>HTTPS/Localhost</span>
          <span className={`font-semibold ${getStatusColor(diagnostics.https)}`}>
            {getStatusIcon(diagnostics.https)} {diagnostics.https ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Manifest.json</span>
          <span className={`font-semibold ${getStatusColor(diagnostics.manifest)}`}>
            {getStatusIcon(diagnostics.manifest)} {diagnostics.manifest ? 'Found' : 'Missing'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Service Worker</span>
          <span className={`font-semibold ${getStatusColor(diagnostics.serviceWorker)}`}>
            {getStatusIcon(diagnostics.serviceWorker)} {diagnostics.serviceWorker ? 'Registered' : 'Not Registered'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Icons</span>
          <span className={`font-semibold ${getStatusColor(diagnostics.icons)}`}>
            {getStatusIcon(diagnostics.icons)} {diagnostics.icons ? 'Valid' : 'Invalid'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Install Prompt Available</span>
          <span className={`font-semibold ${getStatusColor(!!installPromptEvent)}`}>
            {getStatusIcon(!!installPromptEvent)} {installPromptEvent ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold">Overall Status</span>
          <span className={`font-bold text-lg ${getStatusColor(diagnostics.installable)}`}>
            {getStatusIcon(diagnostics.installable)} {diagnostics.installable ? 'Installable' : 'Not Installable'}
          </span>
        </div>
      </div>

      {diagnostics.errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-semibold text-red-800 mb-2">Issues Found:</p>
          <ul className="text-sm text-red-700 space-y-1">
            {diagnostics.errors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={checkPWAStatus}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium"
        >
          Refresh Status
        </button>
        {!diagnostics.serviceWorker && (
          <button
            onClick={async () => {
              if ('serviceWorker' in navigator) {
                try {
                  // First, unregister all existing service workers
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(registrations.map(reg => reg.unregister()));
                  
                  // Clear all caches
                  const cacheNames = await caches.keys();
                  await Promise.all(cacheNames.map(name => caches.delete(name)));
                  
                  // Wait a moment
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Register the service worker
                  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                  
                  console.log('Service Worker registered:', registration);
                  
                  // Wait for activation
                  if (registration.installing) {
                    await new Promise<void>((resolve) => {
                      registration.installing!.addEventListener('statechange', function() {
                        if (this.state === 'activated') {
                          resolve();
                        }
                      });
                    });
                  }
                  
                  alert('✅ Service Worker registered successfully! Please refresh the page, then wait 10 seconds and refresh the status.');
                  setTimeout(checkPWAStatus, 1000);
                } catch (err: any) {
                  const errorMsg = err?.message || 'Unknown error';
                  alert(`❌ Failed to register service worker:\n\n${errorMsg}\n\nCheck the browser console (F12) for more details.`);
                  console.error('Service Worker registration error:', err);
                }
              } else {
                alert('Service Workers are not supported in this browser.');
              }
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
          >
            Fix Service Worker
          </button>
        )}
        {onInstallClick && (
          <button
            onClick={onInstallClick}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              installPromptEvent
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {installPromptEvent ? 'Install Now' : 'Show Instructions'}
          </button>
        )}
      </div>

      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg">
        <p className="text-base font-bold text-blue-900 mb-3">📱 Manual Installation Guide</p>
        <div className="text-sm text-blue-800 space-y-4">
          <div className="bg-white p-3 rounded-md border border-blue-200">
            <strong className="text-blue-900 block mb-2">🖥️ Chrome/Edge Desktop:</strong>
            <ol className="list-decimal list-inside ml-2 space-y-1 text-blue-700">
              <li>Click the <strong className="text-blue-900">3-dot menu (⋮)</strong> in the top right corner of your browser</li>
              <li><strong>IMPORTANT:</strong> Scroll down in the menu - the install option might be below "Cast" or "More tools"</li>
              <li>Look for one of these options:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><strong>"Install Tea Time POS"</strong></li>
                  <li><strong>"Install app"</strong></li>
                  <li><strong>"Install Tea Shop POS"</strong></li>
                </ul>
              </li>
              <li>If you don't see it, try:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Clear browser cache and reload</li>
                  <li>Make sure you're on <code className="bg-gray-100 px-1 rounded">localhost:5175</code></li>
                  <li>Wait 30 seconds after page load for service worker to activate</li>
                </ul>
              </li>
            </ol>
          </div>
          <div className="bg-white p-3 rounded-md border border-blue-200">
            <strong className="text-blue-900 block mb-2">📱 Android Chrome:</strong>
            <ol className="list-decimal list-inside ml-2 space-y-1 text-blue-700">
              <li>Tap the <strong className="text-blue-900">3-dot menu (⋮)</strong> in the top right</li>
              <li>Look for <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
              <li>Tap it and confirm</li>
              <li>Alternatively, check the address bar for an install icon (⬇️)</li>
            </ol>
          </div>
          <div className="bg-white p-3 rounded-md border border-blue-200">
            <strong className="text-blue-900 block mb-2">🍎 iOS Safari:</strong>
            <ol className="list-decimal list-inside ml-2 space-y-1 text-blue-700">
              <li>Tap the <strong className="text-blue-900">Share button</strong> (square with arrow pointing up) at the bottom</li>
              <li>Scroll down in the share menu</li>
              <li>Tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> in the top right corner</li>
            </ol>
          </div>
          {!diagnostics.serviceWorker && (
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-300">
              <p className="text-yellow-800 font-semibold mb-2">⚠️ Service Worker Not Registered</p>
              <p className="text-yellow-700 text-xs mb-2">
                This prevents the install option from appearing. Follow these steps:
              </p>
              <ol className="text-yellow-700 text-xs list-decimal list-inside space-y-1 ml-2">
                <li>Click the <strong className="text-yellow-900">"Fix Service Worker"</strong> button above</li>
                <li>Wait for the success message</li>
                <li><strong>Refresh the page</strong> (F5 or Ctrl+R)</li>
                <li>Wait 10 seconds</li>
                <li>Click <strong>"Refresh Status"</strong> to verify</li>
                <li>Check the browser's 3-dot menu for install option</li>
              </ol>
              <p className="text-yellow-600 text-xs mt-2 italic">
                💡 If it still fails, open DevTools (F12) → Console tab to see the specific error message.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWADiagnostics;

