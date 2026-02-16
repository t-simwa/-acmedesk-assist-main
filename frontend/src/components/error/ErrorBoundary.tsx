import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = import.meta.env.DEV;
      const errorMessage = this.state.error?.message || "An unexpected error occurred";
      const errorStack = this.state.error?.stack;
      const componentStack = this.state.errorInfo?.componentStack;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl" variant="elevated">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription className="text-base mt-2">
                We encountered an unexpected error. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm font-medium text-foreground mb-1">Error details:</p>
                <p className="text-sm text-muted-foreground font-mono break-words">{errorMessage}</p>
              </div>

              {isDevelopment && (
                <details className="bg-muted/30 rounded-lg border border-border">
                  <summary className="cursor-pointer p-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                    <Bug className="w-4 h-4 inline-block mr-2" />
                    Development Error Details
                  </summary>
                  <div className="p-4 space-y-4 border-t border-border">
                    {errorStack && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Error Stack:</p>
                        <pre className="text-xs text-muted-foreground font-mono bg-background p-3 rounded border border-border overflow-auto max-h-48">
                          {errorStack}
                        </pre>
                      </div>
                    )}
                    {componentStack && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Component Stack:</p>
                        <pre className="text-xs text-muted-foreground font-mono bg-background p-3 rounded border border-border overflow-auto max-h-48">
                          {componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="default" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              <Button onClick={this.handleGoHome} variant="ghost" className="w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
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
