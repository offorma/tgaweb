const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  PageOrientation, TabStopType, TabStopPosition, TableOfContents,
  LevelFormat, convertInchesToTwip,
} = require("docx");
const fs = require("fs");

// Palette: Warm Sun (Education)
const palette = {
  primary: "#2A3518",
  body: "#384228",
  secondary: "#6B8040",
  accent: "#D4A030",
  surface: "#F8FAF4",
};

const FONT = { ascii: "Calibri", eastAsia: "Microsoft YaHei" };
const FONT_BOLD = { ascii: "Calibri", eastAsia: "Microsoft YaHei" };

// Helpers
function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, font: FONT_BOLD, color: palette.primary })],
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, font: FONT_BOLD, color: palette.primary })],
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 26, font: FONT_BOLD, color: palette.body })],
  });
}

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80, line: 312 },
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text, size: 22, font: FONT, color: palette.body, ...opts })],
  });
}

function PBold(text) {
  return P(text, { bold: true });
}

function Bullet(text, level = 0) {
  return new Paragraph({
    spacing: { before: 40, after: 40, line: 312 },
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, size: 22, font: FONT, color: palette.body })],
  });
}

function BulletBold(label, text, level = 0) {
  return new Paragraph({
    spacing: { before: 40, after: 40, line: 312 },
    numbering: { reference: "bullets", level },
    children: [
      new TextRun({ text: label, size: 22, font: FONT_BOLD, color: palette.body, bold: true }),
      new TextRun({ text: " " + text, size: 22, font: FONT, color: palette.body }),
    ],
  });
}

function Numbered(text, level = 0) {
  return new Paragraph({
    spacing: { before: 40, after: 40, line: 312 },
    numbering: { reference: "numbered", level },
    children: [new TextRun({ text, size: 22, font: FONT, color: palette.body })],
  });
}

function Spacer() {
  return new Paragraph({ spacing: { before: 120, after: 120 }, children: [] });
}

function InfoBox(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 3, color: palette.accent },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: palette.accent },
      left: { style: BorderStyle.SINGLE, size: 3, color: palette.accent },
      right: { style: BorderStyle.SINGLE, size: 1, color: palette.accent },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            shading: { type: ShadingType.CLEAR, fill: palette.surface },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 60, line: 312 },
                children: [new TextRun({ text: title, bold: true, size: 22, font: FONT_BOLD, color: palette.primary })],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0, line: 312 },
                children: [new TextRun({ text, size: 20, font: FONT, color: palette.body })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function TableRow2(col1, col2, header = false) {
  return new TableRow({
    tableHeader: header,
    cantSplit: true,
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: header ? { type: ShadingType.CLEAR, fill: palette.primary } : undefined,
        children: [new Paragraph({
          spacing: { before: 0, after: 0, line: 312 },
          children: [new TextRun({ text: col1, bold: true, size: 22, font: FONT_BOLD, color: header ? "FFFFFF" : palette.primary })],
        })],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: header ? { type: ShadingType.CLEAR, fill: palette.primary } : undefined,
        children: [new Paragraph({
          spacing: { before: 0, after: 0, line: 312 },
          children: [new TextRun({ text: col2, size: 22, font: FONT, color: header ? "FFFFFF" : palette.body })],
        })],
      }),
    ],
  });
}

function makeTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: palette.secondary },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: palette.secondary },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows,
  });
}

