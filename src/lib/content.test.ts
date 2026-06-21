import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the content data-access layer. We mock @/lib/db with fake Prisma
 * delegates and assert: cache hit/miss/TTL-expiry, invalidateCache (targeted +
 * full clear), and the non-cached pass-through readers.
 */
const h = vi.hoisted(() => ({
  delegates: {
    siteSettings: { findUnique: vi.fn() },
    stat: { findMany: vi.fn() },
    value: { findMany: vi.fn() },
    program: { findMany: vi.fn(), findUnique: vi.fn() },
    faculty: { findMany: vi.fn(), findUnique: vi.fn() },
    testimonial: { findMany: vi.fn() },
    newsItem: { findMany: vi.fn(), findUnique: vi.fn() },
    admissionStep: { findMany: vi.fn() },
    faq: { findMany: vi.fn() },
    campusItem: { findMany: vi.fn() },
    slide: { findMany: vi.fn() },
    download: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: h.delegates }));

import * as content from "./content";

beforeEach(() => {
  vi.clearAllMocks();
  content.invalidateCache(); // clear cache between tests
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getSiteSettings — caching", () => {
  it("misses the cache first, then serves from cache on the second call", async () => {
    h.delegates.siteSettings.findUnique.mockResolvedValue({ id: "singleton" });

    const a = await content.getSiteSettings();
    const b = await content.getSiteSettings();

    expect(a).toEqual({ id: "singleton" });
    expect(b).toEqual({ id: "singleton" });
    expect(h.delegates.siteSettings.findUnique).toHaveBeenCalledTimes(1);
    expect(h.delegates.siteSettings.findUnique).toHaveBeenCalledWith({
      where: { id: "singleton" },
    });
  });

  it("re-fetches after the cache entry expires (TTL > 30s)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    h.delegates.siteSettings.findUnique.mockResolvedValue({ id: "singleton" });

    await content.getSiteSettings();
    expect(h.delegates.siteSettings.findUnique).toHaveBeenCalledTimes(1);

    vi.setSystemTime(31_000); // past the 30s TTL
    await content.getSiteSettings();
    expect(h.delegates.siteSettings.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe("invalidateCache", () => {
  it("targeted key invalidation forces a re-fetch of just that key", async () => {
    h.delegates.stat.findMany.mockResolvedValue([{ order: 1 }]);

    await content.getStats(); // miss -> fetch
    await content.getStats(); // hit
    expect(h.delegates.stat.findMany).toHaveBeenCalledTimes(1);

    content.invalidateCache("stats");
    await content.getStats(); // miss again after invalidation
    expect(h.delegates.stat.findMany).toHaveBeenCalledTimes(2);
  });

  it("no-arg invalidation clears the entire cache", async () => {
    h.delegates.value.findMany.mockResolvedValue([]);
    h.delegates.faq.findMany.mockResolvedValue([]);

    await content.getValues();
    await content.getFaqs();
    content.invalidateCache(); // clear all

    await content.getValues();
    await content.getFaqs();
    expect(h.delegates.value.findMany).toHaveBeenCalledTimes(2);
    expect(h.delegates.faq.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("cached list readers pass the right query args", () => {
  it("getStats orders by order asc", async () => {
    h.delegates.stat.findMany.mockResolvedValue([]);
    await content.getStats();
    expect(h.delegates.stat.findMany).toHaveBeenCalledWith({
      orderBy: { order: "asc" },
    });
  });

  it("getValues / getPrograms / getFaculty / getTestimonials / getAdmissionSteps / getFaqs / getCampusItems", async () => {
    h.delegates.value.findMany.mockResolvedValue([]);
    h.delegates.program.findMany.mockResolvedValue([]);
    h.delegates.faculty.findMany.mockResolvedValue([]);
    h.delegates.testimonial.findMany.mockResolvedValue([]);
    h.delegates.admissionStep.findMany.mockResolvedValue([]);
    h.delegates.faq.findMany.mockResolvedValue([]);
    h.delegates.campusItem.findMany.mockResolvedValue([]);

    await content.getValues();
    await content.getPrograms();
    await content.getFaculty();
    await content.getTestimonials();
    await content.getAdmissionSteps();
    await content.getFaqs();
    await content.getCampusItems();

    expect(h.delegates.program.findMany).toHaveBeenCalledWith({
      orderBy: { order: "asc" },
    });
    expect(h.delegates.campusItem.findMany).toHaveBeenCalledWith({
      orderBy: { order: "asc" },
    });
  });

  it("getPublishedNews filters published + multi-key orderBy", async () => {
    h.delegates.newsItem.findMany.mockResolvedValue([]);
    await content.getPublishedNews();
    expect(h.delegates.newsItem.findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: [{ order: "asc" }, { date: "desc" }],
    });
  });

  it("getActiveSlides filters active", async () => {
    h.delegates.slide.findMany.mockResolvedValue([]);
    await content.getActiveSlides();
    expect(h.delegates.slide.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { order: "asc" },
    });
  });

  it("getPublishedDownloads filters published", async () => {
    h.delegates.download.findMany.mockResolvedValue([]);
    await content.getPublishedDownloads();
    expect(h.delegates.download.findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: { order: "asc" },
    });
  });
});

describe("non-cached readers", () => {
  it("getProgramBySlug / getFacultyBySlug / getNewsItemBySlug query by slug", async () => {
    h.delegates.program.findUnique.mockResolvedValue({ slug: "p" });
    h.delegates.faculty.findUnique.mockResolvedValue({ slug: "f" });
    h.delegates.newsItem.findUnique.mockResolvedValue({ slug: "n" });

    expect(await content.getProgramBySlug("p")).toEqual({ slug: "p" });
    expect(await content.getFacultyBySlug("f")).toEqual({ slug: "f" });
    expect(await content.getNewsItemBySlug("n")).toEqual({ slug: "n" });

    expect(h.delegates.program.findUnique).toHaveBeenCalledWith({
      where: { slug: "p" },
    });
  });

  it("getAllNews / getAllSlides are not cached (always hit DB)", async () => {
    h.delegates.newsItem.findMany.mockResolvedValue([]);
    h.delegates.slide.findMany.mockResolvedValue([]);

    await content.getAllNews();
    await content.getAllNews();
    await content.getAllSlides();
    await content.getAllSlides();

    expect(h.delegates.newsItem.findMany).toHaveBeenCalledTimes(2);
    expect(h.delegates.slide.findMany).toHaveBeenCalledTimes(2);
    expect(h.delegates.newsItem.findMany).toHaveBeenCalledWith({
      orderBy: [{ order: "asc" }, { date: "desc" }],
    });
    expect(h.delegates.slide.findMany).toHaveBeenCalledWith({
      orderBy: { order: "asc" },
    });
  });
});
