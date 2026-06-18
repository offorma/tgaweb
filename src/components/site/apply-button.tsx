"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@prisma/client";

/**
 * ApplyButton — renders the globally-configurable "Apply Now" CTA.
 *
 * Behavior is controlled by SiteSettings:
 *   - applyButtonEnabled: if false, renders nothing
 *   - applyButtonLabel: the button text
 *   - applyButtonType: 'scroll' (smooth-scroll to anchor), 'external' (open URL in new tab),
 *                      'mailto' (open email client)
 *   - applyButtonUrl: anchor (#admissions), https URL, or mailto: address
 *   - applyButtonStyle: 'primary' (orange gradient) or 'outline' (ghost)
 *
 * Pass a `size` prop to control button size — defaults match the standard CTA.
 * Pass a `className` prop to override or augment styling.
 */

type Size = "default" | "sm" | "lg" | "icon";

export function ApplyButton({
  settings,
  size = "default",
  className,
  children,
}: {
  settings: Pick<
    SiteSettings,
    | "applyButtonEnabled"
    | "applyButtonLabel"
    | "applyButtonType"
    | "applyButtonUrl"
    | "applyButtonStyle"
  > | null;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
}) {
  // If the button is disabled, render nothing
  if (!settings?.applyButtonEnabled) {
    return null;
  }

  const label = settings.applyButtonLabel || "Apply Now";
  const type = settings.applyButtonType || "scroll";
  const url = settings.applyButtonUrl || "#admissions";
  const style = settings.applyButtonStyle || "primary";

  // Style classes
  const baseClass =
    style === "primary"
      ? "bg-gradient-to-r from-[var(--orange)] to-[var(--orange-dark)] hover:from-[var(--orange-dark)] hover:to-[var(--orange)] text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
      : "bg-white/5 backdrop-blur-md border-white/30 text-white hover:bg-white/15 hover:text-white";

  // Merge with caller-provided className
  const fullClass = cn(baseClass, className);

  // Handle click based on type
  const handleClick = (e: React.MouseEvent) => {
    if (type === "scroll") {
      e.preventDefault();
      const target = url.startsWith("#") ? url : `#${url}`;
      const el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (type === "mailto") {
      // mailto: links open the email client natively — no preventDefault needed
      // But we still want it to work even if the URL doesn't start with mailto:
      if (!url.startsWith("mailto:")) {
        e.preventDefault();
        window.location.href = `mailto:${url}`;
      }
    } else if (type === "external") {
      // external links open in a new tab — handled by target="_blank" on <a>
      // If the URL doesn't start with http, prefix https://
      if (!url.startsWith("http")) {
        e.preventDefault();
        window.open(`https://${url}`, "_blank", "noopener,noreferrer");
      }
    }
  };

  // For external/mailto, render as an anchor; for scroll, render as a button
  if (type === "external") {
    const href = url.startsWith("http") ? url : `https://${url}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          size === "lg" && "h-13 px-8 text-base",
          size === "default" && "h-11 px-6 text-sm",
          size === "sm" && "h-9 px-4 text-sm",
          fullClass
        )}
      >
        {children || label}
      </a>
    );
  }

  if (type === "mailto") {
    const href = url.startsWith("mailto:") ? url : `mailto:${url}`;
    return (
      <a
        href={href}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          size === "lg" && "h-13 px-8 text-base",
          size === "default" && "h-11 px-6 text-sm",
          size === "sm" && "h-9 px-4 text-sm",
          fullClass
        )}
      >
        {children || label}
      </a>
    );
  }

  // Default: scroll (renders as a Button)
  return (
    <Button
      size={size === "lg" ? "lg" : size === "sm" ? "sm" : "default"}
      onClick={handleClick}
      className={cn(
        size === "lg" && "h-13 px-8 text-base rounded-full",
        fullClass,
        !className?.includes("rounded-full") && "rounded-full"
      )}
    >
      {children || label}
    </Button>
  );
}
