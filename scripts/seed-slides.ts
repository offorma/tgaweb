/**
 * Seed default hero slides.
 * Run with: bun run scripts/seed-slides.ts
 */

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding hero slides...");

  await db.slide.deleteMany({});

  await db.slide.createMany({
    data: [
      {
        image: "/images/hero.jpg",
        title: "Where Young Minds Glide Beyond Limits",
        subtitle: "A premier Nigerian primary school nurturing confident, curious, and creative learners since 2009.",
        badge: "Admissions Open for 2026/2027 Session",
        linkUrl: "#admissions",
        linkLabel: "Begin Your Application",
        transitionType: "fade",
        duration: 7000,
        textPosition: "left",
        parallaxDepth: 15,
        active: true,
        order: 0,
      },
      {
        image: "/images/library.jpg",
        title: "A Love for Reading That Lasts a Lifetime",
        subtitle: "Our 6,000-book library sparks imagination and curiosity in every Glider — from Nursery to Primary 6.",
        badge: "Reading Corner",
        linkUrl: "#academics",
        linkLabel: "Explore Academics",
        transitionType: "slide",
        duration: 6000,
        textPosition: "center",
        parallaxDepth: 25,
        active: true,
        order: 1,
      },
      {
        image: "/images/science.jpg",
        title: "STEM, Robotics & Coding from Age 5",
        subtitle: "Dedicated science labs, robotics clubs, and ICT suites equip Gliders with 21st-century skills.",
        badge: "STEM Excellence",
        linkUrl: "#campus-life",
        linkLabel: "See Campus Life",
        transitionType: "zoom",
        duration: 5500,
        textPosition: "left",
        parallaxDepth: 35,
        active: true,
        order: 2,
      },
      {
        image: "/images/sports.jpg",
        title: "Strong Bodies, Strong Minds",
        subtitle: "Football, athletics, swimming, and more — every Glider discovers their athletic spark on our fields.",
        badge: "Sports & Athletics",
        linkUrl: "#campus-life",
        linkLabel: "Explore Campus Life",
        transitionType: "curtain",
        duration: 6000,
        textPosition: "right",
        parallaxDepth: 20,
        active: true,
        order: 3,
      },
      {
        image: "/images/graduation.jpg",
        title: "Celebrating Every Glider's Journey",
        subtitle: "98% of our graduates gain admission into top secondary schools across Nigeria. Join the Glider family.",
        badge: "Class of 2026",
        linkUrl: "#admissions",
        linkLabel: "Apply Now",
        transitionType: "fade",
        duration: 7500,
        textPosition: "center",
        parallaxDepth: 10,
        active: true,
        order: 4,
      },
    ],
  });

  console.log("✅ Seeded 5 hero slides");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
