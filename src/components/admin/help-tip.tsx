"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * HelpTip — a small (?) icon that shows a tooltip on hover.
 * Use next to field labels, buttons, or section headers to explain
 * what they do for new admin users.
 *
 * Usage:
 *   <Label>Min Password Length <HelpTip>Minimum characters required for all passwords. Default: 12.</HelpTip></Label>
 *   <Button>...<HelpTip side="right">Deletes this item permanently.</HelpTip></Button>
 *
 * For non-icon triggers (e.g. wrap a button), pass `asChild` and place the
 * HelpTip around the element:
 *   <HelpTip content="Deletes this item" asChild><Button>Delete</Button></HelpTip>
 */
export function HelpTip({
  children,
  content,
  side = "top",
  className,
  asChild = false,
  iconClassName,
}: {
  /** The tooltip text. Required if asChild is false (the icon is the trigger). */
  content?: string;
  /** If asChild, these become the trigger element's children. */
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  iconClassName?: string;
  asChild?: boolean;
}) {
  const tipText = content || (typeof children === "string" ? children : "");

  if (asChild && children) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children as React.ReactElement}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs bg-[var(--navy)] text-white">
          {tipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center text-muted-foreground hover:text-[var(--orange)] transition-colors cursor-help",
            className
          )}
          aria-label="More information"
          tabIndex={0}
        >
          <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs bg-[var(--navy)] text-white shadow-lg">
        {tipText || children}
      </TooltipContent>
    </Tooltip>
  );
}
