export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { verifyBotDefense, isBotUserAgent } from "@/lib/bot-defense";

const Schema = z.object({
  email: z.string().email("Invalid email").max(120),
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

  // 0) Bot user-agent check
  if (isBotUserAgent(userAgent)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // 1) Rate limit: 5 per hour per IP
  const rl = rateLimitByIp(ip, "newsletter", 5, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // 2) Parse + validate
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  // 3) Bot defense verification
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
    // For honeypot failures, silently return success
    if (!defenseResult.checks.honeypot) {
      return NextResponse.json({ ok: true, message: "You're subscribed!" });
    }
    return NextResponse.json(
      { error: defenseResult.reason || "Security check failed." },
      { status: 400 }
    );
  }

  const email = body.email.toLowerCase().trim();

  // 4) Upsert (dedupe by email — unique constraint)
  try {
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email, ip, userAgent },
    });
  } catch (e: any) {
    if (e?.code !== "P2002") {
      console.error("[newsletter] DB error:", e);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }
  }

  // 5) Audit log
  await writeAuditLog({
    action: "newsletter.subscribe",
    ip,
    userAgent,
    meta: email,
  });

  return NextResponse.json({
    ok: true,
    message: "You're subscribed! Watch your inbox for Glider updates.",
  });
}
