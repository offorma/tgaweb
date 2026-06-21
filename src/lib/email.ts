/**
 * Centralized email module for Trail Gliders Academy.
 *
 * - Reads SMTP credentials from the encrypted secrets vault (falls back to env vars).
 * - Renders a single sleek, school-branded HTML template (table-based + inline styles
 *   so it survives Gmail/Outlook/Apple Mail), then layers per-message content on top.
 * - Exposes typed helpers for each flow: password reset, signup welcome, contact
 *   notification (to admin) and contact auto-reply (to sender).
 *
 * All senders fail soft: if SMTP is not configured they return { sent: false } instead
 * of throwing, so callers can keep their existing "never leak SMTP errors" behaviour.
 */

import { db } from "@/lib/db";
import { getSecretValues } from "@/lib/secrets-data";
import { isMasterKeyConfigured } from "@/lib/secrets";

// ---------------------------------------------------------------------------
// School brand palette (mirrors src/app/globals.css)
// ---------------------------------------------------------------------------
const COLORS = {
  navy: "#0A1F44",
  navyLight: "#1E3A6E",
  navyDark: "#061534",
  orange: "#FF6B1A",
  orangeLight: "#FF8C42",
  orangeDark: "#E55A0F",
  silver: "#C8CDD6",
  silverDark: "#8B92A0",
  gold: "#FBBF24",
  cream: "#FFFBF5",
  ink: "#1A2235",
  muted: "#5B6472",
  white: "#FFFFFF",
} as const;

// ---------------------------------------------------------------------------
// Branding (school name / contact details / absolute origin for links + assets)
// ---------------------------------------------------------------------------
export interface EmailBranding {
  schoolName: string;
  shortName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  origin: string;
  crestUrl: string;
  year: number;
}

let brandingCache: { value: EmailBranding; expiresAt: number } | null = null;
const BRANDING_TTL_MS = 60_000;

