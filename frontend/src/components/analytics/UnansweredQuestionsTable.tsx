/**
 * UnansweredQuestionsTable — 7.3.5
 * Table of unanswered questions with "Add to Knowledge Base" action.
 */

import { PlusCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UnansweredQuestion } from "@/lib/api";

interface UnansweredQuestionsTableProps {
  data: UnansweredQuestion[];
  total: number;
  onAddToKnowledgeBase?: (question: UnansweredQuestion) => void;
  className?: string;
}

function formatRelativeDate(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function UnansweredQuestionsTable({
  data,
  total,
  onAddToKnowledgeBase,
  className,
}: UnansweredQuestionsTableProps) {
  return (
    <div
      className={cn("rounded-xl border overflow-hidden", className)}
      style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#2D333B" }}>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" style={{ color: "#F59E0B" }} />
          <h3 className="text-sm font-semibold font-heading" style={{ color: "#F9FAFB" }}>
            Unanswered Questions
          </h3>
        </div>
        {total > 0 && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
          >
            {total} unanswered
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
          >
            <span className="text-lg">✓</span>
          </div>
          <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>
            All questions are being answered
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #2D333B" }}>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                  Question
                </th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                  Asked
                </th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                  Last Asked
                </th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  className="transition-colors duration-150"
                  style={{
                    borderBottom: i < data.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#252A33")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* Question */}
                  <td className="px-4 sm:px-5 py-3 max-w-[300px]">
                    <p
                      className="font-description truncate"
                      style={{ color: "#F9FAFB" }}
                      title={row.query}
                    >
                      {row.query}
                    </p>
                  </td>

                  {/* Count */}
                  <td className="px-4 sm:px-5 py-3">
                    <span className="font-mono font-semibold" style={{ color: "#F59E0B" }}>
                      {row.count}×
                    </span>
                  </td>

                  {/* Last Asked */}
                  <td className="px-4 sm:px-5 py-3">
                    <span className="text-xs font-description" style={{ color: "#9CA3AF" }}>
                      {formatRelativeDate(row.last_asked)}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 sm:px-5 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddToKnowledgeBase?.(row)}
                      className="h-7 px-2 text-xs flex items-center gap-1 font-description"
                      style={{ color: "#4F8EF7" }}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add to KB
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
