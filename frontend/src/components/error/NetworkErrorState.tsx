import React from "react";
import { WifiOff, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface NetworkErrorStateProps {
  /** The error object */
  error: Error | ApiError | null;
  /** Function to retry the failed operation */
  onRetry?: () => void;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Whether the retry is in progress */
  isRetrying?: boolean;
  /** Additional className */
  className?: string;
  /** Compact variant for smaller spaces */
  variant?: "default" | "compact" | "inline";
}

export function NetworkErrorState({
  error,
  onRetry,
  title,
  description,
  isRetrying = false,
  className,
  variant = "default",
}: NetworkErrorStateProps) {
  // Determine error type
  const errorType =
    error && typeof error === "object" && "errorType" in error
      ? (error as ApiError).errorType
      : "unknown";

  // Get appropriate icon and message based on error type
  const getErrorDetails = () => {
    switch (errorType) {
      case "network":
        return {
          icon: WifiOff,
          defaultTitle: "Connection Error",
          defaultDescription:
            "Unable to connect to the server. Please check your internet connection and try again.",
        };
      case "timeout":
        return {
          icon: Clock,
          defaultTitle: "Request Timeout",
          defaultDescription:
            "The request took too long to complete. Please check your connection and try again.",
        };
      case "rate_limit":
        return {
          icon: AlertCircle,
          defaultTitle: "Rate Limit Exceeded",
          defaultDescription:
            "Too many requests. Please wait a moment before trying again.",
        };
      case "server_error":
        return {
          icon: AlertCircle,
          defaultTitle: "Server Error",
          defaultDescription:
            "The server encountered an error. Please try again in a moment.",
        };
      default:
        return {
          icon: AlertCircle,
          defaultTitle: "Network Error",
          defaultDescription:
            error?.message ||
            "An error occurred while loading data. Please try again.",
        };
    }
  };

  const { icon: Icon, defaultTitle, defaultDescription } = getErrorDetails();
  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg", className)}>
        <Icon className="w-5 h-5 text-destructive flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{displayTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">{displayDescription}</p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-2" />
                Retry
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-destructive" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{displayTitle}</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-sm">{displayDescription}</p>
        {onRetry && (
          <Button onClick={onRetry} disabled={isRetrying} variant="outline" size="sm">
            {isRetrying ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-2" />
                Retry
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Default variant (card)
  return (
    <Card className={cn("w-full max-w-md mx-auto", className)} variant="elevated">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-destructive" aria-hidden="true" />
        </div>
        <CardTitle>{displayTitle}</CardTitle>
        <CardDescription className="mt-2">{displayDescription}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardFooter className="justify-center">
          <Button onClick={onRetry} disabled={isRetrying} variant="default" className="w-full sm:w-auto">
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