function originUrl(): string {
  const raw = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Resolve school branding from SiteSettings (cached 60s), with safe defaults. */
export async function getEmailBranding(): Promise<EmailBranding> {
  const now = Date.now();
  if (brandingCache && brandingCache.expiresAt > now) return brandingCache.value;

  let settings: any = null;
  try {
    settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    // ignore — fall back to defaults below
  }

  const origin = originUrl();
  const value: EmailBranding = {
    schoolName: settings?.schoolName || "Trail Gliders Academy",
    shortName: settings?.shortName || "TGA",
    tagline: settings?.tagline || "Excellence as You Glide Beyond Limits",
    email: settings?.email || "info@trailgliders.com.ng",
    phone: settings?.phone || "+234 803 456 7890",
    address: settings?.address || "57 Obukpa Estate, Nsukka, Enugu State, Nigeria",
    origin,
    crestUrl: `${origin}/crest/school-crest.png`,
    year: new Date().getFullYear(),
  };

  brandingCache = { value, expiresAt: now + BRANDING_TTL_MS };
  return value;
}

// ---------------------------------------------------------------------------
// Small HTML helpers
// ---------------------------------------------------------------------------

/** Escape user-supplied text before interpolating into HTML. */
export function esc(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ButtonOpts {
  label: string;
  href: string;
  variant?: "primary" | "outline";
}

/** Bulletproof-ish CTA button (table-based for Outlook). */
function button({ label, href, variant = "primary" }: ButtonOpts): string {
  const bg = variant === "primary" ? COLORS.orange : COLORS.white;
  const fg = variant === "primary" ? COLORS.white : COLORS.navy;
  const border = variant === "primary" ? COLORS.orange : COLORS.silver;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 8px;">
    <tr>
      <td align="center" bgcolor="${bg}" style="border-radius:9999px;">
        <a href="${esc(href)}" target="_blank"
           style="display:inline-block;padding:14px 36px;font-family:Helvetica,Arial,sans-serif;
                  font-size:15px;font-weight:700;line-height:1;color:${fg};text-decoration:none;
                  border:2px solid ${border};border-radius:9999px;letter-spacing:.2px;">
          ${esc(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

interface InfoRow {
  label: string;
  value: string;
}

/** A clean label/value detail card (used by contact + welcome emails). */
function detailCard(rows: InfoRow[]): string {
  const body = rows
    .map(
      (r, i) => `
      <tr>
        <td style="padding:${i === 0 ? "0" : "10px"} 0 10px 0;border-top:${
        i === 0 ? "none" : `1px solid ${COLORS.silver}`
      };font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;
                 text-transform:uppercase;letter-spacing:.6px;color:${COLORS.silverDark};width:38%;vertical-align:top;">
          ${esc(r.label)}
        </td>
        <td style="padding:${i === 0 ? "0" : "10px"} 0 10px 0;border-top:${
        i === 0 ? "none" : `1px solid ${COLORS.silver}`
      };font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${COLORS.ink};vertical-align:top;">
          ${r.value}
        </td>
      </tr>`
    )
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${COLORS.cream};border:1px solid ${COLORS.silver};border-radius:12px;
                padding:20px 22px;margin:8px 0 4px;">
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>
    </td></tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Base layout
// ---------------------------------------------------------------------------
interface LayoutOpts {
  brand: EmailBranding;
  preheader: string; // hidden inbox-preview text
  eyebrow?: string; // small label above the heading
  heading: string;
  bodyHtml: string; // pre-rendered inner content
}

function layout({ brand, preheader, eyebrow, heading, bodyHtml }: LayoutOpts): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#EEF1F6;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#EEF1F6;">
    ${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF1F6;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:600px;background:${COLORS.white};border-radius:18px;overflow:hidden;
                      box-shadow:0 10px 30px rgba(10,31,68,0.10);">

          <!-- Header band -->
          <tr>
            <td style="background:${COLORS.navy};
                       background-image:linear-gradient(135deg,${COLORS.navy} 0%,${COLORS.navyLight} 100%);
                       padding:30px 40px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${esc(brand.crestUrl)}" width="46" height="46" alt="${esc(brand.shortName)}"
                         style="display:inline-block;vertical-align:middle;border:0;border-radius:8px;background:${COLORS.white};">
                    <span style="display:inline-block;vertical-align:middle;margin-left:12px;
                                 font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:800;
                                 letter-spacing:.3px;color:${COLORS.white};">
                      ${esc(brand.schoolName)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent rule (orange → gold) -->
          <tr><td style="height:4px;line-height:4px;font-size:0;
                         background:${COLORS.orange};
                         background-image:linear-gradient(90deg,${COLORS.orange} 0%,${COLORS.gold} 100%);">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:38px 40px 30px;font-family:Helvetica,Arial,sans-serif;">
              ${
                eyebrow
                  ? `<p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;
                              letter-spacing:1.4px;color:${COLORS.orange};">${esc(eyebrow)}</p>`
                  : ""
              }
              <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:800;color:${COLORS.navy};">
                ${esc(heading)}
              </h1>
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${COLORS.navyDark};padding:26px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Helvetica,Arial,sans-serif;">
                    <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:${COLORS.white};">
                      ${esc(brand.schoolName)}
                    </p>
                    <p style="margin:0 0 14px;font-size:12px;font-style:italic;color:${COLORS.gold};">
                      ${esc(brand.tagline)}
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.7;color:${COLORS.silver};">
                      ${esc(brand.address)}<br>
                      <a href="tel:${esc(brand.phone.replace(/\s+/g, ""))}" style="color:${COLORS.silver};text-decoration:none;">${esc(brand.phone)}</a>
                      &nbsp;&bull;&nbsp;
                      <a href="mailto:${esc(brand.email)}" style="color:${COLORS.silver};text-decoration:none;">${esc(brand.email)}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;border-top:1px solid rgba(200,205,214,0.18);">
                    <p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${COLORS.silverDark};">
                      &copy; ${brand.year} ${esc(brand.schoolName)}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${COLORS.silverDark};">
          This is an automated message from ${esc(brand.schoolName)}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** A standard body paragraph in brand ink. */
function p(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.ink};">${html}</p>`;
}

/** A small muted note / fine print. */
function note(html: string): string {
  return `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${COLORS.muted};">${html}</p>`;
}

/** A copy-paste fallback link block. */
function rawLink(href: string): string {
  return `
  <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${COLORS.muted};">
    Or copy and paste this link into your browser:<br>
    <a href="${esc(href)}" style="color:${COLORS.orangeDark};word-break:break-all;">${esc(href)}</a>
  </p>`;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
export interface SendResult {
  sent: boolean;
  skipped?: "no-smtp" | "no-master-key";
  error?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/**
 * Resolve SMTP config: prefer the encrypted vault, fall back to env vars.
 * Returns null if no usable config is found.
 */
async function resolveSmtp(): Promise<SmtpConfig | null> {
  let host = "";
  let port = "";
  let user = "";
  let pass = "";
  let from = "";

  if (isMasterKeyConfigured()) {
    try {
      const s = await getSecretValues([
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "SMTP_FROM",
      ]);
      host = s.SMTP_HOST || "";
      port = s.SMTP_PORT || "";
      user = s.SMTP_USER || "";
      pass = s.SMTP_PASSWORD || "";
      from = s.SMTP_FROM || "";
    } catch {
      // fall through to env
    }
  }

  // Env-var fallback (useful in CI / non-vault deployments)
  host = host || process.env.SMTP_HOST || "";
  port = port || process.env.SMTP_PORT || "";
  user = user || process.env.SMTP_USER || "";
  pass = pass || process.env.SMTP_PASSWORD || "";
  from = from || process.env.SMTP_FROM || "";

  if (!host || !user || !pass) return null;

  return {
    host,
    port: parseInt(port || "587", 10),
    user,
    pass,
    from: from || user,
  };
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Override the From header (defaults to SMTP_FROM). Display name added if absent. */
  fromName?: string;
}

/**
 * Low-level send. Fails soft: returns { sent:false } if SMTP isn't configured.
 * Throws only on an actual send error (caller decides whether to swallow it).
 */
export async function sendMail(input: SendMailInput): Promise<SendResult> {
  const smtp = await resolveSmtp();
  if (!smtp) {
    return { sent: false, skipped: isMasterKeyConfigured() ? "no-smtp" : "no-master-key" };
  }

  const nodemailer = await import("nodemailer").catch(() => null);
  if (!nodemailer) return { sent: false, skipped: "no-smtp" };

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  // Build the From header with a display name when one isn't already present.
  const from =
    input.fromName && !/[<]/.test(smtp.from)
      ? `"${input.fromName}" <${smtp.from}>`
      : smtp.from;

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { sent: true };
  } finally {
    transporter.close();
  }
}

// ===========================================================================
// TEMPLATE 1 — Password reset
// ===========================================================================
export interface PasswordResetInput {
  to: string;
  name: string;
  resetLink: string;
  /** Human-friendly validity window, e.g. "1 hour". */
  expiresInLabel?: string;
}

export async function sendPasswordResetEmail(input: PasswordResetInput): Promise<SendResult> {
  const brand = await getEmailBranding();
  const validity = input.expiresInLabel || "1 hour";
  const heading = "Reset your password";

  const bodyHtml = `
    ${p(`Hello ${esc(input.name)},`)}
    ${p(`We received a request to reset the password for your <strong>${esc(brand.schoolName)}</strong> admin account. Click the button below to choose a new password.`)}
    ${button({ label: "Reset my password", href: input.resetLink })}
    ${rawLink(input.resetLink)}
    ${note(`This link is valid for <strong>${esc(validity)}</strong> and can be used only once.`)}
    ${note(`If you didn't request this, you can safely ignore this email — your password will stay the same and your account remains secure.`)}
  `;

  const html = layout({
    brand,
    preheader: `Reset your ${brand.schoolName} admin password. This link expires in ${validity}.`,
    eyebrow: "Account security",
    heading,
    bodyHtml,
  });

  const text = `Hello ${input.name},

We received a request to reset the password for your ${brand.schoolName} admin account.

Reset link (valid for ${validity}, single use):
${input.resetLink}

If you didn't request this, you can safely ignore this email — your password will stay the same.

— ${brand.schoolName}
${brand.address}`;

  return sendMail({
    to: input.to,
    subject: `Reset your ${brand.schoolName} password`,
    html,
    text,
    fromName: brand.schoolName,
  });
}

// ===========================================================================
// TEMPLATE 2 — Signup / welcome (new admin or editor account)
// ===========================================================================
export interface WelcomeInput {
  to: string;
  name: string;
  email: string;
  role: string;
  loginLink?: string;
  mustChangePassword?: boolean;
  requireTwoFactor?: boolean;
}

export async function sendWelcomeEmail(input: WelcomeInput): Promise<SendResult> {
  const brand = await getEmailBranding();
  const loginLink = input.loginLink || `${brand.origin}/admin/login`;
  const heading = `Welcome to ${brand.schoolName}`;

  const checklist: string[] = [];
  if (input.mustChangePassword) {
    checklist.push(
      "Set a new password of your own on first sign-in (your temporary password was shared with you separately)."
    );
  }
  if (input.requireTwoFactor) {
    checklist.push(
      "Enable two-factor authentication (2FA) to keep the account secure — you'll be guided through it after login."
    );
  }

  const checklistHtml = checklist.length
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:6px 0 4px;">
      ${checklist
        .map(
          (item) => `
        <tr>
          <td width="26" valign="top" style="font-family:Helvetica,Arial,sans-serif;font-size:15px;
                     color:${COLORS.orange};font-weight:800;line-height:1.6;">&#10003;</td>
          <td style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;
                     color:${COLORS.ink};padding-bottom:8px;">${esc(item)}</td>
        </tr>`
        )
        .join("")}
    </table>`
    : "";

  const bodyHtml = `
    ${p(`Hi ${esc(input.name)},`)}
    ${p(`An account has been created for you on the <strong>${esc(brand.schoolName)}</strong> admin portal. Here are your account details:`)}
    ${detailCard([
      { label: "Name", value: esc(input.name) },
      { label: "Email", value: esc(input.email) },
      { label: "Role", value: `<span style="display:inline-block;padding:3px 12px;border-radius:9999px;background:${COLORS.navy};color:${COLORS.white};font-size:12px;font-weight:700;letter-spacing:.5px;">${esc(input.role)}</span>` },
    ])}
    ${checklist.length ? p(`<strong>A couple of quick first steps:</strong>`) : ""}
    ${checklistHtml}
    ${button({ label: "Sign in to the portal", href: loginLink })}
    ${rawLink(loginLink)}
    ${note(`If you weren't expecting this account, please contact your site administrator at <a href="mailto:${esc(brand.email)}" style="color:${COLORS.orangeDark};">${esc(brand.email)}</a>.`)}
  `;

  const html = layout({
    brand,
    preheader: `Your ${brand.schoolName} admin account is ready. Sign in to get started.`,
    eyebrow: "Account created",
    heading,
    bodyHtml,
  });

  const textSteps = checklist.length
    ? `\nFirst steps:\n${checklist.map((c) => `  - ${c}`).join("\n")}\n`
    : "";

  const text = `Hi ${input.name},

An account has been created for you on the ${brand.schoolName} admin portal.

  Name:  ${input.name}
  Email: ${input.email}
  Role:  ${input.role}
${textSteps}
Sign in here: ${loginLink}

If you weren't expecting this, contact your site administrator at ${brand.email}.

— ${brand.schoolName}`;

  return sendMail({
    to: input.to,
    subject: `Welcome to ${brand.schoolName} — your account is ready`,
    html,
    text,
    fromName: brand.schoolName,
  });
}

// ===========================================================================
// TEMPLATE 3 — Contact form notification (to the school inbox)
// ===========================================================================
export interface ContactNotificationInput {
  to: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  ip?: string;
}

export async function sendContactNotificationEmail(
  input: ContactNotificationInput
): Promise<SendResult> {
  const brand = await getEmailBranding();
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const heading = "New contact form submission";

  const messageHtml = esc(input.message).replace(/\r?\n/g, "<br>");

  const bodyHtml = `
    ${p(`You've received a new enquiry through the website contact form.`)}
    ${detailCard([
      { label: "From", value: esc(fullName) },
      { label: "Email", value: `<a href="mailto:${esc(input.email)}" style="color:${COLORS.orangeDark};text-decoration:none;">${esc(input.email)}</a>` },
      { label: "Phone", value: esc(input.phone || "—") },
      { label: "Subject", value: esc(input.subject) },
    ])}
    <p style="margin:18px 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${COLORS.silverDark};">Message</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${COLORS.white};border-left:4px solid ${COLORS.orange};
                  border-radius:6px;background:${COLORS.cream};">
      <tr><td style="padding:16px 18px;font-family:Helvetica,Arial,sans-serif;font-size:15px;
                     line-height:1.65;color:${COLORS.ink};">${messageHtml}</td></tr>
    </table>
    ${button({ label: `Reply to ${esc(input.firstName)}`, href: `mailto:${input.email}?subject=${encodeURIComponent("Re: " + input.subject)}` })}
    ${note(`Submitted from ${esc(brand.origin)}${input.ip ? ` &bull; IP ${esc(input.ip)}` : ""}`)}
  `;

  const html = layout({
    brand,
    preheader: `${fullName}: ${input.subject}`,
    eyebrow: "Website enquiry",
    heading,
    bodyHtml,
  });

  const text = `New contact form submission

From:    ${fullName}
Email:   ${input.email}
Phone:   ${input.phone || "(not provided)"}
Subject: ${input.subject}

Message:
${input.message}

---
Submitted from ${brand.origin}${input.ip ? `\nIP: ${input.ip}` : ""}`;

  return sendMail({
    to: input.to,
    subject: `[Contact] ${input.subject}`,
    html,
    text,
    replyTo: input.email,
    fromName: `${brand.schoolName} Website`,
  });
}

// ===========================================================================
// TEMPLATE 4 — Contact form auto-reply (to the person who wrote in)
// ===========================================================================
export interface ContactAutoReplyInput {
  to: string;
  firstName: string;
  subject: string;
  message: string;
}

export async function sendContactAutoReplyEmail(
  input: ContactAutoReplyInput
): Promise<SendResult> {
  const brand = await getEmailBranding();
  const heading = "Thanks for reaching out";
  const messageHtml = esc(input.message).replace(/\r?\n/g, "<br>");

  const bodyHtml = `
    ${p(`Hi ${esc(input.firstName)},`)}
    ${p(`Thank you for contacting <strong>${esc(brand.schoolName)}</strong>. We've received your message and a member of our team will get back to you within <strong>24 hours</strong>.`)}
    ${p(`For your records, here's a copy of what you sent:`)}
    ${detailCard([{ label: "Subject", value: esc(input.subject) }])}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${COLORS.cream};border-left:4px solid ${COLORS.gold};border-radius:6px;">
      <tr><td style="padding:16px 18px;font-family:Helvetica,Arial,sans-serif;font-size:15px;
                     line-height:1.65;color:${COLORS.ink};">${messageHtml}</td></tr>
    </table>
    ${note(`If your enquiry is urgent, you can call us on <a href="tel:${esc(brand.phone.replace(/\s+/g, ""))}" style="color:${COLORS.orangeDark};">${esc(brand.phone)}</a>.`)}
  `;

  const html = layout({
    brand,
    preheader: `We've received your message and will reply within 24 hours.`,
    eyebrow: "Message received",
    heading,
    bodyHtml,
  });

  const text = `Hi ${input.firstName},

Thank you for contacting ${brand.schoolName}. We've received your message and will get back to you within 24 hours.

For your records, here's what you sent:
Subject: ${input.subject}

${input.message}

If your enquiry is urgent, call us on ${brand.phone}.

— ${brand.schoolName}
${brand.address}`;

  return sendMail({
    to: input.to,
    subject: `We've received your message — ${brand.schoolName}`,
    html,
    text,
    replyTo: brand.email,
    fromName: brand.schoolName,
  });
}