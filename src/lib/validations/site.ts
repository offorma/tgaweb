import { z } from "zod";

// Common sanitization helpers
const cleanText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Required")
    .max(max, `Must be ${max} characters or fewer`);

const cleanLongText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Required")
    .max(max, `Must be ${max} characters or fewer`);

// Strict URL/path check for images — accept relative paths or https URLs (including Cloudinary with query params)
const imagePath = z
  .string()
  .trim()
  .min(1, "Required")
  .max(1000)
  .regex(
    /^(\/[a-zA-Z0-9._\-\/]+|https:\/\/[a-zA-Z0-9.\-]+\/[a-zA-Z0-9._\-\/,%]+(\?[a-zA-Z0-9._\-=&,%\/]+)?)$/,
    "Must be a relative path (/images/...) or https URL"
  );

export const SiteSettingsSchema = z.strictObject({
  schoolName: cleanText(100),
  shortName: cleanText(20),
  tagline: cleanText(200),
  motto: cleanText(200),
  founded: z.number().int().min(1800).max(2100),
  location: cleanText(200),
  address: cleanText(300),
  phone: cleanText(50),
  phoneAlt: cleanText(50),
  email: z.string().email("Invalid email").max(100),
  admissionsEmail: z.string().email("Invalid email").max(100),
  hours: cleanText(200),
  crestUrl: imagePath,
  heroBadge: cleanText(200),
  heroTitle1: cleanText(100),
  heroTitle2: cleanText(100),
  heroDescription: cleanLongText(1000),
  aboutHeading: cleanText(200),
  aboutParagraph: cleanLongText(2000),
  missionText: cleanLongText(2000),
  visionText: cleanLongText(2000),
  admissionsHeading: cleanText(200),
  admissionsParagraph: cleanLongText(2000),
  admissionsDeadline: cleanText(100),
  admissionsOpenDay: cleanText(100),
  // Apply Now button configuration
  applyButtonEnabled: z.boolean().default(true),
  applyButtonLabel: cleanText(40),
  applyButtonType: z.enum(["scroll", "external", "mailto"]).default("scroll"),
  applyButtonUrl: cleanText(500),
  applyButtonStyle: z.enum(["primary", "outline"]).default("primary"),
  // Social media URLs (empty = hidden)
  facebookUrl: z.string().trim().max(500).default(""),
  instagramUrl: z.string().trim().max(500).default(""),
  youtubeUrl: z.string().trim().max(500).default(""),
  twitterUrl: z.string().trim().max(500).default(""),
  // Footer Resources links (empty = hidden)
  resourceAdmissionsPortal: z.string().trim().max(500).default(""),
  resourceFeeStructure: z.string().trim().max(500).default(""),
  resourceSchoolCalendar: z.string().trim().max(500).default(""),
  resourceParentPortal: z.string().trim().max(500).default(""),
  resourceAlumniNetwork: z.string().trim().max(500).default(""),
  resourceCareers: z.string().trim().max(500).default(""),
});

// Newsletter subscription
export const NewsletterSchema = z.strictObject({
  email: z.string().email("Invalid email").max(120),
  // Honeypot — should be empty for real users; bots fill it (silently dropped in the route)
  website: z.string().optional(),
});

export const StatSchema = z.strictObject({
  value: z.number().int().min(0).max(1_000_000),
  suffix: z.string().max(10).default(""),
  label: cleanText(100),
  description: cleanText(200),
  order: z.number().int().default(0),
});

export const ValueSchema = z.strictObject({
  icon: cleanText(50),
  title: cleanText(100),
  description: cleanLongText(1000),
  order: z.number().int().default(0),
});

export const ProgramSchema = z.strictObject({
  name: cleanText(100),
  ages: cleanText(50),
  image: imagePath,
  color: z.enum(["orange", "navy", "gold"]).default("orange"),
  tagline: cleanText(100),
  description: cleanLongText(2000),
  features: cleanLongText(3000), // newline-separated
  order: z.number().int().default(0),
});

export const FacultySchema = z.strictObject({
  name: cleanText(100),
  role: cleanText(100),
  image: imagePath,
  bio: cleanLongText(1000),
  quote: cleanLongText(500),
  order: z.number().int().default(0),
});

export const TestimonialSchema = z.strictObject({
  name: cleanText(100),
  relation: cleanText(150),
  quote: cleanLongText(2000),
  rating: z.number().int().min(1).max(5).default(5),
  order: z.number().int().default(0),
});

