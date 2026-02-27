import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#4F8EF7]/15 text-[#4F8EF7]",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-[#EF4444]/15 text-[#EF4444]",
        outline: "text-foreground border border-border",
        success: "border-transparent bg-[rgba(16,185,129,0.15)] text-[#10B981]",
        warning: "border-transparent bg-[rgba(245,158,11,0.15)] text-[#F59E0B]",
        error: "border-transparent bg-[rgba(239,68,68,0.15)] text-[#EF4444]",
        info: "border-transparent bg-[rgba(79,142,247,0.15)] text-[#4F8EF7]",
        neutral: "border-transparent bg-[rgba(255,255,255,0.08)] text-[#9CA3AF]",
        live: "border-transparent bg-[rgba(16,185,129,0.15)] text-[#10B981]",
        escalated: "border-transparent bg-[rgba(239,68,68,0.15)] text-[#EF4444]",
        active: "border-transparent bg-[rgba(79,142,247,0.15)] text-[#4F8EF7]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
