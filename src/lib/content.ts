import { db } from "@/lib/db";
import type {
  SiteSettings,
  Stat,
  Value,
  Program,
  Faculty,
  Testimonial,
  NewsItem,
  AdmissionStep,
  Faq,
  CampusItem,
  Slide,
} from "@prisma/client";

/**
 * Site content data-access layer.
 * Public site reads from here. Admin writes go through this layer too.
 * Includes a 30-second in-memory cache for the public site to avoid hitting the DB on every render.
 */

type CacheEntry = { value: any; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return Promise.resolve(hit.value as T);
  }
  return fn().then((v) => {
    cache.set(key, { value: v, expiresAt: now + CACHE_TTL_MS });
    return v;
  });
}

export function invalidateCache(...keys: string[]) {
  if (keys.length === 0) cache.clear();
  else keys.forEach((k) => cache.delete(k));
}

// ====== Site Settings (singleton) ======

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return cached("settings", () =>
    db.siteSettings.findUnique({ where: { id: "singleton" } })
  );
}

// ====== Stats ======

export async function getStats(): Promise<Stat[]> {
  return cached("stats", () =>
    db.stat.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== Values ======

export async function getValues(): Promise<Value[]> {
  return cached("values", () =>
    db.value.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== Programs ======

export async function getPrograms(): Promise<Program[]> {
  return cached("programs", () =>
    db.program.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== Faculty ======

export async function getFaculty(): Promise<Faculty[]> {
  return cached("faculty", () =>
    db.faculty.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== Testimonials ======

export async function getTestimonials(): Promise<Testimonial[]> {
  return cached("testimonials", () =>
    db.testimonial.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== News ======

export async function getPublishedNews(): Promise<NewsItem[]> {
  return cached("news", () =>
    db.newsItem.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { date: "desc" }],
    })
  );
}

export async function getAllNews(): Promise<NewsItem[]> {
  return db.newsItem.findMany({
    orderBy: [{ order: "asc" }, { date: "desc" }],
  });
}

// ====== Admission Steps ======

export async function getAdmissionSteps(): Promise<AdmissionStep[]> {
  return cached("admissionSteps", () =>
    db.admissionStep.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== FAQs ======

export async function getFaqs(): Promise<Faq[]> {
  return cached("faqs", () =>
    db.faq.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== Campus Items ======

export async function getCampusItems(): Promise<CampusItem[]> {
  return cached("campusItems", () =>
    db.campusItem.findMany({ orderBy: { order: "asc" } })
  );
}

// ====== Slides (hero slideshow) ======

export async function getActiveSlides(): Promise<Slide[]> {
  return cached("slides", () =>
    db.slide.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    })
  );
}

export async function getAllSlides(): Promise<Slide[]> {
  return db.slide.findMany({ orderBy: { order: "asc" } });
}
