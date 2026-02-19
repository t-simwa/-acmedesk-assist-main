import { cn } from "@/lib/utils";

interface HelpTextProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function HelpText({ children, className, id }: HelpTextProps) {
  return (
    <p
      id={id}
      className={cn(
        "text-[12px] sm:text-[13px] text-muted-foreground mt-1.5",
        className
      )}
    >
      {children}
    </p>
  );
}
