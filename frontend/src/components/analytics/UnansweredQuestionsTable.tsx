/**
 * UnansweredQuestionsTable -- 7.3.5
 *
 * Table of unanswered questions with "Add to Knowledge Base" action.
 * Redesigned with proper Tailwind design tokens, mobile card layout,
 * and progressive column disclosure.
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
    return "\u2014";
  }
}

export function UnansweredQuestionsTable({
  data,
  total,
  onAddToKnowledgeBase,
  className,
}: UnansweredQuestionsTableProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold font-heading text-foreground">
            Unanswered Questions
          </h3>
        </div>
        {total > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
            {total} unanswered
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 bg-emerald-500/10">
            <span className="text-lg">&#10003;</span>
          </div>
          <p className="text-sm font-description text-muted-foreground">
            All questions are being answered
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop table (sm+) ────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                    Question
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                    Asked
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">
                    Last Asked
                  </th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className="transition-colors duration-150 hover:bg-muted/50"
                  >
                    {/* Question */}
                    <td className="px-4 sm:px-5 py-3 max-w-[300px]">
                      <p
                        className="font-description truncate text-foreground"
                        title={row.query}
                      >
                        {row.query}
                      </p>
                    </td>

                    {/* Count */}
                    <td className="px-4 sm:px-5 py-3">
                      <span className="font-mono font-semibold text-amber-500">
                        {row.count}&times;
                      </span>
                    </td>

                    {/* Last Asked -- hidden on smaller screens */}
                    <td className="px-4 sm:px-5 py-3 hidden md:table-cell">
                      <span className="text-xs font-description text-muted-foreground">
                        {formatRelativeDate(row.last_asked)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 sm:px-5 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddToKnowledgeBase?.(row)}
                        className="h-7 px-2 text-xs flex items-center gap-1 font-description text-primary hover:text-primary"
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

          {/* ── Mobile card layout (<sm) ───────────────────────────── */}
          <div className="sm:hidden divide-y divide-border/50">
            {data.map((row, i) => (
              <div key={i} className="px-4 py-3.5 space-y-2">
                <p
                  className="font-description text-sm text-foreground line-clamp-2"
                  title={row.query}
                >
                  {row.query}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-amber-500">
                      {row.count}&times; asked
                    </span>
                    <span className="text-xs font-description text-muted-foreground">
                      {formatRelativeDate(row.last_asked)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddToKnowledgeBase?.(row)}
                    className="h-7 px-2 text-xs flex items-center gap-1 font-description text-primary hover:text-primary"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add to KB
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
