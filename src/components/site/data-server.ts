/**
 * Public site data — read from DB via the content layer.
 * Falls back to safe defaults if DB is empty (e.g. before seed runs).
 */

import {
  getSiteSettings,
  getStats,
  getValues,
  getPrograms,
  getFaculty,
  getTestimonials,
  getPublishedNews,
  getAdmissionSteps,
  getFaqs,
  getCampusItems,
  getActiveSlides,
  getPublishedDownloads,
} from "@/lib/content";

export { getSiteSettings } from "@/lib/content";

// Type helpers (mirror Prisma models)
type Awaited<T> = T extends Promise<infer U> ? U : T;

export async function getSiteData() {
  const [
    settings,
    stats,
    values,
    programs,
    faculty,
    testimonials,
    news,
    admissionSteps,
    faqs,
    campusItems,
    slides,
    downloads,
  ] = await Promise.all([
    getSiteSettings(),
    getStats(),
    getValues(),
    getPrograms(),
    getFaculty(),
    getTestimonials(),
    getPublishedNews(),
    getAdmissionSteps(),
    getFaqs(),
    getCampusItems(),
    getActiveSlides(),
    getPublishedDownloads(),
  ]);

  return {
    settings,
    stats,
    values,
    programs,
    faculty,
    testimonials,
    news,
    admissionSteps,
    faqs,
    campusItems,
    slides,
    downloads,
  };
}

// Format helper for news dates
export function formatDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
