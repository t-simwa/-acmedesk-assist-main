import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

// We wrap the radix trigger to automatically disable `asChild` when the
// passed child element is a Radix `Slot`. TooltipTrigger internally clones
// its child when `asChild` is true, which leads to a `Primitive.button.SlotClone`
// function component receiving a ref and triggering the React warning:
// "Function components cannot be given refs". Many of our components (e.g.
// `SidebarMenuButton`) render via a `Slot` when `asChild` is used, so this
// helper guards against that and keeps callers simple.
import { Slot } from "@radix-ui/react-slot";

const TooltipTrigger: typeof TooltipPrimitive.Trigger = ({ asChild, children, ...props }) => {
  let useAsChild = asChild;
  // if the child is a Slot (or a cloned Slot) we disable asChild
  if (
    React.isValidElement(children) &&
    (children.type === Slot ||
      // cloned slot may have displayName of "SlotClone" so check for string match
      (typeof children.type === "object" &&
        "displayName" in children.type &&
        (children.type as any).displayName?.includes("Slot")))
  ) {
    useAsChild = false;
  }
  return (
    <TooltipPrimitive.Trigger asChild={useAsChild} {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[10000] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
