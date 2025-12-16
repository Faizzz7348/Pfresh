import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service in production
    if (import.meta.env.PROD) {
      // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
      });
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-4">
          <Card className="max-w-2xl w-full shadow-2xl border-2 border-red-200 dark:border-red-900/50">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
                    Oops! Something went wrong
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Don't worry, this has been logged and we'll look into it
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
                <p className="font-semibold text-red-900 dark:text-red-300 mb-2">
                  Error Details:
                </p>
                <code className="text-sm text-red-800 dark:text-red-400 break-all block">
                  {this.state.error?.toString()}
                </code>
              </div>

              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
                  <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Component Stack (Dev Only)
                  </summary>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-60 mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  <strong>What can you do?</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-400">
                  <li>• Try refreshing the page</li>
                  <li>• Clear your browser cache</li>
                  <li>• Go back to the home page</li>
                  <li>• If problem persists, contact support</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
