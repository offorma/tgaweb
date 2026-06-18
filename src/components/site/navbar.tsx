"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@prisma/client";
import { ApplyButton } from "./apply-button";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslations } from "next-intl";

const NAV_LINKS = [
  { key: "home", href: "#home" },
  { key: "about", href: "#about" },
  { key: "academics", href: "#academics" },
  { key: "campusLife", href: "#campus-life" },
  { key: "admissions", href: "#admissions" },
  { key: "news", href: "#news" },
  { key: "contact", href: "#contact" },
] as const;

export function Navbar({ settings }: { settings: SiteSettings | null }) {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const phone = settings?.phone || "";
  const hours = settings?.hours || "";
  const crest = settings?.crestUrl || "/crest/school-crest.png";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const sections = NAV_LINKS.map((l) => l.href.slice(1));
      for (const s of sections) {
        const el = document.getElementById(s);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(s);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="hidden md:block bg-[var(--navy)] text-white/90 text-xs">
        <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-[var(--orange)]" />
              {phone}
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/80">{hours}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60 hidden sm:inline">{t("followJourney")}</span>
            <div className="hidden sm:flex items-center gap-2">
              {[
                { label: "Facebook", url: settings?.facebookUrl },
                { label: "Instagram", url: settings?.instagramUrl },
                { label: "YouTube", url: settings?.youtubeUrl },
              ].filter((s) => s.url).map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--orange)] transition-colors" aria-label={s.label}>
                  {s.label}
                </a>
              ))}
            </div>
            <span className="text-white/20 hidden sm:inline">|</span>
            <LanguageSwitcher className="text-white/90" />
          </div>
        </div>
      </div>

      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled ? "bg-white/90 backdrop-blur-xl shadow-md border-b border-black/5" : "bg-transparent"
        )}
      >
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <button onClick={() => handleNav("#home")} className="flex items-center gap-3 group">
            <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-[var(--orange)]/40 group-hover:ring-[var(--orange)] transition-all">
              <img src={crest} alt="Trail Gliders Academy Crest" className="h-full w-full object-cover" />
            </div>
            <div className="text-left leading-tight">
              <div className="font-serif font-bold text-lg text-[var(--navy)]">Trail Gliders</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--orange)] font-semibold">Academy • Nsukka</div>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href.slice(1);
              return (
                <button key={link.href} onClick={() => handleNav(link.href)}
                  className={cn("relative px-4 py-2 text-sm font-medium transition-colors rounded-md",
                    isActive ? "text-[var(--orange)]" : "text-[var(--navy)] hover:text-[var(--orange)]")}>
                  {t(link.key)}
                  {isActive && (
                    <motion.span layoutId="nav-underline"
                      className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[var(--orange)] to-[var(--gold)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <ApplyButton settings={settings} size="default"
              className="shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all">
              <Calendar className="h-4 w-4 mr-1.5" />
              {settings?.applyButtonLabel || t("applyNow")}
            </ApplyButton>
          </div>

          <button className="lg:hidden p-2 rounded-md text-[var(--navy)]" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden bg-white border-t border-black/5"
            >
              <div className="px-6 py-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <button key={link.href} onClick={() => handleNav(link.href)}
                    className="text-left px-3 py-3 text-base font-medium text-[var(--navy)] hover:bg-[var(--cream)] hover:text-[var(--orange)] rounded-md transition-colors">
                    {t(link.key)}
                  </button>
                ))}
                <div className="mt-2">
                  <ApplyButton settings={settings} size="default" className="w-full">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    {settings?.applyButtonLabel || t("applyNow")}
                  </ApplyButton>
                </div>
                <div className="mt-2 flex items-center justify-between px-3">
                  <LanguageSwitcher className="text-[var(--navy)]" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
