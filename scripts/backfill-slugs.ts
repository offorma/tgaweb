/**
 * Backfill slugs for existing records.
 *
 * Run after applying the schema migration (which adds `slug` columns).
 * Generates a kebab-case slug from each record's title/name/question and
 * ensures uniqueness with -2, -3 suffixes.
 *
 * Usage:
 *   npx tsx scripts/backfill-slugs.ts   (local dev)
 *   node scripts/dist/backfill-slugs.js (cPanel)
 *
 * Safe to run multiple times — skips records that already have a slug.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(
  base: string,
  finder: (slug: string) => Promise<unknown | null>,
  currentId?: string,
): Promise<string> {
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await finder(slug);
    if (!existing || (currentId && (existing as any)?.id === currentId)) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function backfill() {
  console.log("━".repeat(60));
  console.log("  Backfilling slugs for existing records");
  console.log("━".repeat(60));

  // News
  const news = await db.newsItem.findMany({ where: { slug: "" } });
  console.log(`\nNews items without slug: ${news.length}`);
  for (const item of news) {
    const base = slugify(item.title);
    const slug = await ensureUniqueSlug(base, (s) =>
      db.newsItem.findUnique({ where: { slug: s } }), item.id);
    await db.newsItem.update({ where: { id: item.id }, data: { slug } });
    console.log(`  ✓ ${item.title} → ${slug}`);
  }

  // Programs
  const programs = await db.program.findMany({ where: { slug: "" } });
  console.log(`\nPrograms without slug: ${programs.length}`);
  for (const item of programs) {
    const base = slugify(item.name);
    const slug = await ensureUniqueSlug(base, (s) =>
      db.program.findUnique({ where: { slug: s } }), item.id);
    await db.program.update({ where: { id: item.id }, data: { slug } });
    console.log(`  ✓ ${item.name} → ${slug}`);
  }

  // Faculty
  const faculty = await db.faculty.findMany({ where: { slug: "" } });
  console.log(`\nFaculty without slug: ${faculty.length}`);
  for (const item of faculty) {
    const base = slugify(item.name);
    const slug = await ensureUniqueSlug(base, (s) =>
      db.faculty.findUnique({ where: { slug: s } }), item.id);
    await db.faculty.update({ where: { id: item.id }, data: { slug } });
    console.log(`  ✓ ${item.name} → ${slug}`);
  }

  // Testimonials
  const testimonials = await db.testimonial.findMany({ where: { slug: "" } });
  console.log(`\nTestimonials without slug: ${testimonials.length}`);
  for (const item of testimonials) {
    const base = slugify(item.name);
    const slug = await ensureUniqueSlug(base, (s) =>
      db.testimonial.findUnique({ where: { slug: s } }), item.id);
    await db.testimonial.update({ where: { id: item.id }, data: { slug } });
    console.log(`  ✓ ${item.name} → ${slug}`);
  }

  // FAQs
  const faqs = await db.faq.findMany({ where: { slug: "" } });
  console.log(`\nFAQs without slug: ${faqs.length}`);
  for (const item of faqs) {
    const base = slugify(item.question);
    const slug = await ensureUniqueSlug(base, (s) =>
      db.faq.findUnique({ where: { slug: s } }), item.id);
    await db.faq.update({ where: { id: item.id }, data: { slug } });
    console.log(`  ✓ ${item.question.slice(0, 50)}... → ${slug}`);
  }

  // Campus items
  const campus = await db.campusItem.findMany({ where: { slug: "" } });
  console.log(`\nCampus items without slug: ${campus.length}`);
  for (const item of campus) {
    const base = slugify(item.title);
    const slug = await ensureUniqueSlug(base, (s) =>
      db.campusItem.findUnique({ where: { slug: s } }), item.id);
    await db.campusItem.update({ where: { id: item.id }, data: { slug } });
    console.log(`  ✓ ${item.title} → ${slug}`);
  }

  console.log("\n" + "━".repeat(60));
  console.log("  ✓ Done — all slugs backfilled");
  console.log("━".repeat(60));
  await db.$disconnect();
}

backfill().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
