"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Calendar } from "lucide-react";
import { SCHOOL, NAV_LINKS } from "./data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      // active section tracking
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
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Top utility bar */}
      <div className="hidden md:block bg-[var(--navy)] text-white/90 text-xs">
        <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-[var(--orange)]" />
              {SCHOOL.phone}
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/80">{SCHOOL.hours}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60">Follow our journey:</span>
            <div className="flex items-center gap-2">
              {["Facebook", "Instagram", "YouTube"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="hover:text-[var(--orange)] transition-colors"
                  aria-label={s}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-md border-b border-black/5"
            : "bg-transparent"
        )}
      >
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => handleNav("#home")}
            className="flex items-center gap-3 group"
          >
            <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-[var(--orange)]/40 group-hover:ring-[var(--orange)] transition-all">
              <img
                src={SCHOOL.crest}
                alt="Trail Gliders Academy Crest"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-left leading-tight">
              <div
                className={cn(
                  "font-serif font-bold text-lg transition-colors",
                  scrolled ? "text-[var(--navy)]" : "text-[var(--navy)]"
                )}
              >
                Trail Gliders
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--orange)] font-semibold">
                Academy • Nsukka
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href.slice(1);
              return (
                <button
                  key={link.href}
                  onClick={() => handleNav(link.href)}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium transition-colors rounded-md",
                    isActive
                      ? "text-[var(--orange)]"
                      : "text-[var(--navy)] hover:text-[var(--orange)]"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[var(--orange)] to-[var(--gold)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="hidden lg:block">
            <Button
              onClick={() => handleNav("#admissions")}
              className="bg-gradient-to-r from-[var(--orange)] to-[var(--orange-dark)] hover:from-[var(--orange-dark)] hover:to-[var(--orange)] text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all rounded-full"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Apply Now
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-md text-[var(--navy)]"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile menu */}
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
                  <button
                    key={link.href}
                    onClick={() => handleNav(link.href)}
                    className="text-left px-3 py-3 text-base font-medium text-[var(--navy)] hover:bg-[var(--cream)] hover:text-[var(--orange)] rounded-md transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
                <Button
                  onClick={() => handleNav("#admissions")}
                  className="mt-2 bg-gradient-to-r from-[var(--orange)] to-[var(--orange-dark)] text-white rounded-full"
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Apply Now
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
