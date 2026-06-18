"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(!token);

  useEffect(() => {
    if (!token) setInvalidToken(true);
  }, [token]);

  const checks = [
    { label: "At least 12 characters", ok: newPassword.length >= 12 },
    { label: "Has uppercase letter", ok: /[A-Z]/.test(newPassword) },
    { label: "Has lowercase letter", ok: /[a-z]/.test(newPassword) },
    { label: "Has digit", ok: /[0-9]/.test(newPassword) },
    { label: "Has symbol", ok: /[^A-Za-z0-9]/.test(newPassword) },
    { label: "Passwords match", ok: !!newPassword && newPassword === confirmPassword },
  ];
  const allOk = checks.every((c) => c.ok);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allOk) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Reset failed");
      }
      setSuccess(true);
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
              {success ? "Password Updated" : "Set New Password"}
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--orange-dark)] font-bold mt-1">
              Admin Portal
            </p>
          </div>

          {invalidToken ? (
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="mt-4 font-serif text-xl font-bold text-[var(--navy)]">
                Invalid Reset Link
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This reset link is missing or malformed. Please request a new
                password reset link.
              </p>
              <a
                href="/admin/forgot-password"
                className="mt-6 inline-block text-sm text-[var(--orange-dark)] hover:text-[var(--orange)] font-semibold"
              >
                Request new reset link →
              </a>
            </div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mt-4 font-serif text-xl font-bold text-[var(--navy)]">
                All set!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your password has been updated. You can now sign in with your
                new password.
              </p>
              <a
                href="/admin/login"
                className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-[var(--navy)] to-[var(--navy-light)] text-white font-semibold hover:opacity-95"
              >
                Sign in now
              </a>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold">
                  New Password
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPwd ? "text" : "password"}
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    placeholder="••••••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPwd ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="••••••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-xs">
                    {c.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={c.ok ? "text-green-700" : "text-muted-foreground"}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                disabled={loading || !allOk}
                className="w-full h-11 bg-gradient-to-r from-[var(--navy)] to-[var(--navy-light)] hover:opacity-95 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--navy)] flex items-center justify-center text-white">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
