"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { FACULTY } from "./data";

export function Faculty() {
  return (
    <section className="py-24 lg:py-32 bg-mesh-cream relative overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 opacity-[0.04] pointer-events-none">
        <div className="h-[700px] w-[700px] rounded-full border-[40px] border-[var(--navy)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="max-w-3xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--navy)]/10 text-[var(--navy)] text-xs font-bold uppercase tracking-[0.18em]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--navy)]" />
            Meet Our Educators
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.1] text-balance"
          >
            The hearts and minds behind
            <span className="gradient-text-orange"> every Glider.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-lg text-muted-foreground text-balance"
          >
            Certified, passionate, and deeply caring — our educators are the soul of Trail Gliders.
            They don't just teach. They mentor, inspire, and walk alongside every child.
          </motion.p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FACULTY.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-black/5"
            >
              {/* Portrait */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-dark)] via-[var(--navy-dark)]/30 to-transparent opacity-90" />

                {/* Quote */}
                <div className="absolute inset-x-0 bottom-0 p-5 transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
                  <Quote className="h-5 w-5 text-[var(--orange)] mb-2 fill-[var(--orange)]" />
                  <p className="text-white/95 text-xs italic leading-relaxed line-clamp-3">
                    "{member.quote}"
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--orange-dark)]">
                  {member.role}
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-bold text-[var(--navy)] leading-tight">
                  {member.name}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {member.bio}
                </p>
              </div>

              {/* Bottom accent */}
              <div className="h-1 w-full bg-gradient-to-r from-[var(--orange)] to-[var(--gold)] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
