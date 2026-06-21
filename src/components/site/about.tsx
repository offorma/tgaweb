"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpen, Heart, Sparkles, Globe } from "lucide-react";
import type { SiteSettings, Value } from "@prisma/client";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Heart,
  Sparkles,
  Globe,
};

export function About({
  settings,
  values,
}: {
  settings: SiteSettings | null;
  values: Value[];
}) {
  const t = useTranslations("about");
  const paragraph = settings?.aboutParagraph || "";
  const missionText = settings?.missionText || "";
  const visionText = settings?.visionText || "";
  const founded = settings?.founded || 2009;

  return (
    <section id="about" className="relative py-24 lg:py-32 bg-mesh-cream overflow-hidden">
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-[0.04] pointer-events-none">
        <div className="h-[600px] w-[600px] clip-shield bg-[var(--navy)]" />
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 opacity-[0.04] pointer-events-none">
        <div className="h-[500px] w-[500px] clip-shield bg-[var(--orange)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="max-w-3xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--orange)]/10 text-[var(--orange-dark)] text-xs font-bold uppercase tracking-[0.18em]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
            {t("badge")}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.1] text-balance"
          >
            {settings?.aboutHeading ? (
              settings.aboutHeading
            ) : (
              <>
                {t("heading1")}{" "}
                <span className="gradient-text-orange">{t("heading2")}</span>
              </>
            )}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground leading-relaxed"
          >
            {paragraph}
          </motion.p>
        </div>

        <div className="mt-16 grid lg:grid-cols-12 gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative grid grid-cols-2 gap-4 h-full">
              <div className="space-y-4 pt-8">
                <div className="overflow-hidden rounded-2xl shadow-lg aspect-[3/4]">
                  <img
                    src="/images/library.jpg"
                    alt="Children reading in the library"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-lg aspect-square">
                  <img
                    src="/images/arts.jpg"
                    alt="Children in art class"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl shadow-lg aspect-square">
                  <img
                    src="/images/science.jpg"
                    alt="Science experiment"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-lg aspect-[3/4]">
                  <img
                    src="/images/graduation.jpg"
                    alt="Graduation ceremony"
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl px-6 py-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange-dark)] flex items-center justify-center text-white font-serif font-bold text-xl">
                  {new Date().getFullYear() - founded}
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-[var(--navy)]">{t("yearsBadge")}</div>
                  <div className="text-xs text-muted-foreground">{t("yearsDesc")}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-black/5"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--navy)]/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-[var(--navy)]" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[var(--navy)]">{t("visionTitle")}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{visionText}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-[var(--navy)] rounded-3xl p-8 text-white shadow-navy relative overflow-hidden"
            >
              <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-[var(--orange)]/30 blur-3xl" />
              <div className="flex items-start gap-4 relative">
                <div className="h-12 w-12 rounded-xl bg-[var(--orange)]/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-[var(--orange)]" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold">{t("missionTitle")}</h3>
                  <p className="mt-2 text-white/85 leading-relaxed">{missionText}</p>
                </div>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              {values.map((value, i) => {
                const Icon = ICONS[value.icon] || Sparkles;
                return (
                  <motion.div
                    key={value.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * i }}
                    className="group bg-white rounded-2xl p-6 border border-black/5 hover:border-[var(--orange)]/30 hover:shadow-lg transition-all"
                  >
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--orange)]/10 to-[var(--gold)]/10 flex items-center justify-center group-hover:from-[var(--orange)] group-hover:to-[var(--orange-dark)] transition-all">
                      <Icon className="h-5 w-5 text-[var(--orange)] group-hover:text-white transition-colors" />
                    </div>
                    <h4 className="mt-4 font-bold text-[var(--navy)]">{value.title}</h4>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
