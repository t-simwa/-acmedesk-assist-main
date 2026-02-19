import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpIconProps {
  content: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function HelpIcon({ content, className, side = "top", align = "center" }: HelpIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            "aria-label:Help information",
            className
          )}
          aria-label="Help information"
        >
          <HelpCircle size={16} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
