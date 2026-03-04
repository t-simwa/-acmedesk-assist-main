import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnansweredAlertProps {
  count: number;
  className?: string;
}

export function UnansweredAlert({ count, className }: UnansweredAlertProps) {
  const navigate = useNavigate();

  if (count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        "bg-amber-500/5 border-amber-500/20",
        className
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold font-heading text-amber-500">
            {count} question{count > 1 ? "s" : ""} couldn't be answered this week
          </p>
          <p className="text-xs mt-1 font-description text-muted-foreground">
            Add more documents to fill these knowledge gaps and improve your chatbot's responses.
          </p>
          <button
            onClick={() => navigate("/dashboard/documents")}
            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
          >
            Add documents <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
