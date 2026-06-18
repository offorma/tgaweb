"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
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
  Loader2,
} from "lucide-react";
import type { SiteSettings } from "@prisma/client";
import { ApplyButton } from "./apply-button";
import { BotDefense, type BotDefenseTokens } from "./bot-defense";
import { LanguageSwitcher } from "./language-switcher";
import { useToast } from "@/hooks/use-toast";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Academics", href: "#academics" },
  { label: "Campus Life", href: "#campus-life" },
  { label: "Admissions", href: "#admissions" },
  { label: "News", href: "#news" },
  { label: "Contact", href: "#contact" },
];

const PROGRAMS_LINKS = [
  { label: "Early Years (Nursery)", href: "#academics" },
  { label: "Lower Primary", href: "#academics" },
  { label: "Upper Primary", href: "#academics" },
  { label: "STEM & Robotics", href: "#campus-life" },
  { label: "Music & Arts", href: "#campus-life" },
  { label: "Sports Academy", href: "#campus-life" },
];

export function Footer({ settings }: { settings: SiteSettings | null }) {
  const t = useTranslations("footer");
  const crest = settings?.crestUrl || "/crest/school-crest.png";
  const tagline = settings?.tagline || "";
  const founded = settings?.founded || 2009;
  const phone = settings?.phone || "";
  const email = settings?.email || "";
  const address = settings?.address || "";
  const schoolName = settings?.schoolName || "Trail Gliders Academy";

  // Build social links from settings — empty URLs are filtered out
  const SOCIAL = [
    { icon: Facebook, label: "Facebook", href: settings?.facebookUrl || "" },
    { icon: Instagram, label: "Instagram", href: settings?.instagramUrl || "" },
    { icon: Youtube, label: "YouTube", href: settings?.youtubeUrl || "" },
    { icon: Twitter, label: "Twitter", href: settings?.twitterUrl || "" },
  ].filter((s) => s.href);

  // Build resources links from settings — empty URLs are filtered out
  const RESOURCES_LINKS = [
    { label: "Admissions Portal", href: settings?.resourceAdmissionsPortal || "" },
    { label: "Fee Structure", href: settings?.resourceFeeStructure || "" },
    { label: "School Calendar", href: settings?.resourceSchoolCalendar || "" },
    { label: "Parent Portal", href: settings?.resourceParentPortal || "" },
    { label: "Alumni Network", href: settings?.resourceAlumniNetwork || "" },
    { label: "Careers", href: settings?.resourceCareers || "" },
  ].filter((r) => r.href);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-[var(--navy-dark)] text-white overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--orange)] to-transparent" />

      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-[var(--orange)]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[var(--gold)]/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
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
            <ApplyButton
              settings={settings}
              size="lg"
              className="px-7 py-4 hover:scale-105 transition-transform font-semibold shadow-2xl shadow-orange-500/30"
            >
              {settings?.applyButtonLabel || "Apply Now"}
              <ArrowUpRight className="h-5 w-5" />
            </ApplyButton>
          </div>
        </motion.div>

        <div className="py-14 lg:py-16 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-[var(--orange)]/40">
                <img
                  src={crest}
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
              {tagline}. A premier Nigerian primary school nurturing confident,
              curious, and creative learners since {founded}.
            </p>

            <div className="mt-6 space-y-2.5 text-sm">
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 text-white/75 hover:text-[var(--orange-light)] transition-colors"
                >
                  <Phone className="h-4 w-4 text-[var(--orange)]" />
                  {phone}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2.5 text-white/75 hover:text-[var(--orange-light)] transition-colors"
                >
                  <Mail className="h-4 w-4 text-[var(--orange)]" />
                  {email}
                </a>
              )}
              {address && (
                <div className="flex items-start gap-2.5 text-white/75">
                  <MapPin className="h-4 w-4 text-[var(--orange)] mt-0.5 flex-shrink-0" />
                  <span>{address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-bold text-sm uppercase tracking-[0.18em] text-white">Explore</h4>
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

          <div className="lg:col-span-3">
            <h4 className="font-bold text-sm uppercase tracking-[0.18em] text-white">Programs</h4>
            <ul className="mt-5 space-y-3">
              {PROGRAMS_LINKS.map((p) => (
                <li key={p.label}>
                  <a
                    href={p.href}
                    className="text-sm text-white/65 hover:text-[var(--orange-light)] hover:translate-x-1 inline-block transition-all"
                  >
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="font-bold text-sm uppercase tracking-[0.18em] text-white">Resources</h4>
            {RESOURCES_LINKS.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {RESOURCES_LINKS.map((r) => {
                  const href = r.href.startsWith("http") ? r.href : r.href.startsWith("#") ? r.href : `https://${r.href}`;
                  const isExternal = !r.href.startsWith("#");
                  return (
                    <li key={r.label}>
                      <a
                        href={href}
                        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="text-sm text-white/65 hover:text-[var(--orange-light)] hover:translate-x-1 inline-block transition-all"
                      >
                        {r.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 text-sm text-white/40 italic">Coming soon</p>
            )}

            <div className="mt-6">
              <h5 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orange-light)]">
                Glider Newsletter
              </h5>
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/50 text-center sm:text-left">
            © {new Date().getFullYear()} {schoolName}. All rights reserved. •
            <span className="ml-1">Made with</span>
            <Heart className="inline h-3 w-3 mx-1 text-[var(--orange)] fill-[var(--orange)]" />
            <span>in Nsukka, Nigeria</span>
          </div>

          {SOCIAL.length > 0 && (
            <div className="flex items-center gap-3">
              {SOCIAL.map((s) => {
                const Icon = s.icon;
                const href = s.href.startsWith("http") ? s.href : `https://${s.href}`;
                return (
                  <a
                    key={s.label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="h-9 w-9 rounded-full bg-white/5 hover:bg-[var(--orange)] flex items-center justify-center transition-all hover:scale-110"
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </a>
                );
              })}
              <LanguageSwitcher className="text-white/90 ml-2" />
            </div>
          )}
          {SOCIAL.length === 0 && (
            <LanguageSwitcher className="text-white/90" />
          )}
        </div>

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

// Newsletter form — wired to /api/newsletter with full bot defense
function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [botTokens, setBotTokens] = useState<BotDefenseTokens | null>(null);
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botTokens?.mathAnswer) {
      setExpanded(true);
      toast({ title: "Please complete the security check.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          mathToken: botTokens.mathToken,
          mathAnswer: botTokens.mathAnswer,
          timeToken: botTokens.timeToken,
          turnstileToken: botTokens.turnstileToken,
          company: botTokens.honeypots.company,
          website_url: botTokens.honeypots.website_url,
          fax_number: botTokens.honeypots.fax_number,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription failed");
      setDone(true);
      toast({ title: "Subscribed!", description: data.message });
      setEmail("");
    } catch (e: any) {
      toast({ title: "Subscription failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mt-3 p-3 rounded-md bg-green-500/10 border border-green-500/30 text-sm text-green-300">
        ✓ You're subscribed! Watch your inbox for Glider updates.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Your email"
          className="flex-1 h-10 px-3 rounded-md bg-white/5 border border-white/15 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-[var(--orange)]"
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="Subscribe"
          className="h-10 w-10 rounded-md bg-[var(--orange)] hover:bg-[var(--orange-dark)] flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-white" />
          )}
        </button>
      </form>
      {expanded && (
        <BotDefense onTokensChange={setBotTokens} />
      )}
    </div>
  );
}
