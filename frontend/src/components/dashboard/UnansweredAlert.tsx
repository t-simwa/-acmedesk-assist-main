import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnansweredAlertProps {
  count: number;
  questions?: Array<{ query: string; count: number; last_asked: string }>;
  className?: string;
}

export function UnansweredAlert({ count, questions = [], className }: UnansweredAlertProps) {
  const navigate = useNavigate();

  const hasQuestions = Array.isArray(questions) && questions.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        count > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/20",
        className
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            count > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
          )}
        >
          <AlertTriangle
            className={cn(
              "w-5 h-5",
              count > 0 ? "text-amber-500" : "text-emerald-500"
            )}
          />
        </div>
        <div className="flex-1">
          {count > 0 ? (
            <>
              <p className="text-sm font-semibold font-heading text-amber-500">
                {count} question{count > 1 ? "s" : ""} couldn't be answered this week
              </p>
              <p className="text-xs mt-1 font-description text-muted-foreground">
                Add more documents to fill these knowledge gaps and improve your chatbot's responses.
              </p>
              {hasQuestions && (
                <div className="mt-3 space-y-2">
                  {questions.slice(0, 3).map((q) => (
                    <div
                      key={q.query}
                      className="rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {q.query}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{q.count}x</span>
                        <span>{new Date(q.last_asked).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {questions.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{questions.length - 3} more
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => navigate("/dashboard/documents")}
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
              >
                Add documents <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold font-heading text-emerald-500">
                All questions answered
              </p>
              <p className="text-xs mt-1 font-description text-muted-foreground">
                Your chatbot answered 100% of questions in the selected period.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
