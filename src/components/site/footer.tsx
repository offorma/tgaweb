"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
  Heart,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
} from "lucide-react";
import { SCHOOL, NAV_LINKS } from "./data";

const PROGRAMS_LINKS = [
  "Early Years (Nursery)",
  "Lower Primary",
  "Upper Primary",
  "STEM & Robotics",
  "Music & Arts",
  "Sports Academy",
];

const RESOURCES_LINKS = [
  "Admissions Portal",
  "Fee Structure",
  "School Calendar",
  "Parent Portal",
  "Alumni Network",
  "Careers",
];

const SOCIAL = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
];

export function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-[var(--navy-dark)] text-white overflow-hidden">
      {/* Decorative top wave */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--orange)] to-transparent" />

      {/* Background mesh */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-[var(--orange)]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[var(--gold)]/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="py-12 lg:py-16 border-b border-white/10"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="font-serif text-3xl lg:text-4xl font-bold leading-tight">
                Ready to watch your child
                <span className="block bg-gradient-to-r from-[var(--orange)] to-[var(--gold)] bg-clip-text text-transparent">
                  glide beyond limits?
                </span>
              </h3>
              <p className="mt-3 text-white/70">
                Admissions for the 2026/2027 session are now open. Schedule a visit today.
              </p>
            </div>
            <button
              onClick={() => document.getElementById("admissions")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-gradient-to-r from-[var(--orange)] to-[var(--orange-dark)] hover:scale-105 transition-transform text-white font-semibold shadow-2xl shadow-orange-500/30"
            >
              Apply Now
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Main footer */}
        <div className="py-14 lg:py-16 grid lg:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-[var(--orange)]/40">
                <img
                  src={SCHOOL.crest}
                  alt="Trail Gliders Academy Crest"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="font-serif font-bold text-xl">Trail Gliders</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--orange)] font-semibold">
                  Academy • Nsukka
                </div>
              </div>
            </div>

            <p className="mt-5 text-sm text-white/65 leading-relaxed max-w-sm">
              {SCHOOL.tagline}. A premier Nigerian primary school nurturing confident,
              curious, and creative learners since {SCHOOL.founded}.
            </p>

            {/* Contact mini */}
            <div className="mt-6 space-y-2.5 text-sm">
              <a
                href={`tel:${SCHOOL.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2.5 text-white/75 hover:text-[var(--orange-light)] transition-colors"
              >
                <Phone className="h-4 w-4 text-[var(--orange)]" />
                {SCHOOL.phone}
              </a>
              <a
                href={`mailto:${SCHOOL.email}`}
                className="flex items-center gap-2.5 text-white/75 hover:text-[var(--orange-light)] transition-colors"
              >
                <Mail className="h-4 w-4 text-[var(--orange)]" />
                {SCHOOL.email}
              </a>
              <div className="flex items-start gap-2.5 text-white/75">
                <MapPin className="h-4 w-4 text-[var(--orange)] mt-0.5 flex-shrink-0" />
                <span>{SCHOOL.address}</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-sm uppercase tracking-[0.18em] text-white">
              Explore
            </h4>
            <ul className="mt-5 space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-white/65 hover:text-[var(--orange-light)] hover:translate-x-1 inline-block transition-all"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-sm uppercase tracking-[0.18em] text-white">
              Programs
            </h4>
            <ul className="mt-5 space-y-3">
              {PROGRAMS_LINKS.map((p) => (
                <li key={p}>
                  <a
                    href="#academics"
                    className="text-sm text-white/65 hover:text-[var(--orange-light)] hover:translate-x-1 inline-block transition-all"
                  >
                    {p}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-sm uppercase tracking-[0.18em] text-white">
              Resources
            </h4>
            <ul className="mt-5 space-y-3">
              {RESOURCES_LINKS.map((r) => (
                <li key={r}>
                  <a
                    href="#"
                    className="text-sm text-white/65 hover:text-[var(--orange-light)] hover:translate-x-1 inline-block transition-all"
                  >
                    {r}
                  </a>
                </li>
              ))}
            </ul>

            {/* Newsletter */}
            <div className="mt-6">
              <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orange-light)]">
                Glider Newsletter
              </h5>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  (e.target as HTMLFormElement).reset();
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  type="email"
                  required
                  placeholder="Your email"
                  className="flex-1 h-10 px-3 rounded-md bg-white/5 border border-white/15 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-[var(--orange)]"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="h-10 w-10 rounded-md bg-[var(--orange)] hover:bg-[var(--orange-dark)] flex items-center justify-center transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4 text-white" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Social + bottom bar */}
        <div className="py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/50 text-center sm:text-left">
            © {new Date().getFullYear()} {SCHOOL.name}. All rights reserved. •
            <span className="ml-1">Made with</span>
            <Heart className="inline h-3 w-3 mx-1 text-[var(--orange)] fill-[var(--orange)]" />
            <span>in Nsukka, Nigeria</span>
          </div>

          <div className="flex items-center gap-3">
            {SOCIAL.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="h-9 w-9 rounded-full bg-white/5 hover:bg-[var(--orange)] flex items-center justify-center transition-all hover:scale-110"
                >
                  <Icon className="h-4 w-4 text-white" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Back to top */}
        <button
          onClick={scrollTop}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-[var(--orange)] hover:bg-[var(--orange-dark)] shadow-xl shadow-orange-500/40 flex items-center justify-center transition-all hover:scale-110 z-40 group"
          aria-label="Back to top"
        >
          <ArrowUpRight className="h-5 w-5 text-white group-hover:-rotate-45 transition-transform" />
        </button>
      </div>
    </footer>
  );
}
