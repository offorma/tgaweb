"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
} from "lucide-react";
import { SCHOOL } from "./data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: "Visit Us",
    value: SCHOOL.address,
    href: `https://maps.google.com/?q=${encodeURIComponent(SCHOOL.address)}`,
  },
  {
    icon: Phone,
    label: "Call Us",
    value: SCHOOL.phone,
    sub: SCHOOL.phoneAlt,
    href: `tel:${SCHOOL.phone.replace(/\s/g, "")}`,
  },
  {
    icon: Mail,
    label: "Email Us",
    value: SCHOOL.email,
    sub: SCHOOL.admissionsEmail,
    href: `mailto:${SCHOOL.email}`,
  },
  {
    icon: Clock,
    label: "Office Hours",
    value: SCHOOL.hours,
    sub: "Saturday: 9 AM – 1 PM (by appointment)",
  },
];

const SOCIAL = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
];

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Simulate async submission
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSubmitted(true);
    toast.success("Message sent! Our team will respond within 24 hours.");
    (e.target as HTMLFormElement).reset();
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <section id="contact" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left: Info */}
          <div className="lg:col-span-5">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--orange)]/10 text-[var(--orange-dark)] text-xs font-bold uppercase tracking-[0.18em]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
              Get in Touch
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--navy)] leading-[1.05] text-balance"
            >
              We'd love to
              <span className="block gradient-text-orange">hear from you.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 text-lg text-muted-foreground leading-relaxed"
            >
              Have a question about admissions, programs, or campus life?
              Reach out — our friendly team will respond within one business day.
            </motion.p>

            {/* Contact cards */}
            <div className="mt-10 space-y-4">
              {CONTACT_INFO.map((info, i) => {
                const Icon = info.icon;
                const inner = (
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--cream)] border border-black/5 hover:border-[var(--orange)]/30 hover:shadow-md transition-all">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--navy)] to-[var(--navy-light)] flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {info.label}
                      </div>
                      <div className="mt-1 font-semibold text-[var(--navy)] break-words">
                        {info.value}
                      </div>
                      {info.sub && (
                        <div className="text-sm text-muted-foreground mt-0.5 break-words">
                          {info.sub}
                        </div>
                      )}
                    </div>
                  </div>
                );
                return (
                  <motion.div
                    key={info.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 * i }}
                  >
                    {info.href ? (
                      <a href={info.href} target="_blank" rel="noopener noreferrer" className="block">
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Social */}
            <div className="mt-8 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Follow us:</span>
              {SOCIAL.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="h-10 w-10 rounded-full bg-[var(--navy)]/5 hover:bg-[var(--orange)] flex items-center justify-center transition-all hover:scale-110"
                  >
                    <Icon className="h-4 w-4 text-[var(--navy)] hover:text-white" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative bg-gradient-to-br from-[var(--navy)] to-[var(--navy-dark)] rounded-3xl p-8 lg:p-10 shadow-2xl overflow-hidden"
            >
              {/* Decorative orbs */}
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[var(--orange)]/20 blur-3xl" />
              <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-[var(--gold)]/10 blur-3xl" />

              <div className="relative">
                <h3 className="font-serif text-2xl lg:text-3xl font-bold text-white">
                  Send us a message
                </h3>
                <p className="mt-2 text-white/70 text-sm">
                  Fill out the form below and we'll get back to you shortly.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-white/90 text-xs">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        required
                        placeholder="Adaora"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-[var(--orange)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-white/90 text-xs">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        required
                        placeholder="Okafor"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-[var(--orange)]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-white/90 text-xs">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-[var(--orange)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-white/90 text-xs">
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+234 800 000 0000"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-[var(--orange)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subject" className="text-white/90 text-xs">
                      I'm interested in *
                    </Label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      defaultValue=""
                      className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-[var(--orange)] [&>option]:text-[var(--navy)]"
                    >
                      <option value="" disabled>
                        Select an option
                      </option>
                      <option value="admissions">Admissions enquiry</option>
                      <option value="tour">Booking a campus tour</option>
                      <option value="nursery">Nursery program</option>
                      <option value="lower">Lower Primary program</option>
                      <option value="upper">Upper Primary program</option>
                      <option value="careers">Careers / Teaching opportunity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-white/90 text-xs">
                      Your Message *
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      placeholder="Tell us about your child and what you'd like to know..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-[var(--orange)] resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || submitted}
                    className="w-full h-12 bg-gradient-to-r from-[var(--orange)] to-[var(--orange-dark)] hover:opacity-95 text-white rounded-full shadow-lg shadow-orange-500/30"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : submitted ? (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Message Sent!
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-white/50">
                    By submitting, you agree to be contacted by Trail Gliders Academy.
                    We respect your privacy.
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
