import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
  info: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
}

/**
 * Global React error boundary to catch render/runtime errors in subtree.
 * Provides a reset mechanism and minimal telemetry hook (console log now; extend to Sentry later).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ info });
    // Replace with real telemetry (Sentry) if DSN configured
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      const fallback = this.props.fallback;
      if (fallback) {
        if (typeof fallback === 'function') return (fallback as any)(error, this.reset);
        return fallback;
      }
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
          <div className="max-w-sm space-y-4">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground break-words">
              {error.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.reset}
                className="px-4 py-1.5 text-sm rounded border bg-background hover:bg-accent transition"
              >Retry</button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 text-sm rounded border bg-background hover:bg-accent transition"
              >Reload</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
