"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Program } from "@prisma/client";

const COLOR_STYLES: Record<string, { bg: string; text: string; ring: string; chip: string }> = {
  orange: {
    bg: "bg-[var(--orange)]",
    text: "text-[var(--orange-dark)]",
    ring: "ring-[var(--orange)]",
    chip: "bg-[var(--orange)]/10 text-[var(--orange-dark)]",
  },
  navy: {
    bg: "bg-[var(--navy)]",
    text: "text-[var(--navy)]",
    ring: "ring-[var(--navy)]",
    chip: "bg-[var(--navy)]/10 text-[var(--navy)]",
  },
  gold: {
    bg: "bg-[var(--gold)]",
    text: "text-amber-700",
    ring: "ring-[var(--gold)]",
    chip: "bg-amber-100 text-amber-700",
  },
};

export function Academics({ programs }: { programs: Program[] }) {
  const [active, setActive] = useState(0);

  if (!programs.length) return null;
  const program = programs[Math.min(active, programs.length - 1)];
  const colors = COLOR_STYLES[program.color] || COLOR_STYLES.orange;
  const features = program.features.split("\n").filter(Boolean);

  return (
    <section id="academics" className="py-24 lg:py-32 bg-mesh-cream relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="max-w-3xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--navy)]/10 text-[var(--navy)] text-xs font-bold uppercase tracking-[0.18em]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--navy)]" />
            Academics
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.1] text-balance"
          >
            A program for every stage of
            <span className="gradient-text-navy"> the journey.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-lg text-muted-foreground text-balance"
          >
            From the wonder of Nursery to the confidence of Primary 6, our three-stage pathway
            guides every Glider through a curriculum that is rigorous, joyful, and unmistakably African.
          </motion.p>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          {programs.map((p, i) => {
            const c = COLOR_STYLES[p.color] || COLOR_STYLES.orange;
            return (
              <button
                key={p.id}
                onClick={() => setActive(i)}
                className={cn(
                  "group relative px-5 py-4 rounded-2xl border-2 transition-all text-left",
                  active === i
                    ? "border-transparent text-white shadow-xl"
                    : "border-black/10 bg-white hover:border-black/20"
                )}
              >
                {active === i && (
                  <motion.div
                    layoutId="active-program-bg"
                    className={cn("absolute inset-0 rounded-2xl", c.bg)}
                  />
                )}
                <div className="relative">
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.18em]",
                    active === i ? "text-white/70" : "text-muted-foreground"
                  )}>
                    Stage {i + 1}
                  </div>
                  <div className={cn(
                    "font-serif font-bold text-base mt-0.5",
                    active === i ? "text-white" : "text-[var(--navy)]"
                  )}>
                    {p.name}
                  </div>
                  <div className={cn(
                    "text-xs mt-0.5 flex items-center gap-1",
                    active === i ? "text-white/80" : "text-muted-foreground"
                  )}>
                    <Users className="h-3 w-3" />
                    {p.ages}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="mt-10 grid lg:grid-cols-12 gap-8 bg-white rounded-3xl overflow-hidden shadow-xl border border-black/5"
          >
            <div className="lg:col-span-5 relative h-72 lg:h-auto overflow-hidden">
              <img
                src={program.image}
                alt={program.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)]/80 via-transparent to-transparent lg:bg-gradient-to-r" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className={cn(
                  "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  colors.chip
                )}>
                  {program.tagline}
                </div>
                <div className="mt-3 text-white font-serif text-2xl font-bold">{program.name}</div>
                <div className="text-white/80 text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {program.ages}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col">
              <p className="text-lg text-muted-foreground leading-relaxed">{program.description}</p>

              <div className="mt-8">
                <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--navy)]">
                  Program Highlights
                </h4>
                <ul className="mt-4 grid sm:grid-cols-2 gap-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div className={cn(
                        "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0",
                        colors.chip
                      )}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-foreground/90">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-black/5 flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Want to learn more about this program?
                </div>
                <Button
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className={cn(
                    "rounded-full text-white shadow-lg hover:opacity-90",
                    colors.bg
                  )}
                >
                  Book a consultation
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
