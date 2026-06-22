"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowLeft,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const fromPath = (() => {
    const raw = params.get("from") || "/admin/dashboard";
    // Prevent open redirect — must be a same-origin relative path
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/admin/dashboard";
    return raw;
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Only send a code once the 2FA step is showing. Use "" (not undefined) —
    // signIn serializes undefined to the string "undefined", which the server
    // would mistake for a (wrong) 2FA code on the very first submit.
    const totpValue = needsTwoFactor ? totp.trim() : "";

    const result = await signIn("credentials", {
      email,
      password,
      totp: totpValue,
      redirect: false,
    });

    setLoading(false);

    const err = result?.error;

    if (err === "2FA_REQUIRED") {
      // Password was correct — this account has 2FA. Show the code input.
      setNeedsTwoFactor(true);
      setError(null);
      return;
    }

    if (err) {
      if (err === "INVALID_2FA") {
        // Stay on the 2FA step so they can re-enter the code.
        setNeedsTwoFactor(true);
        setError("Invalid or expired code. Please try again.");
      } else if (err.startsWith("ACCOUNT_LOCKED")) {
        const mins = err.split(":")[1] || "15";
        setNeedsTwoFactor(false);
        setTotp("");
        setError(
          `Too many failed attempts — this account is locked. Try again in about ${mins} minute${mins === "1" ? "" : "s"}, or reset your password below.`
        );
      } else if (err === "ACCOUNT_INACTIVE") {
        setNeedsTwoFactor(false);
        setError("This account has been deactivated. Contact a site administrator.");
      } else if (needsTwoFactor) {
        setError("Invalid or expired code. Please try again.");
      } else {
        // Wrong email or password — kept generic on purpose (no user enumeration).
        setError(
          "Invalid email or password. If you've forgotten it, use the link below."
        );
      }
      return;
    }

    if (result?.ok) {
      router.push(fromPath);
      router.refresh();
    }
  };

  const resetTwoFactor = () => {
    setNeedsTwoFactor(false);
    setTotp("");
    setUseBackupCode(false);
    setError(null);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {!needsTwoFactor ? (
        <>
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
                placeholder="admin@trailgliders.edu.ng"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">
                Password
              </Label>
              <a
                href="/admin/forgot-password"
                className="text-xs text-[var(--orange-dark)] hover:text-[var(--orange)] font-semibold"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
        </>
      ) : (
        <>
          <div className="text-center py-2">
            <div className="h-12 w-12 rounded-full bg-[var(--orange)]/10 flex items-center justify-center mx-auto">
              <Smartphone className="h-6 w-6 text-[var(--orange-dark)]" />
            </div>
            <h3 className="mt-3 font-serif text-lg font-bold text-[var(--navy)]">
              Two-Factor Authentication
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app
              {useBackupCode ? " or your backup code (XXXX-XXXX)" : ""}.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="totp" className="text-xs font-semibold">
              {useBackupCode ? "Backup Code" : "Authentication Code"}
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="totp"
                type="text"
                required
                autoFocus
                autoComplete="one-time-code"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                className="pl-10 h-11 text-center font-mono text-lg tracking-[0.4em]"
                placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                maxLength={useBackupCode ? 9 : 6}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setUseBackupCode(!useBackupCode)}
              className="text-[var(--orange-dark)] hover:text-[var(--orange)] font-semibold"
            >
              {useBackupCode ? "← Use authenticator code instead" : "Use a backup code instead"}
            </button>
            <button
              type="button"
              onClick={resetTwoFactor}
              className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          </div>
        </>
      )}

      <Button
        type="submit"
        disabled={loading || !email || !password || (needsTwoFactor && !totp)}
        className="w-full h-11 bg-gradient-to-r from-[var(--navy)] to-[var(--navy-light)] hover:opacity-95 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {needsTwoFactor ? "Verifying..." : "Signing in..."}
          </>
        ) : needsTwoFactor ? (
          <>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verify & Sign In
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Sign in to Admin
          </>
        )}
      </Button>

      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-black/5">
        <div className="flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" />
          <span>Protected area • All access is logged</span>
        </div>
      </div>
    </form>
  );
}

export default function AdminLoginPage() {
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
              Trail Gliders Academy
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--orange-dark)] font-bold mt-1">
              Admin Portal
            </p>
          </div>

          <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="text-center mt-6 text-xs text-white/60">
          <a href="/" className="hover:text-white inline-flex items-center gap-1">
            ← Back to website
          </a>
        </div>
      </motion.div>
    </div>
  );
}
