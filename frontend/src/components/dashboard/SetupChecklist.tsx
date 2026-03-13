import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { onboardingApi } from "@/lib/api";
import type { DashboardSummary } from "@/lib/api";

interface SetupChecklistProps {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

export function SetupChecklist({ summary, isLoading }: SetupChecklistProps) {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nexachat_setup_checklist_collapsed") === "true";
  });

  const [completedFlag, setCompletedFlag] = useState(false);

  const docsUploaded = (summary?.document_count ?? 0) > 0;
  const chatbotConfigured = Boolean(summary?.chatbot_status?.chatbot_name);
  const chatbotInstalled = summary?.chatbot_status?.status !== "not_installed";
  const hasConversations = (summary?.total_conversations ?? 0) > 0;

  const tasks = [
    {
      key: "create-account",
      label: "Create account",
      completed: true,
      actionLabel: "",
      action: undefined,
    },
    {
      key: "upload-documents",
      label: "Upload your first document",
      completed: docsUploaded,
      actionLabel: "Upload Documents →",
      action: () => navigate("/dashboard/documents"),
    },
    {
      key: "configure-chatbot",
      label: "Configure your chatbot",
      completed: chatbotConfigured,
      actionLabel: "Configure Chatbot →",
      action: () => navigate("/dashboard/chatbot"),
    },
    {
      key: "install-website",
      label: "Install on your website",
      completed: chatbotInstalled,
      actionLabel: "Install Guide →",
      action: () => navigate("/dashboard/install"),
    },
    {
      key: "test-with-customer",
      label: "Test with a real customer",
      completed: hasConversations,
      actionLabel: "Open Test Mode →",
      action: () => navigate("/dashboard/chatbot?test=1"),
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalSteps = tasks.length;
  const progress = (completedCount / totalSteps) * 100;

  useEffect(() => {
    if (!summary) return;
    if (completedCount === totalSteps && !completedFlag) {
      // Mark onboarding as complete on the backend to persist state
      onboardingApi.completeStep(6).catch(() => {
        // ignore errors, not critical
      });
      setCompletedFlag(true);

      // Auto-hide after 3s
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
  }, [completedCount, completedFlag, summary, totalSteps]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nexachat_setup_checklist_collapsed", next ? "true" : "false");
      } catch (_e) {
        // ignore
      }
      return next;
    });
  };

  if (isLoading || !summary) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
        <div className="animate-pulse h-4 w-1/3 bg-white/10 rounded mb-2" />
        <div className="h-2 w-full bg-white/10 rounded" />
      </div>
    );
  }

  if (completedCount === totalSteps && completedFlag) {
    return null;
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <div>
            <div className="text-sm font-heading font-semibold text-foreground">
              Complete your setup
            </div>
            <div className="text-xs text-muted-foreground">
              {completedCount} of {totalSteps} steps
            </div>
          </div>
        </div>
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      <div className="mt-3">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground text-right">
          {Math.round(progress)}%
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {tasks.map((task) => {
            const isDone = task.completed;
            return (
              <div
                key={task.key}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2",
                  isDone ? "bg-white/5" : "bg-white/2",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-5 h-5 flex items-center justify-center rounded-full text-xs", isDone ? "bg-emerald-500 text-white" : "border border-white/20 text-muted-foreground")}>
                    {isDone ? "✓" : ""}
                  </span>
                  <span className={cn("text-sm font-medium", isDone ? "text-muted-foreground" : "text-foreground")}>{task.label}</span>
                </div>

                {task.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={task.action}
                  >
                    {task.actionLabel}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
