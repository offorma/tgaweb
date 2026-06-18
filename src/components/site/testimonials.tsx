"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@prisma/client";

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const next = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % testimonials.length);
  }, [testimonials.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const id = setInterval(next, 7000);
    return () => clearInterval(id);
  }, [next, testimonials.length]);

  if (!testimonials.length) return null;
  const active = testimonials[Math.min(index, testimonials.length - 1)];

  return (
    <section className="py-24 lg:py-32 bg-[var(--navy)] text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[var(--orange)]/20 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />

      <div className="absolute top-10 left-10 lg:left-20 opacity-10 pointer-events-none">
        <Quote className="h-40 w-40 lg:h-64 lg:w-64 text-white" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[var(--orange-light)] text-xs font-bold uppercase tracking-[0.18em]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
            Voices from our Family
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.1] text-balance"
          >
            Loved by parents.
            <span className="block bg-gradient-to-r from-[var(--orange)] to-[var(--gold)] bg-clip-text text-transparent">
              Trusted with their children.
            </span>
          </motion.h2>
        </div>

        <div className="relative min-h-[280px] lg:min-h-[240px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={active.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-center gap-1 mb-6">
                {Array.from({ length: active.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-[var(--gold)] text-[var(--gold)]" />
                ))}
              </div>

              <blockquote className="font-serif text-2xl sm:text-3xl lg:text-4xl leading-relaxed text-white/95 text-balance">
                "{active.quote}"
              </blockquote>

              <div className="mt-8 flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--gold)] flex items-center justify-center font-bold text-white text-lg">
                  {active.name.charAt(0)}
                </div>
                <div className="mt-3 font-bold text-white">{active.name}</div>
                <div className="text-sm text-white/60">{active.relation}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {testimonials.length > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="h-11 w-11 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all flex items-center justify-center"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > index ? 1 : -1);
                    setIndex(i);
                  }}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index
                      ? "w-8 bg-[var(--orange)]"
                      : "w-2 bg-white/30 hover:bg-white/50"
                  )}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="h-11 w-11 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all flex items-center justify-center"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
