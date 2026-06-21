export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { verifyBotDefense, isBotUserAgent } from "@/lib/bot-defense";
import { sendContactNotificationEmail, sendContactAutoReplyEmail } from "@/lib/email";

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

  // 6) Send the branded notification to the school inbox, plus an auto-reply to the
  //    sender. Both fail soft (return { sent:false } if SMTP isn't configured).
  let emailSent = false;

  try {
    const notify = await sendContactNotificationEmail({
      to: toEmail,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone || undefined,
      subject: body.subject,
      message: body.message,
      ip: ip || undefined,
    });
    emailSent = notify.sent;
  } catch (e: any) {
    console.error("[contact-form] notification send failed:", e?.message);
  }

  // Auto-reply confirmation to the person who wrote in (best-effort).
  if (emailSent) {
    try {
      await sendContactAutoReplyEmail({
        to: body.email,
        firstName: body.firstName,
        subject: body.subject,
        message: body.message,
      });
    } catch (e: any) {
      console.error("[contact-form] auto-reply send failed:", e?.message);
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
