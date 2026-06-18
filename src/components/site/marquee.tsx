"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";
import type { SiteSettings } from "@prisma/client";

export function Marquee({ settings }: { settings: SiteSettings | null }) {
  const t = useTranslations("marquee");
  const items = [
    settings?.motto || t("motto"),
    settings?.tagline || "Excellence as You Glide Beyond Limits",
    `Since ${settings?.founded || 2009}`,
    settings?.location || "Nsukka • Enugu State • Nigeria",
    t("nurseryLowerUpper"),
    t("robotics"),
    t("musicArt"),
    t("sportsLeadership"),
  ];

  return (
    <div className="relative bg-gradient-to-r from-[var(--navy)] via-[var(--navy-light)] to-[var(--navy)] py-4 overflow-hidden border-y border-white/10">
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center">
            {items.map((item, i) => (
              <div key={`${dup}-${i}`} className="flex items-center">
                <span className="text-white/90 font-serif italic text-base sm:text-lg px-8">
                  {item}
                </span>
                <GraduationCap className="h-4 w-4 text-[var(--orange)]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
