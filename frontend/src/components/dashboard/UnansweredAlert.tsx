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
        className
      )}
      style={{ backgroundColor: "#2A1F1A", borderColor: "#3D2A1F" }}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#3D2A1F" }}>
          <AlertTriangle className="w-5 h-5" style={{ color: "#F59E0B" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold font-heading" style={{ color: "#F59E0B" }}>
            {count} question{count > 1 ? "s" : ""} couldn't be answered this week
          </p>
          <p className="text-xs mt-1 font-description" style={{ color: "#9CA3AF" }}>
            Add more documents to fill these knowledge gaps and improve your chatbot's responses.
          </p>
          <button
            onClick={() => navigate("/dashboard/documents")}
            className={cn(
              "inline-flex items-center gap-1 mt-3",
              "text-xs font-medium transition-colors"
            )}
            style={{ color: "#F59E0B" }}
          >
            Add documents <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
