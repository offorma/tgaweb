"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-navy flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-[var(--orange)]/20 blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-10 border border-white/40">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="relative h-20 w-20 rounded-full overflow-hidden ring-4 ring-[var(--orange)]/30 shadow-lg">
              <img
                src="/crest/school-crest.png"
                alt="Trail Gliders Academy Crest"
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold text-[var(--navy)]">
              Reset Password
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--orange-dark)] font-bold mt-1">
              Admin Portal
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your admin email address and we'll send you a secure link
                to reset your password. The link is valid for 1 hour.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-11 bg-gradient-to-r from-[var(--navy)] to-[var(--navy-light)] hover:opacity-95 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mt-4 font-serif text-xl font-bold text-[var(--navy)]">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                If an account exists for <strong className="text-foreground">{email}</strong>,
                a reset link has been sent. The link is valid for 1 hour and can
                only be used once.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Don't see the email? Check your spam folder, or contact your
                site administrator if SMTP hasn't been configured yet.
              </p>
            </motion.div>
          )}

          <div className="mt-6 pt-6 border-t border-black/5 text-center">
            <a
              href="/admin/login"
              className="text-sm text-[var(--orange-dark)] hover:text-[var(--orange)] font-semibold inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
