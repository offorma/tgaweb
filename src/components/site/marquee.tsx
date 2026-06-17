"use client";

import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

const MARQUEE_ITEMS = [
  "Knowledge • Character • Service",
  "Excellence as You Glide Beyond Limits",
  "Since 2009",
  "Nsukka • Enugu State • Nigeria",
  "Nursery • Lower Primary • Upper Primary",
  "Robotics • Coding • STEM",
  "Music • Art • Drama",
  "Sports • Leadership • Service",
];

export function Marquee() {
  return (
    <div className="relative bg-gradient-to-r from-[var(--navy)] via-[var(--navy-light)] to-[var(--navy)] py-4 overflow-hidden border-y border-white/10">
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center">
            {MARQUEE_ITEMS.map((item, i) => (
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
