import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#4F8EF7] to-[#7C3AED] text-white rounded-[10px] hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_0_0_3px_rgba(79,142,247,0.3)] active:translate-y-0 active:opacity-85",
        secondary: "bg-transparent border-[1.5px] border-[#4F8EF7] text-[#4F8EF7] rounded-[10px] hover:bg-[#4F8EF7]/10 hover:-translate-y-0.5 hover:shadow-[0_0_0_3px_rgba(79,142,247,0.3)] active:translate-y-0",
        ghost: "bg-transparent border-none text-muted-foreground hover:bg-white/[0.05] rounded-[10px]",
        destructive: "bg-[#EF4444] text-white rounded-[10px] hover:bg-[#EF4444]/90 hover:-translate-y-0.5 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.3)] active:translate-y-0 active:opacity-85",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-[10px]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-4 text-[13px] rounded-[10px]",
        md: "h-10 px-5 text-[14px] rounded-[10px]",
        lg: "h-12 px-7 text-[16px] rounded-[10px]",
        xl: "h-14 px-10 text-[18px] rounded-[10px]",
        icon: "h-10 w-10 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size={16} />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
