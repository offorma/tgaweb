"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { CampusItem } from "@prisma/client";

export function CampusLife({ items }: { items: CampusItem[] }) {
  if (!items.length) return null;

  return (
    <section id="campus-life" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--orange)]/10 text-[var(--orange-dark)] text-xs font-bold uppercase tracking-[0.18em]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
              Campus Life
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.1] text-balance"
            >
              A vibrant world beyond
              <span className="gradient-text-orange"> the classroom.</span>
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:max-w-sm text-muted-foreground leading-relaxed"
          >
            From sports fields to science fairs, art studios to choir stages — every Glider finds
            their spark and learns to shine in their own way.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {items.map((item, i) => {
            const spanClass =
              i === 0
                ? "col-span-2 row-span-2"
                : i === 5
                ? "col-span-2"
                : "";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`group relative overflow-hidden rounded-3xl shadow-md hover:shadow-2xl transition-all duration-500 ${spanClass}`}
              >
                <div className={`relative ${i === 0 ? "aspect-square lg:aspect-auto lg:h-full" : "aspect-[4/3]"}`}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-dark)]/90 via-[var(--navy)]/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />

                  <div className="absolute inset-0 flex flex-col justify-end p-5 lg:p-6">
                    <div className="transform transition-transform duration-500 group-hover:-translate-y-1">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--orange)]/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider w-fit">
                        <span className="h-1 w-1 rounded-full bg-white" />
                        Featured
                      </div>
                      <h3 className="mt-3 font-serif text-xl lg:text-2xl font-bold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-white/80 max-w-xs">
                        {item.description}
                      </p>
                    </div>

                    <div className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                      <ArrowUpRight className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            Want to see Campus Life in person?{" "}
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="font-semibold text-[var(--orange-dark)] hover:text-[var(--orange)] underline-offset-4 hover:underline"
            >
              Book a campus tour →
            </button>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
