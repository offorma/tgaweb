"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Calendar, FileText, ClipboardCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteSettings, AdmissionStep } from "@prisma/client";
import { ApplyButton } from "./apply-button";

const STEP_ICONS = [Calendar, FileText, ClipboardCheck, Sparkles];

export function Admissions({
  settings,
  steps,
}: {
  settings: SiteSettings | null;
  steps: AdmissionStep[];
}) {
  const t = useTranslations("admissions");
  if (!steps.length) return null;

  const paragraph = settings?.admissionsParagraph || "";
  const deadline = settings?.admissionsDeadline || t("deadline");
  const openDay = settings?.admissionsOpenDay || t("openDay");
  const admissionsEmail = settings?.admissionsEmail || "admissions@trailgliders.edu.ng";

  return (
    <section id="admissions" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--navy) 25%, transparent 25%, transparent 50%, var(--navy) 50%, var(--navy) 75%, transparent 75%)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
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
              className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.05] text-balance"
            >
              {settings?.admissionsHeading ? (
                settings.admissionsHeading
              ) : (
                <>
                  {t("title1")}{" "}
                  <span className="block gradient-text-orange">{t("title2")}</span>
                </>
              )}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 text-lg text-muted-foreground leading-relaxed"
            >
              {paragraph}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 p-6 rounded-3xl bg-[var(--navy)] text-white relative overflow-hidden"
            >
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[var(--orange)]/30 blur-2xl" />
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--orange-light)] font-bold">
                  {t("session")}
                </div>
                <div className="mt-2 font-serif text-2xl font-bold">{deadline}</div>
                <div className="mt-1 text-sm text-white/70">
                  {t("limitedSpots")}
                </div>

                <div className="mt-5 space-y-2 text-sm text-white/85">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--orange)]" />
                    {openDay}
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--orange)]" />
                    {t("scholarships")}
                  </div>
                </div>

                <div className="mt-6">
                  <ApplyButton
                    settings={settings}
                    size="default"
                    className="w-full hover:opacity-95 h-12"
                  >
                    {t("startApplication")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </ApplyButton>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative">
              <div className="absolute left-[28px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--orange)] via-[var(--orange)]/40 to-transparent" />

              <div className="space-y-6">
                {steps.map((step, i) => {
                  const Icon = STEP_ICONS[i] || Sparkles;
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="relative pl-20"
                    >
                      <div className="absolute left-0 top-0 h-14 w-14 rounded-full bg-white border-2 border-[var(--orange)] flex items-center justify-center shadow-lg">
                        <Icon className="h-5 w-5 text-[var(--orange-dark)]" />
                      </div>

                      <div className="bg-white rounded-3xl p-7 shadow-md border border-black/5 hover:shadow-xl hover:border-[var(--orange)]/20 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-serif text-3xl font-bold text-[var(--orange)]/30">
                                {t("step")} {step.step}
                              </span>
                              <h3 className="font-serif text-xl font-bold text-[var(--navy)]">
                                {step.title}
                              </h3>
                            </div>
                            <p className="mt-3 text-muted-foreground leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 p-5 rounded-2xl bg-[var(--cream)] border border-[var(--orange)]/20 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="text-sm">
                <div className="font-bold text-[var(--navy)]">{t("haveQuestion")}</div>
                <div className="text-muted-foreground">{t("admissionsReplies")}</div>
              </div>
              <a
                href={`mailto:${admissionsEmail}`}
                className="text-sm font-semibold text-[var(--orange-dark)] hover:text-[var(--orange)]"
              >
                {admissionsEmail}
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
