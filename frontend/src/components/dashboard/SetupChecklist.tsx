/**
 * Setup Checklist Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Card style with proper borders and padding
 * - Progress bar with gradient fill
 * - Responsive design for all devices
 * - Consistent typography patterns
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, ChevronUp, Check, Circle,
  Upload, Bot, Globe, MessageSquare, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { onboardingApi } from "@/lib/api";
import type { DashboardSummary } from "@/lib/api";

interface SetupChecklistProps {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

interface ChecklistTask {
  key: string;
  label: string;
  completed: boolean;
  icon: React.ElementType;
  actionLabel: string;
  action: (() => void) | undefined;
}

export function SetupChecklist({ summary, isLoading }: SetupChecklistProps) {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nexachat_setup_checklist_collapsed") === "true";
  });

  const [completedFlag, setCompletedFlag] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Derive completion states from summary
  const docsUploaded = (summary?.document_count ?? 0) > 0;
  const chatbotConfigured = Boolean(summary?.chatbot_status?.chatbot_name);
  const chatbotInstalled = summary?.chatbot_status?.status !== "not_installed";
  const hasConversations = (summary?.total_conversations ?? 0) > 0;

  const tasks: ChecklistTask[] = [
    {
      key: "create-account",
      label: "Create account",
      completed: true,
      icon: Check,
      actionLabel: "",
      action: undefined,
    },
    {
      key: "upload-documents",
      label: "Upload your first document",
      completed: docsUploaded,
      icon: Upload,
      actionLabel: "Upload Documents",
      action: () => navigate("/dashboard/documents"),
    },
    {
      key: "configure-chatbot",
      label: "Configure your chatbot",
      completed: chatbotConfigured,
      icon: Bot,
      actionLabel: "Configure Chatbot",
      action: () => navigate("/dashboard/chatbot"),
    },
    {
      key: "install-website",
      label: "Install on your website",
      completed: chatbotInstalled,
      icon: Globe,
      actionLabel: "Install Guide",
      action: () => navigate("/dashboard/install"),
    },
    {
      key: "test-with-customer",
      label: "Test with a real customer",
      completed: hasConversations,
      icon: MessageSquare,
      actionLabel: "Open Test Mode",
      action: () => navigate("/dashboard/chatbot?test=1"),
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalSteps = tasks.length;
  const progress = (completedCount / totalSteps) * 100;
  const isAllComplete = completedCount === totalSteps;

  // Handle completion animation and persistence
  useEffect(() => {
    if (!summary) return;
    if (isAllComplete && !completedFlag) {
      setShowConfetti(true);
      
      // Mark onboarding as complete on the backend
      onboardingApi.completeStep(6).catch(() => {
        // ignore errors, not critical
      });
      setCompletedFlag(true);

      // Auto-hide card after 3s
      const timer = window.setTimeout(() => {
        setCollapsed(true);
        try {
          localStorage.setItem("nexachat_setup_checklist_collapsed", "true");
        } catch (_e) {
          // ignore
        }
      }, 3000);
      
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [isAllComplete, completedFlag, summary]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nexachat_setup_checklist_collapsed", next ? "true" : "false");
      } catch (_e) {
        // ignore
      }
      return next;
    });
  }, []);

  // Loading state
  if (isLoading || !summary) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-6 w-6 bg-muted animate-pulse rounded" />
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full bg-muted animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  // All complete and already flagged - hide entirely
  if (isAllComplete && completedFlag && !showConfetti) {
    return null;
  }

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all duration-300",
      isAllComplete 
        ? "border-emerald-500/30 bg-emerald-500/5" 
        : "border-primary/20 bg-primary/5",
    )}>
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              isAllComplete ? "bg-emerald-500/15" : "bg-primary/10",
            )}>
              {isAllComplete ? (
                <Check className="h-5 w-5 text-emerald-500" />
              ) : (
                <Rocket className="h-5 w-5 text-primary" />
              )}
            </div>
            
            {/* Title + Progress text */}
            <div>
              <h3 className="text-sm font-semibold font-heading text-foreground">
                {isAllComplete ? "Setup complete!" : "Complete your setup"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-description">
                {isAllComplete 
                  ? "Your chatbot is ready to go" 
                  : `${completedCount} of ${totalSteps} steps`}
              </p>
            </div>
          </div>
          
          {/* Collapse toggle */}
          {!isAllComplete && (
            <button
              onClick={toggleCollapse}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                "transition-colors",
              )}
              aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isAllComplete 
                  ? "bg-emerald-500" 
                  : "bg-gradient-to-r from-primary to-violet-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground font-description">
              {isAllComplete ? "All steps completed" : "Setup progress"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Checklist items */}
      {!collapsed && !isAllComplete && (
        <div className="border-t border-border/50">
          <div className="divide-y divide-border/50">
            {tasks.map((task) => {
              const isDone = task.completed;

              return (
                <div
                  key={task.key}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 sm:px-5 py-3",
                    "transition-colors",
                    isDone ? "bg-muted/20" : "hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status icon */}
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                      isDone 
                        ? "bg-emerald-500 text-white" 
                        : "border-2 border-muted-foreground/30",
                    )}>
                      {isDone ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />
                      )}
                    </div>
                    
                    {/* Task label */}
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isDone 
                        ? "text-muted-foreground line-through" 
                        : "text-foreground",
                    )}>
                      {task.label}
                    </span>
                  </div>

                  {/* Action button */}
                  {task.action && !isDone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={task.action}
                      className={cn(
                        "h-7 px-2.5 text-xs font-medium shrink-0",
                        "text-primary hover:text-primary hover:bg-primary/10",
                      )}
                    >
                      {task.actionLabel}
                      <ChevronDown className="h-3 w-3 ml-1 rotate-[-90deg]" />
                    </Button>
                  )}
                  
                  {/* Completed indicator */}
                  {isDone && (
                    <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider shrink-0">
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
