"use client";

import { motion } from "framer-motion";
import { ChevronDown, ArrowRight, Star, Play, Sparkles } from "lucide-react";
import { SCHOOL } from "./data";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-[100svh] flex items-center overflow-hidden bg-mesh-navy"
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero.jpg"
          alt="Joyful pupils learning at Trail Gliders Academy"
          className="h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--navy-dark)]/90 via-[var(--navy)]/65 to-[var(--navy-dark)]/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy-dark)]/85 via-transparent to-[var(--navy-dark)]/40" />
      </div>

      {/* Decorative floating shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Large gradient orb */}
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-[5%] h-72 w-72 rounded-full bg-gradient-to-br from-[var(--orange)]/40 to-[var(--gold)]/20 blur-3xl"
        />
        {/* Smaller orb */}
        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-[8%] h-56 w-56 rounded-full bg-gradient-to-br from-[var(--gold)]/30 to-[var(--orange)]/10 blur-3xl"
        />
        {/* Floating particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              opacity: 0,
            }}
            animate={{
              y: ["0%", "-100%"],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear",
            }}
            className="absolute h-1 w-1 rounded-full bg-[var(--orange)]/40"
            style={{ left: `${(i * 5.5) % 100}%`, top: "100%" }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: Text */}
          <div className="lg:col-span-7 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--orange)]/90 to-[var(--orange-dark)]/90 backdrop-blur-md border border-[var(--orange-light)]/40 text-xs font-bold tracking-wide text-white shadow-lg shadow-orange-500/30"
            >
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Admissions Open for 2026/2027 Session
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mt-6 font-serif font-bold leading-[1.05] text-5xl sm:text-6xl lg:text-7xl text-balance text-shadow-hero"
            >
              Where Young Minds
              <span className="block bg-gradient-to-r from-[var(--orange)] via-[var(--gold)] to-[var(--orange-light)] bg-clip-text text-transparent">
                Glide Beyond Limits
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-6 max-w-xl text-lg text-white/85 leading-relaxed text-balance"
            >
              Trail Gliders Academy, Nsukka — a premier Nigerian primary school
              nurturing confident, curious, and creative learners since {SCHOOL.founded}.
              Discover the joy of an education that sees, celebrates, and elevates every child.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Button
                size="lg"
                onClick={() => document.getElementById("admissions")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-gradient-to-r from-[var(--orange)] to-[var(--orange-dark)] hover:from-[var(--orange-dark)] hover:to-[var(--orange)] text-white shadow-2xl shadow-orange-500/40 hover:scale-105 transition-all rounded-full px-8 h-13 text-base"
              >
                Begin Your Application
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById("campus-life")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-white/5 backdrop-blur-md border-white/30 text-white hover:bg-white/15 hover:text-white rounded-full px-8 h-13 text-base"
              >
                <Play className="mr-2 h-4 w-4 fill-white" />
                Explore Campus Life
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-white/75"
            >
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" />
                  ))}
                </div>
                <span className="text-sm">
                  <span className="font-bold text-white">4.9/5</span> from 320+ parents
                </span>
              </div>
              <div className="h-5 w-px bg-white/20" />
              <div className="text-sm">
                <span className="font-bold text-white">850+</span> Glider Alumni
              </div>
              <div className="h-5 w-px bg-white/20" />
              <div className="text-sm">
                Approved by <span className="font-bold text-white">UBE Enugu</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Crest display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="lg:col-span-5 flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Rotating decorative ring */}
              <div className="absolute -inset-8 rounded-full border border-white/10 animate-rotate-slow" />
              <div className="absolute -inset-12 rounded-full border-2 border-dashed border-[var(--orange)]/20 animate-rotate-slow" style={{ animationDirection: "reverse", animationDuration: "40s" }} />

              {/* Glow */}
              <div className="absolute inset-0 rounded-full bg-[var(--orange)]/30 blur-3xl animate-pulse-glow" />

              {/* Crest */}
              <div className="relative h-72 w-72 lg:h-80 lg:w-80 rounded-full overflow-hidden ring-4 ring-white/40 shadow-2xl shadow-orange-900/50">
                <img
                  src={SCHOOL.crest}
                  alt="Trail Gliders Academy Crest"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--navy)]/20 to-transparent" />
              </div>

              {/* Floating tagline pill */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 lg:-left-16 glass-card-dark text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-[var(--orange)]/30"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--orange-light)] font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Our Promise
                </div>
                <div className="text-base font-serif italic mt-1 max-w-[220px] leading-snug">
                  "{SCHOOL.tagline}"
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.button
        onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/70 hover:text-white flex flex-col items-center gap-2"
        aria-label="Scroll to about"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <div className="h-10 w-6 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
          <span className="h-2 w-1 rounded-full bg-white animate-scroll-down" />
        </div>
      </motion.button>
    </section>
  );
}
