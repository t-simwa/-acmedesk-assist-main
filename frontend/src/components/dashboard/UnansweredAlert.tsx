/**
 * Unanswered Questions Alert Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Alert card styling with proper colors
 * - Question list with counts
 * - Success state when no unanswered questions
 * - Responsive design
 */

import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UnansweredAlertProps {
  count: number;
  questions?: Array<{ query: string; count: number; last_asked: string }>;
  className?: string;
}

export function UnansweredAlert({ count, questions = [], className }: UnansweredAlertProps) {
  const navigate = useNavigate();

  const hasQuestions = Array.isArray(questions) && questions.length > 0;
  const hasUnanswered = count > 0;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-200",
        hasUnanswered 
          ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30" 
          : "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30",
        className
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0",
            hasUnanswered ? "bg-amber-500/10" : "bg-emerald-500/10",
          )}>
            {hasUnanswered ? (
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {hasUnanswered ? (
              <>
                {/* Warning header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <h3 className="text-sm sm:text-base font-semibold font-heading text-amber-500">
                    {count} Unanswered Question{count > 1 ? "s" : ""} This Week
                  </h3>
                </div>
                
                <p className="text-xs sm:text-sm font-description text-muted-foreground mb-4">
                  Your chatbot couldn't answer these questions. Add relevant documents to fill these knowledge gaps.
                </p>
                
                {/* Questions list */}
                {hasQuestions && (
                  <div className="space-y-2 mb-4">
                    {questions.slice(0, 3).map((q, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3",
                          "bg-card/50 border-border/50",
                        )}
                      >
                        <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {q.query}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-amber-500 font-medium">
                              {q.count}x
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Last asked: {new Date(q.last_asked).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {questions.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-7">
                        + {questions.length - 3} more unanswered questions
                      </p>
                    )}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate("/dashboard/documents")}
                    className="h-8 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Add Documents to Fix This</span>
                    <span className="sm:hidden">Add Documents</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/dashboard/analytics?tab=questions&filter=unanswered")}
                    className="h-8 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                  >
                    View Full Report <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Success state */}
                <h3 className="text-sm sm:text-base font-semibold font-heading text-emerald-500 mb-1">
                  All Questions Answered
                </h3>
                <p className="text-xs sm:text-sm font-description text-muted-foreground">
                  Your chatbot answered 100% of questions this week. Great knowledge base coverage!
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
