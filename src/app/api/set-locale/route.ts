export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { locales } from "@/i18n/config";

const Schema = z.object({
  locale: z.enum(locales as unknown as [string, ...string[]]),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const res = NextResponse.json({ ok: true });
    res.cookies.set("locale", body.locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
}
