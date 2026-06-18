"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/**
 * Client wrapper for dashboard quick-action links with tooltips.
 * The dashboard page is a server component — we pass the icon as a ReactNode
 * (already rendered), not as a component type, to avoid the "functions cannot
 * be passed to Client Components" error.
 */
export function QuickActionLink({
  href,
  label,
  color,
  tip,
  icon,
}: {
  href: string;
  label: string;
  color: string;
  tip: string;
  icon: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className="group flex items-center gap-3 p-4 rounded-2xl bg-white border border-black/5 hover:border-[var(--orange)]/30 hover:shadow-md transition-all"
        >
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <span className="text-sm font-semibold text-[var(--navy)] flex-1">{label}</span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-[var(--orange)] transition-colors" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] bg-[var(--navy)] text-white">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Client wrapper for dashboard stat cards with tooltips.
 */
export function StatCardLink({
  href,
  value,
  label,
  tip,
  icon,
}: {
  href: string;
  value: number;
  label: string;
  tip: string;
  icon: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className="group p-5 rounded-2xl bg-white border border-black/5 hover:shadow-md transition-all block"
        >
          <div className="flex items-start justify-between">
            {icon}
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-3 font-serif text-3xl font-bold text-[var(--navy)]">
            {value}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] bg-[var(--navy)] text-white">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
