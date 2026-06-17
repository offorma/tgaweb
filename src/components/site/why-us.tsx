"use client";

import { motion } from "framer-motion";
import {
  Award,
  Users,
  FlaskConical,
  ShieldCheck,
  Bus,
  Apple,
  ArrowUpRight,
} from "lucide-react";
import { WHY_US } from "./data";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Users,
  FlaskConical,
  ShieldCheck,
  Bus,
  Apple,
};

export function WhyUs() {
  return (
    <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Subtle dotted background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(var(--navy) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--orange)]/10 text-[var(--orange-dark)] text-xs font-bold uppercase tracking-[0.18em]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
            Why Families Choose Us
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.1] text-balance"
          >
            More than a school.
            <span className="block gradient-text-orange">A launchpad for life.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-lg text-muted-foreground text-balance"
          >
            From the smallest details of daily care to the boldest dreams of a Glider graduate —
            every part of our school is designed to help your child rise.
          </motion.p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_US.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative bg-white rounded-3xl p-8 border border-black/5 hover:border-transparent hover:shadow-2xl hover:shadow-[var(--navy)]/10 transition-all duration-300 overflow-hidden"
              >
                {/* Hover gradient corner */}
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-[var(--orange)]/0 to-[var(--orange)]/0 group-hover:from-[var(--orange)]/10 group-hover:to-[var(--gold)]/5 transition-all duration-500 blur-2xl" />

                {/* Icon */}
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--navy)] to-[var(--navy-light)] flex items-center justify-center group-hover:from-[var(--orange)] group-hover:to-[var(--orange-dark)] transition-all duration-500 shadow-lg">
                  {Icon && <Icon className="h-6 w-6 text-white" />}
                  <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-all" />
                </div>

                {/* Content */}
                <h3 className="mt-6 font-serif text-xl font-bold text-[var(--navy)] group-hover:text-[var(--orange-dark)] transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-muted-foreground leading-relaxed text-sm">
                  {item.description}
                </p>

                {/* Arrow */}
                <div className="mt-5 flex items-center gap-1 text-[var(--orange)] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-300">
                  <span>Learn more</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