// ======================== DOCUMENT ========================
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      },
      {
        reference: "numbered",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  sections: [
    // ===== COVER PAGE =====
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 4000 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200, line: 312 },
          children: [new TextRun({ text: "TRAIL GLIDERS ACADEMY", bold: true, size: 56, font: FONT_BOLD, color: palette.primary })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 100, line: 312 },
          children: [new TextRun({ text: "Nsukka, Enugu State, Nigeria", size: 24, font: FONT, color: palette.secondary })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100, line: 312 },
          children: [new TextRun({ text: "Excellence as You Glide Beyond Limits", italics: true, size: 28, font: FONT, color: palette.accent })],
        }),
        new Paragraph({ spacing: { before: 1200 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 100, line: 312 },
          children: [new TextRun({ text: "COMPLETE USER GUIDE", bold: true, size: 44, font: FONT_BOLD, color: palette.body })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 312 },
          children: [new TextRun({ text: "Website, Admin Panel & All Features", size: 24, font: FONT, color: palette.secondary })],
        }),
        new Paragraph({ spacing: { before: 2000 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 312 },
          children: [new TextRun({ text: "Version 1.0  |  June 2026", size: 20, font: FONT, color: palette.secondary })],
        }),
        new Paragraph({
          children: [new PageBreak()],
        }),
      ],
    },

    // ===== TABLE OF CONTENTS =====
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 200, line: 312 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 36, font: FONT_BOLD, color: palette.primary })],
        }),
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({
          spacing: { before: 200, after: 0, line: 312 },
          children: [new TextRun({ text: "Right-click the table of contents and select \u201cUpdate Field\u201d to refresh page numbers.", italics: true, size: 18, font: FONT, color: palette.secondary })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },

    // ===== BODY =====
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: 0, line: 240 },
            children: [new TextRun({ text: "Trail Gliders Academy \u2014 User Guide", size: 18, font: FONT, color: palette.secondary, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240 },
            children: [
              new TextRun({ text: "Page ", size: 18, font: FONT, color: palette.secondary }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT, color: palette.secondary }),
              new TextRun({ text: " of ", size: 18, font: FONT, color: palette.secondary }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: FONT, color: palette.secondary }),
            ],
          })],
        }),
      },
      children: [
        // === 1. INTRODUCTION ===
        H1("1. Introduction"),
        P("Welcome to the Trail Gliders Academy website \u2014 a comprehensive school management and content platform built for Trail Gliders Academy in Nsukka, Enugu State, Nigeria. This guide covers every feature of the website, from the public-facing pages to the full admin panel."),
        P("The website consists of two main parts:"),
        BulletBold("Public Website:", "The public-facing site that parents, students, and visitors see. It includes a cinematic hero slideshow, information about programs and faculty, admissions process, news, a contact form, and multi-language support."),
        BulletBold("Admin Panel:", "A secure backend (accessible at /admin) where school staff can manage all website content, configure settings, manage users, store encrypted secrets (SMTP passwords, payment keys), and monitor security."),
        P("This guide will walk you through every feature step by step, with clear instructions for both administrators and content editors."),

        // === 2. GETTING STARTED ===
        H1("2. Getting Started"),
        H2("2.1 Accessing the Website"),
        P("The public website is available at your domain (e.g., https://trailgliders.edu.ng). No login is required to view the public site."),
        H2("2.2 Accessing the Admin Panel"),
        P("The admin panel is accessible at https://trailgliders.edu.ng/admin/login. You will need an admin account to sign in."),
        InfoBox("Default Admin Credentials", "Email: admin@trailgliders.edu.ng  |  Password: TrailGliders2026!  \u2014  Change this password immediately after first login via Settings > Security tab."),
        H2("2.3 First-Time Setup Checklist"),
        Numbered("Sign in to the admin panel at /admin/login"),
        Numbered("Change the default admin password (Settings > Security > Change Password)"),
        Numbered("Update school name, tagline, and contact info (Settings > General + Contact Info tabs)"),
        Numbered("Configure the Apply button (Settings > Apply Button tab)"),
        Numbered("Add social media links (Settings > Social Media tab)"),
        Numbered("Set up SMTP email credentials (Secrets Vault > Add from Template > SMTP Credentials)"),
        Numbered("Enable Two-Factor Authentication (Settings > Security > Enable 2FA)"),
        Numbered("Review and customize hero slides (Hero Slides in sidebar)"),
        Numbered("Add or edit faculty profiles (Faculty in sidebar)"),
        Numbered("Post your first news item (News & Events in sidebar)"),

        // === 3. PUBLIC WEBSITE FEATURES ===
        H1("3. Public Website Features"),
        H2("3.1 Hero Slideshow"),
        P("The homepage features a cinematic slideshow with multiple transition effects (fade, slide, zoom, curtain), Ken Burns zoom, parallax depth control, and optional video backgrounds. Slides auto-advance every 5-7 seconds and can be controlled via:"),
        Bullet("Left/right arrow buttons on the sides"),
        Bullet("Dot indicators at the bottom (with progress bar)"),
        Bullet("Thumbnail navigation strip (desktop only)"),
        Bullet("Pause/Play autoplay toggle button"),
        Bullet("Keyboard arrow keys (Left/Right)"),
        H2("3.2 Navigation"),
        P("The navigation bar includes links to all major sections: Home, About, Academics, Campus Life, Admissions, News, and Contact. A top utility bar shows the school phone number, office hours, social media links, and a language switcher."),
        H2("3.3 Language Switching"),
        P("The website supports 5 languages: English (default), French, Hausa, Igbo, and Yoruba. Click the globe icon (\uD83C\uDF10) in the navbar or footer to switch languages. The choice is saved for 1 year via a cookie. All UI labels (navigation, headings, buttons, form labels) switch instantly."),
        H2("3.4 Contact Form"),
        P("The contact form includes multi-layer bot defense: a math CAPTCHA, time-trap (minimum 2 seconds), honeypot fields, bot user-agent blocking, and optional Cloudflare Turnstile. Form submissions are sent via email if SMTP is configured."),
        H2("3.5 Newsletter Signup"),
        P("The footer includes a newsletter signup form. When a user focuses the email field, a math CAPTCHA expands for verification. Submissions are stored in the database and audit-logged."),
        H2("3.6 Other Sections"),
        P("The site also includes: About (mission/vision/values), Statistics (animated counters), Why Choose Us (feature cards), Academics (3 program tabs), Campus Life (photo mosaic), Faculty (teacher cards with quotes), Testimonials (auto-rotating carousel), Admissions (4-step timeline), News & Events (cards), and FAQ (accordion)."),

        // === 4. ADMIN DASHBOARD ===
        H1("4. Admin Dashboard"),
        P("After signing in, you'll see the dashboard with three sections:"),
        H2("4.1 Quick Actions"),
        P("Six shortcut cards linking to the most common admin tasks: Edit Settings, Manage Programs, Manage Faculty, Post News, Add Testimonial, and Edit FAQs. Each card has a tooltip explaining what the destination page does."),
        H2("4.2 Content Overview"),
        P("Eight stat cards showing the count of each content type: Programs, Faculty, Testimonials, News Items, FAQs, Statistics, Admission Steps, and Campus Items. Click any card to jump to that management page."),
        H2("4.3 Recent Activity"),
        P("A log of the most recent admin actions (logins, content updates, secret reveals, etc.) with timestamps, user emails, and IP addresses."),

        // === 5. SITE SETTINGS ===
        H1("5. Managing Site Settings"),
        P("The Settings page has 10 tabs plus a search bar that lets you find any setting across all tabs instantly."),
        H2("5.1 Settings Search"),
        P("Type any keyword (e.g., \"phone\", \"hero\", \"facebook\") in the search bar to instantly find matching fields across all tabs. Results show in a flat list with section badges. Edit fields inline, then click \"Save All Changes\"."),
        H2("5.2 Available Tabs"),
        makeTable([
          TableRow2("Tab", "What You Can Edit", true),
          TableRow2("General", "School name, short name, tagline, motto, founding year, crest image"),
          TableRow2("Hero Section", "Top badge text, headline (2 lines), description paragraph"),
          TableRow2("About Section", "Section heading, intro paragraph, mission statement, vision statement"),
          TableRow2("Admissions", "Section heading, intro paragraph, deadline text, open day text"),
          TableRow2("Apply Button", "Show/hide toggle, button text, action type (scroll/external/mailto), URL, style"),
          TableRow2("Social Media", "Facebook, Instagram, YouTube, Twitter/X URLs (leave blank to hide)"),
          TableRow2("Footer Links", "Admissions Portal, Fee Structure, School Calendar, Parent Portal, Alumni, Careers URLs"),
          TableRow2("Contact Info", "Address, location, phone, alternate phone, email, admissions email, office hours"),
          TableRow2("Security", "Change password, Enable/disable 2FA, regenerate backup codes"),
          TableRow2("Security Policy", "Enforce 2FA for admins/editors, min password length, session timeout"),
        ]),
        Spacer(),
        InfoBox("Tip", "Every field has a (?) tooltip icon. Hover over it to see a detailed explanation of what the field controls and where it appears on the public site."),

        // === 6. HERO SLIDES ===
        H1("6. Managing Hero Slides"),
        P("The Hero Slides page lets you manage the background slideshow on the homepage. Each slide can have its own image, text, transition effect, duration, and layout."),
        H2("6.1 Adding a Slide"),
        Numbered("Click \"Add Slide\" button"),
        Numbered("Fill in the fields in the dialog:"),
        Bullet("Background Image: path to image (e.g., /images/hero.jpg)", 1),
        Bullet("Video URL (optional): path to .mp4 for video background", 1),
        Bullet("Badge: small orange pill text (e.g., \"Admissions Open\")", 1),
        Bullet("Title: large headline text", 1),
        Bullet("Subtitle: description paragraph", 1),
        Bullet("Button Label + URL: custom CTA per slide", 1),
        Bullet("Transition Type: Fade, Slide, Zoom, or Curtain", 1),
        Bullet("Slide Duration: 2000-30000ms (how long before advancing)", 1),
        Bullet("Text Position: Left (with crest), Center (full-width), or Right", 1),
        Bullet("Parallax Depth: 0-50 (controls Ken Burns zoom + scroll parallax intensity)", 1),
        Bullet("Active: toggle to show/hide without deleting", 1),
        Numbered("A live preview at the top of the dialog updates in real-time as you type"),
        Numbered("Click \"Save Slide\""),
        H2("6.2 Drag-to-Reorder"),
        P("Each slide card has a drag handle (\u2261 icon) on the left. Click and drag slides up or down to reorder. The new order is saved automatically via the API."),
        H2("6.3 Inline Preview"),
        P("Each slide card has an Eye icon button. Click it to expand a full 16:9 preview of the slide below the card. Click again to collapse."),
        H2("6.4 Slide Card Badges"),
        P("Each card shows badges for: slide number, Active/Hidden status, transition type, duration (e.g., 7.0s), text position, and Video indicator."),

        // === 7. CONTENT MANAGEMENT ===
        H1("7. Managing Content"),
        P("Eight content types use the same ListEditor interface: Programs, Faculty, Testimonials, News & Events, Statistics, FAQs, Admissions Steps, and Campus Life. Each has:"),
        Bullet("A search bar to filter items by title/subtitle"),
        Bullet("Visual card grid with thumbnails and badges"),
        Bullet("Add button to create new items"),
        Bullet("Edit (pencil) and Delete (trash) buttons on each card"),
        Bullet("An add/edit dialog with all fields and tooltips"),
        H2("7.1 Content Types Overview"),
        makeTable([
          TableRow2("Content Type", "What It Manages", true),
          TableRow2("Programs", "3 academic programs (Nursery, Lower Primary, Upper Primary) with images, descriptions, features"),
          TableRow2("Faculty", "Teacher profiles with photos, bios, and quotes"),
          TableRow2("Testimonials", "Parent quotes shown in the rotating carousel"),
          TableRow2("News & Events", "News items and events with dates, images, publish toggle"),
          TableRow2("Statistics", "The 4 big numbers (years, pupils, educators, placement rate)"),
          TableRow2("FAQs", "Frequently asked questions in accordion format"),
          TableRow2("Admissions", "The 4-step application process timeline"),
          TableRow2("Campus Life", "Photo grid items (sports, arts, STEM, library, etc.)"),
        ]),

        // === 8. SECRETS VAULT ===
        H1("8. Secrets Vault"),
        P("The Secrets Vault stores sensitive credentials (SMTP passwords, payment gateway keys) encrypted with AES-256-GCM. The master encryption key lives in the server environment variables, never in the database or code."),
        H2("8.1 Adding Secrets"),
        P("Click \"Add from Template\" to choose from pre-built bundles:"),
        BulletBold("SMTP Credentials:", "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM (5 keys)"),
        BulletBold("Paystack Payment Keys:", "PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET (3 keys)"),
        BulletBold("Flutterwave Keys:", "FLW_PUBLIC_KEY, FLW_SECRET_KEY, FLW_ENCRYPTION_KEY (3 keys)"),
        BulletBold("App Config:", "NEXTAUTH_SECRET (1 key)"),
        BulletBold("Cloudflare Turnstile:", "TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY (2 keys)"),
        BulletBold("Custom Secret:", "Add any key/value pair manually"),
        H2("8.2 Managing Secrets"),
        P("Each secret card shows:"),
        Bullet("Key name (e.g., SMTP_PASSWORD)"),
        Bullet("Masked preview (last 4 characters only)"),
        Bullet("Reveal button (audit-logged, returns plaintext)"),
        Bullet("Rotate button (generates new 40-char random value)"),
        Bullet("Copy to clipboard button"),
        Bullet("Edit and Delete buttons"),
        H2("8.3 SMTP Integration"),
        P("When SMTP credentials are stored in the vault, the contact form automatically sends email submissions to the admissions email address. The newsletter form also uses SMTP for notifications."),

        // === 9. USER MANAGEMENT ===
        H1("9. User Management"),
        P("The User Management page lets ADMIN users create and manage admin/editor accounts."),
        H2("9.1 Creating a New User"),
        Numbered("Click \"Invite User\""),
        Numbered("Fill in: Full Name, Email, Role (ADMIN or EDITOR)"),
        Numbered("Set a temporary strong password (12+ chars with upper/lower/digit/symbol)"),
        Numbered("Toggle \"Require 2FA on first login\" (mandatory for ADMIN role)"),
        Numbered("Toggle \"Require password change on first login\""),
        Numbered("Click \"Create User\""),
        Numbered("Share the temporary password with the new user securely (in person or via separate channel)"),
        H2("9.2 User Roles"),
        makeTable([
          TableRow2("Role", "Permissions", true),
          TableRow2("ADMIN", "Full access: all content, settings, secrets vault, user management, security policy"),
          TableRow2("EDITOR", "Content management only: programs, faculty, testimonials, news, stats, FAQs, admissions, campus life"),
        ]),
        H2("9.3 Editing Users"),
        P("Admins can edit user name, role (cannot change own role), active status, force 2FA flag, and reset passwords. Safeguards prevent:"),
        Bullet("Deactivating or demoting yourself"),
        Bullet("Deleting the last active ADMIN account"),
        Bullet("Account lockout (5 failed login attempts = 15-minute lockout)"),

        // === 10. SECURITY FEATURES ===
        H1("10. Security Features"),
        H2("10.1 Two-Factor Authentication (2FA)"),
        P("2FA uses standard TOTP (RFC 6238) compatible with Google Authenticator, Authy, 1Password, and Microsoft Authenticator."),
        P("To enable 2FA:"),
        Numbered("Go to Settings > Security tab"),
        Numbered("Click \"Enable 2FA\""),
        Numbered("Scan the QR code with your authenticator app"),
        Numbered("Enter the 6-digit code from the app"),
        Numbered("Save the 10 backup codes (download .txt or copy)"),
        P("After enabling, every sign-in requires your password + a 6-digit code (or a backup code)."),
        H2("10.2 Password Management"),
        P("Change your password in Settings > Security > Change Password. Requirements: 12+ characters with uppercase, lowercase, digit, and symbol."),
        H2("10.3 Security Policy"),
        P("ADMIN users can configure global security policies in Settings > Security Policy tab:"),
        Bullet("Require 2FA for all ADMIN accounts (recommended)"),
        Bullet("Require 2FA for all EDITOR accounts"),
        Bullet("Minimum password length (8-128, default 12)"),
        Bullet("Session timeout (1-168 hours, default 8)"),
        H2("10.4 Bot Defense"),
        P("All public forms (contact, newsletter) are protected by 5 layers:"),
        Numbered("Math CAPTCHA (signed, server-verified)"),
        Numbered("Time-trap (minimum 2 seconds to submit)"),
        Numbered("3 honeypot fields (hidden from humans, bots fill them)"),
        Numbered("Bot user-agent blocking (25+ bot patterns)"),
        Numbered("Cloudflare Turnstile (optional, configurable via Secrets Vault)"),
        H2("10.5 Other Security Measures"),
        Bullet("Rate limiting: 3 contact submissions/hour, 5 newsletter/hour, 10 password reveals/minute"),
        Bullet("Audit logging: every admin action and login is logged"),
        Bullet("10 security headers: CSP, HSTS, X-Frame-Options DENY, etc."),
        Bullet("AES-256-GCM encryption for all secrets at rest"),
        Bullet("Account lockout after 5 failed login attempts"),
        Bullet("Forgot password flow with email-based reset tokens"),
        Bullet("Strict Zod input validation on all API routes"),
        Bullet("RBAC (role-based access control) on every admin route"),

        // === 11. INTERNATIONALIZATION ===
        H1("11. Internationalization (Languages)"),
        P("The website supports 5 languages: English, French, Hausa, Igbo, and Yoruba."),
        H2("11.1 Switching Languages"),
        P("Click the globe icon (\uD83C\uDF10) in the navbar top bar, mobile menu, or footer. Select a language to instantly switch all UI text. The choice persists for 1 year via a cookie."),
        H2("11.2 What Gets Translated"),
        P("All UI labels are translated: navigation links, section headings, button text, form labels, contact form subjects, footer text, and admin sidebar labels. Database-managed content (program names, faculty bios, news titles) stays in the language the admin typed it in."),
        H2("11.3 Adding More Languages"),
        P("To add a new language:"),
        Numbered("Create a new JSON file in /messages/ (e.g., ar.json for Arabic)"),
        Numbered("Copy the structure from en.json and translate all values"),
        Numbered("Add the locale code to the locales array in /src/i18n/config.ts"),
        Numbered("Add the locale name + flag to localeNames in the same file"),
        Numbered("Restart the server"),

        // === 12. DEPLOYMENT ===
        H1("12. Deployment Guide"),
        P("The website is designed for deployment on cPanel shared hosting with Node.js support, but also works on VPS, Supabase, Neon, Railway, and other platforms."),
        H2("12.1 Quick Deploy Steps"),
        Numbered("Upload the project to your server (via Git or File Manager)"),
        Numbered("Set environment variables in cPanel > Setup Node.js App:"),
        Bullet("DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, SECRETS_MASTER_KEY", 1),
        Numbered("Run: bun install (or npm install)"),
        Numbered("Run: bun run migrate (or npm run migrate) \u2014 creates DB + seeds content"),
        Numbered("Restart the app in cPanel"),
        Numbered("Visit /admin/login and change the default password"),
        Numbered("Configure SMTP credentials in the Secrets Vault"),
        Numbered("Set up SSL (AutoSSL in cPanel)"),
        Numbered("Set up daily DB backups via cPanel Cron Job"),
        H2("12.2 Switching to PostgreSQL"),
        P("For production, PostgreSQL is recommended:"),
        Numbered("Change prisma/schema.prisma: provider = \"postgresql\""),
        Numbered("Set DATABASE_URL to your PostgreSQL connection string"),
        Numbered("Run: bun run migrate (or npm run migrate)"),

        // === 13. TROUBLESHOOTING ===
        H1("13. Troubleshooting"),
        H2("13.1 Cannot Log In"),
        Bullet("Check that you're using the correct email and password"),
        Bullet("If locked out (5 failed attempts), wait 15 minutes or ask another admin to reset your password"),
        Bullet("If you forgot your password, use the \"Forgot password?\" link on the login page"),
        Bullet("If 2FA is enabled, you need both your password AND the 6-digit code from your authenticator app"),
        Bullet("If you lost your authenticator device, use one of the 10 backup codes"),
        H2("13.2 Contact Form Not Sending Email"),
        Bullet("Check that SMTP credentials are configured in Secrets Vault"),
        Bullet("Verify the SMTP host, port, user, and password are correct"),
        Bullet("Use the \"Test SMTP\" feature in Secrets Vault > test-smtp endpoint"),
        Bullet("Check that the admissions email address is correct in Settings > Contact Info"),
        Bullet("Contact form submissions are always audit-logged even if SMTP fails"),
        H2("13.3 Images Not Loading"),
        Bullet("Check that image paths in admin start with /images/ (e.g., /images/hero.jpg)"),
        Bullet("Upload images to the /public/images/ directory on the server"),
        Bullet("For external URLs, use full https:// URLs"),
        H2("13.4 Database Issues"),
        Bullet("Run: bun run db:push (or npm run db:push) to recreate the schema"),
        Bullet("Run: bun run migrate (or npm run migrate) for a full reset + seed"),
        Bullet("For cPanel: verify DATABASE_URL points to a writable path"),
        H2("13.5 Site Changes Not Appearing"),
        Bullet("The public site uses ISR (Incremental Static Regeneration) with a 60-second revalidation cache"),
        Bullet("Changes should appear within 1-2 minutes"),
        Bullet("Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"),
        Bullet("Admin changes are saved instantly to the database"),

        Spacer(),
        P("For additional support, contact the site developer or refer to the DEPLOYMENT.md file included with the project.", { italics: true, color: palette.secondary }),
      ],
    },
  ],
});

// Generate
Packer.toBuffer(doc).then((buffer) => {
  const outPath = "/home/z/my-project/download/Trail-Gliders-Academy-User-Guide.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Generated: " + outPath);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
});
