"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BotDefense — client-side component that adds multi-layer bot protection to a form.
 *
 * Layers:
 *  1. Math captcha — fetches a signed problem from /api/captcha, user must answer
 *  2. Time-trap — server-issued timestamp token (form must be open ≥2s)
 *  3. Honeypots — 3 hidden fields with realistic names (bots fill them)
 *  4. Cloudflare Turnstile (optional) — renders if site key is configured
 *
 * The parent form collects the defense tokens via `onTokensChange` and includes
 * them in the submission payload.
 */

export interface BotDefenseTokens {
  mathToken: string;
  mathAnswer: string;
  timeToken: string;
  turnstileToken: string | null;
  honeypots: Record<string, string>;
}

interface BotDefenseProps {
  onTokensChange: (tokens: BotDefenseTokens) => void;
  className?: string;
  securityCheckLabel?: string;
  protectedSpamLabel?: string;
}

export function BotDefense({
  onTokensChange,
  className,
  securityCheckLabel = "Security check: what is",
  protectedSpamLabel = "Protected against automated spam",
}: BotDefenseProps) {
  const [problem, setProblem] = useState("");
  const [mathToken, setMathToken] = useState("");
  const [mathAnswer, setMathAnswer] = useState("");
  const [timeToken, setTimeToken] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Honeypot values — must stay empty for real users
  const [honeypots, setHoneypots] = useState({
    company: "",
    website_url: "",
    fax_number: "",
  });

  // Fetch a fresh captcha
  const fetchCaptcha = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/captcha");
      if (!res.ok) throw new Error("Failed to load captcha");
      const data = await res.json();
      setProblem(data.problem);
      setMathToken(data.mathToken);
      setTimeToken(data.timeToken);
      setTurnstileSiteKey(data.turnstileSiteKey);
      setMathAnswer("");
      setTurnstileToken(null);
    } catch (e) {
      console.error("Captcha load failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // Notify parent whenever tokens change
  useEffect(() => {
    onTokensChange({
      mathToken,
      mathAnswer,
      timeToken,
      turnstileToken,
      honeypots,
    });
  }, [mathToken, mathAnswer, timeToken, turnstileToken, honeypots, onTokensChange]);

  // Load Turnstile script if site key is configured
  useEffect(() => {
    if (!turnstileSiteKey) return;
    if (document.querySelector('script[src*="challenges.cloudflare.com"]')) {
      // Script already loaded — render widget
      renderTurnstile();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => renderTurnstile();
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const renderTurnstile = () => {
    if (!turnstileSiteKey || !turnstileContainerRef.current) return;
    if (!(window as any).turnstile) return;
    if (turnstileWidgetId.current) return;
    turnstileWidgetId.current = (window as any).turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: turnstileSiteKey,
        theme: "light",
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
      }
    );
  };

  const updateHoneypot = (field: keyof typeof honeypots, value: string) => {
    setHoneypots((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading security check...
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Visible math captcha */}
      <div>
        <label className="text-xs font-semibold text-white/90 mb-1.5 block">
          {securityCheckLabel} <span className="font-mono font-bold text-[var(--orange-light)]">{problem}</span>?
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={mathAnswer}
            onChange={(e) => setMathAnswer(e.target.value)}
            required
            autoComplete="off"
            className="flex-1 h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-[var(--orange)]"
            placeholder="Your answer"
          />
          <button
            type="button"
            onClick={fetchCaptcha}
            disabled={refreshing}
            className="h-10 w-10 rounded-md bg-white/5 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="New question"
            title="Get a new question"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Cloudflare Turnstile (optional, only if configured) */}
      {turnstileSiteKey && (
        <div>
          <div ref={turnstileContainerRef} className="min-h-[65px]" />
        </div>
      )}

      {/* Honeypots — hidden from real users, bots fill them */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
        <label>Company</label>
        <input
          type="text"
          name="company"
          value={honeypots.company}
          onChange={(e) => updateHoneypot("company", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
        <label>Website URL</label>
        <input
          type="text"
          name="website_url"
          value={honeypots.website_url}
          onChange={(e) => updateHoneypot("website_url", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
        <label>Fax Number</label>
        <input
          type="text"
          name="fax_number"
          value={honeypots.fax_number}
          onChange={(e) => updateHoneypot("fax_number", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Trust indicator */}
      <div className="flex items-center gap-1.5 text-[10px] text-white/40">
        <ShieldCheck className="h-3 w-3" />
        <span>{protectedSpamLabel}</span>
      </div>
    </div>
  );
}
