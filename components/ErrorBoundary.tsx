import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log to console for debugging
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload(true);
  };

  handleClearCache = async () => {
    // Clear all caches and service workers
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      
      alert('Cache cleared! Reloading...');
      window.location.reload(true);
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache. Please try manually clearing browser cache.');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 p-4">
          <div className="text-2xl font-bold text-red-700 mb-4">Application Error</div>
          <p className="mt-2 text-red-600 text-center mb-4">
            Something went wrong. Please try reloading the application.
          </p>
          {this.state.error && (
            <pre className="mt-2 p-2 bg-red-100 text-red-800 text-xs rounded-md text-left max-w-full overflow-x-auto mb-4">
              {this.state.error.toString()}
              {this.state.error.stack && (
                <div className="mt-2 text-xs">
                  {this.state.error.stack}
                </div>
              )}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Reload Application
          </button>
          <button
            onClick={this.handleClearCache}
            className="mt-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

