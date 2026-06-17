"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Calendar } from "lucide-react";
import { NEWS_EVENTS } from "./data";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function News() {
  return (
    <section id="news" className="py-24 lg:py-32 bg-mesh-cream relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--navy)]/10 text-[var(--navy)] text-xs font-bold uppercase tracking-[0.18em]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--navy)]" />
              News & Events
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.1] text-balance"
            >
              What's happening on
              <span className="gradient-text-orange"> the Glider campus.</span>
            </motion.h2>
          </div>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="self-start lg:self-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--orange-dark)] hover:text-[var(--orange)] transition-colors"
          >
            View all news
            <ArrowUpRight className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {NEWS_EVENTS.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-black/5"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)]/60 to-transparent" />

                {/* Tag */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-[var(--navy)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
                  {item.tag}
                </div>

                {/* Date */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white text-xs">
                  <Calendar className="h-3 w-3" />
                  {formatDate(item.date)}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orange-dark)]">
                  {item.category}
                </div>
                <h3 className="mt-2 font-serif text-xl font-bold text-[var(--navy)] leading-snug group-hover:text-[var(--orange-dark)] transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {item.excerpt}
                </p>

                <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-[var(--orange-dark)] group-hover:gap-2.5 transition-all">
                  Read more
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
