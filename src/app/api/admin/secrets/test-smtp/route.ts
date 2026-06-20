export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { SmtpTestSchema } from "@/lib/validations/site";
import { testSmtpConnection } from "@/lib/secrets";
import { writeAuditLog } from "@/lib/auth-utils";

/**
 * POST /api/admin/secrets/test-smtp
 * Tests an SMTP connection with the provided credentials.
 * Body: { host, port, user, password, secure? }
 *
 * The password is used in-memory only — never stored.
 */
export const POST = adminHandler(async (req, user) => {
  const body = await parseJsonBody(req);
  const parsed = SmtpTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await testSmtpConnection(parsed.data);

  await writeAuditLog({
    userId: user.id,
    action: result.ok ? "smtp.test.success" : "smtp.test.failure",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({
      host: parsed.data.host,
      port: parsed.data.port,
      user: parsed.data.user,
      message: result.message,
    }),
  });

  return NextResponse.json(result);
}, { method: "POST", limit: 5, requiredRole: "ADMIN" }); // 5 tests per minute per IP
