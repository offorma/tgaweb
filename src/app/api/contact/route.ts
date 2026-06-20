export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getSecretValues } from "@/lib/secrets-data";
import { isMasterKeyConfigured } from "@/lib/secrets";
import { verifyBotDefense, isBotUserAgent } from "@/lib/bot-defense";

const Schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(1).max(80),
  message: z.string().trim().min(10).max(5000),
  // Bot defense tokens
  mathToken: z.string().min(10),
  mathAnswer: z.string().min(1),
  timeToken: z.string().min(10),
  turnstileToken: z.string().optional(),
  // Honeypots (must be empty)
  company: z.string().optional(),
  website_url: z.string().optional(),
  fax_number: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  // 0) Bot user-agent check — reject known bots outright
  if (isBotUserAgent(userAgent)) {
    return NextResponse.json(
      { error: "Access denied." },
      { status: 403 }
    );
  }

  // 1) Rate limit: 3 submissions per hour per IP
  const rl = rateLimitByIp(ip, "contact-form", 3, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later.", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // 2) Parse + validate
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: "Validation failed", details: e?.issues ?? "Invalid request" },
      { status: 400 }
    );
  }

  // 3) Bot defense verification (honeypots + math captcha + time-trap + Turnstile)
  const defenseResult = await verifyBotDefense(
    {
      mathToken: body.mathToken,
      mathAnswer: body.mathAnswer,
      timeToken: body.timeToken,
      turnstileToken: body.turnstileToken,
      honeypots: {
        company: body.company,
        website_url: body.website_url,
        fax_number: body.fax_number,
      },
    },
    { ip }
  );

  if (!defenseResult.ok) {
    // For honeypot failures, silently return success (don't tell the bot)
    if (!defenseResult.checks.honeypot) {
      return NextResponse.json({ ok: true, message: "Message received." });
    }
    return NextResponse.json(
      { error: defenseResult.reason || "Security check failed. Please refresh and try again." },
      { status: 400 }
    );
  }

  // 4) Get current site settings (for the email to send to)
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  const toEmail = settings?.admissionsEmail || settings?.email || "info@trailgliders.edu.ng";

  // 5) Audit log the submission
  await writeAuditLog({
    action: "contact.submission",
    ip,
    userAgent,
    meta: JSON.stringify({
      name: `${body.firstName} ${body.lastName}`,
      email: body.email,
      subject: body.subject,
      to: toEmail,
    }),
  });

  // 6) Attempt to send email via SMTP if secrets are configured
  let emailSent = false;

  if (isMasterKeyConfigured()) {
    try {
      const smtp = await getSecretValues([
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "SMTP_FROM",
      ]);

      if (smtp.SMTP_HOST && smtp.SMTP_USER && smtp.SMTP_PASSWORD) {
        const nodemailer = await import("nodemailer").catch(() => null);
        if (nodemailer) {
          const port = parseInt(smtp.SMTP_PORT || "587", 10);
          const transporter = nodemailer.createTransport({
            host: smtp.SMTP_HOST,
            port,
            secure: port === 465,
            auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASSWORD },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 15000,
          });

          await transporter.sendMail({
            from: smtp.SMTP_FROM || smtp.SMTP_USER,
            to: toEmail,
            replyTo: body.email,
            subject: `[Contact Form] ${body.subject}`,
            text: `New contact form submission from ${body.firstName} ${body.lastName}

Email: ${body.email}
Phone: ${body.phone || "(not provided)"}
Subject: ${body.subject}

Message:
${body.message}

---
Submitted from trailgliders.edu.ng
IP: ${ip || "unknown"}`,
          });

          await transporter.close();
          emailSent = true;
        }
      }
    } catch (e: any) {
      console.error("[contact-form] SMTP send failed:", e?.message);
    }
  }

  // 7) Always return success to the user (don't leak SMTP errors)
  return NextResponse.json({
    ok: true,
    message: emailSent
      ? "Message sent! We'll respond within 24 hours."
      : "Message received. We'll respond within 24 hours.",
  });
}