export const NewsItemSchema = z.strictObject({
  date: z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid date"),
  category: z.enum(["News", "Event"]).default("News"),
  tag: cleanText(50),
  title: cleanText(200),
  excerpt: cleanLongText(1000),
  image: imagePath,
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const AdmissionStepSchema = z.strictObject({
  step: cleanText(10),
  title: cleanText(100),
  description: cleanLongText(1000),
  order: z.number().int().default(0),
});

export const FaqSchema = z.strictObject({
  question: cleanText(300),
  answer: cleanLongText(2000),
  order: z.number().int().default(0),
});

export const CampusItemSchema = z.strictObject({
  image: imagePath,
  title: cleanText(100),
  description: cleanText(200),
  order: z.number().int().default(0),
});

export const SlideSchema = z.strictObject({
  image: imagePath,
  videoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  title: cleanText(120),
  subtitle: z.string().trim().max(300).optional().or(z.literal("")),
  badge: z.string().trim().max(100).optional().or(z.literal("")),
  linkUrl: z.string().trim().max(500).optional().or(z.literal("")),
  linkLabel: z.string().trim().max(50).optional().or(z.literal("")),
  transitionType: z.enum(["fade", "slide", "zoom", "curtain"]).default("fade"),
  duration: z.number().int().min(2000).max(30000).default(6500),
  textPosition: z.enum(["left", "center", "right"]).default("left"),
  parallaxDepth: z.number().int().min(0).max(50).default(15),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
});

// File path — same as imagePath but for documents
const filePath = z
  .string()
  .trim()
  .min(1, "Required")
  .max(1000)
  .regex(
    /^(\/[a-zA-Z0-9._\-\/]+|https:\/\/[a-zA-Z0-9.\-]+\/[a-zA-Z0-9._\-\/,%]+(\?[a-zA-Z0-9._\-=&,%\/]+)?)$/,
    "Must be a relative path or https URL"
  );

export const DownloadSchema = z.strictObject({
  name: cleanText(200),
  description: z.string().trim().max(500).default(""),
  url: filePath,
  fileType: cleanText(20),
  fileSize: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

// Login schema
export const LoginSchema = z.strictObject({
  email: z.string().email("Invalid email").max(100),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  csrfToken: z.string().optional(),
});

export type SiteSettingsInput = z.infer<typeof SiteSettingsSchema>;
export type StatInput = z.infer<typeof StatSchema>;
export type ValueInput = z.infer<typeof ValueSchema>;
export type ProgramInput = z.infer<typeof ProgramSchema>;
export type FacultyInput = z.infer<typeof FacultySchema>;
export type TestimonialInput = z.infer<typeof TestimonialSchema>;
export type NewsItemInput = z.infer<typeof NewsItemSchema>;
export type AdmissionStepInput = z.infer<typeof AdmissionStepSchema>;
export type FaqInput = z.infer<typeof FaqSchema>;
export type CampusItemInput = z.infer<typeof CampusItemSchema>;
export type DownloadInput = z.infer<typeof DownloadSchema>;

// ============ Secrets ============

export const SECRET_CATEGORIES = ["app", "email", "payment", "sms", "storage"] as const;
export type SecretCategory = (typeof SECRET_CATEGORIES)[number];

export const SecretSchema = z.strictObject({
  key: z
    .string()
    .trim()
    .min(2, "Key must be at least 2 characters")
    .max(80, "Key must be 80 characters or fewer")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Key must be UPPERCASE_WITH_UNDERSCORES (e.g. SMTP_PASSWORD)"
    ),
  category: z.enum(SECRET_CATEGORIES),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  value: z
    .string()
    .min(1, "Value is required")
    .max(10000, "Value is too long (max 10000 chars)"),
});

export const SecretUpdateSchema = SecretSchema.partial().extend({
  // For updates we may want to NOT change the value (just metadata)
  value: z.string().min(1).max(10000).optional(),
});

export type SecretInput = z.infer<typeof SecretSchema>;
export type SecretUpdateInput = z.infer<typeof SecretUpdateSchema>;

// SMTP test schema
export const SmtpTestSchema = z.strictObject({
  host: z.string().trim().min(1).max(200),
  port: z.number().int().min(1).max(65535),
  user: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(500),
  secure: z.boolean().optional(),
});

// ============ User Management ============

export const UserCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(120).transform((s) => s.toLowerCase().trim()),
  role: z.enum(["ADMIN", "EDITOR"]).default("EDITOR"),
  // Temporary password — must meet the strong-password policy
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(200)
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[0-9]/, "Must include at least one digit")
    .regex(/[^A-Za-z0-9]/, "Must include at least one symbol"),
  // If true, user must enable 2FA on first login (recommended for ADMIN role)
  requireTwoFactor: z.boolean().default(true),
  // If true, user must change the temp password on first login
  requirePasswordChange: z.boolean().default(true),
});

export const UserUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "EDITOR"]).optional(),
  isActive: z.boolean().optional(),
  mustEnable2FA: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
  // Optional password reset (admin sets a new temp password)
  newPassword: z
    .string()
    .min(12)
    .max(200)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/)
    .optional(),
});

export const SecurityPolicySchema = z.strictObject({
  enforceTwoFactorForAdmins: z.boolean(),
  enforceTwoFactorForEditors: z.boolean(),
  minPasswordLength: z.number().int().min(8).max(128),
  sessionTimeoutHours: z.number().int().min(1).max(168),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
export type SecurityPolicyInput = z.infer<typeof SecurityPolicySchema>;
