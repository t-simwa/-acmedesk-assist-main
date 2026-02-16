import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Icon to display (from lucide-react) */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost" | "secondary";
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost" | "secondary";
  };
  /** Custom illustration component (optional, overrides icon) */
  illustration?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: "py-8",
      icon: "w-12 h-12",
      title: "text-lg",
      description: "text-sm",
    },
    md: {
      container: "py-12",
      icon: "w-16 h-16",
      title: "text-xl",
      description: "text-sm",
    },
    lg: {
      container: "py-16",
      icon: "w-20 h-20",
      title: "text-2xl",
      description: "text-base",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        currentSize.container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div
          className={cn(
            "rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground",
            currentSize.icon
          )}
          aria-hidden="true"
        >
          <Icon className={cn("w-1/2 h-1/2", currentSize.icon)} />
        </div>
      )}

      <h3 className={cn("font-semibold text-foreground mb-2", currentSize.title)}>{title}</h3>

      {description && (
        <p className={cn("text-muted-foreground max-w-md mx-auto mb-6", currentSize.description)}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          {action && (
            <Button onClick={action.onClick} variant={action.variant || "default"}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
