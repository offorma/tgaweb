/**
 * Seed script — populates the database with the default site content
 * and creates a default admin user.
 *
 * This script is idempotent: it only inserts data if the database is empty.
 * If data already exists, it prints a message and exits cleanly.
 *
 * Run with: npm run db:seed
 *
 * To force a re-seed (wipe + recreate), pass --force:
 *   npx tsx scripts/seed.ts --force
 *
 * Default admin credentials:
 *   Email:    admin@trailglidersacademy.com.ng
 *   Password: TrailGliders2026!
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptSecret, isMasterKeyConfigured } from "../src/lib/secrets";
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_PASSWORD,
} from "../src/lib/default-credentials";
import { seedEmailSecrets } from "./seed-email-secrets";

const db = new PrismaClient();

/** Convert a string to a URL-friendly slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_ADMIN = {
  email: DEFAULT_ADMIN_EMAIL,
  name: DEFAULT_ADMIN_NAME,
  password: DEFAULT_ADMIN_PASSWORD,
};

const force = process.argv.includes("--force");

async function main() {
  // Check if the database already has data
  const existingSettings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  const existingUser = await db.user.findFirst();

  // Always ensure the SMTP/email secrets exist in the vault — even when the rest
  // of the DB is already seeded — so email stays configurable from Admin > Secrets.
  console.log("📧 Ensuring email/SMTP secrets...");
  await seedEmailSecrets({ force });

  if (existingSettings && existingUser && !force) {
    console.log("✅ Database already seeded — skipping.");
    console.log("   (Run with --force to wipe and re-seed)");
    return;
  }

  if (force) {
    console.log("⚠️  --force flag detected. Wiping existing data...\n");
  }

  console.log("🌱 Seeding database...");

  // 1) Admin user
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
  const admin = await db.user.upsert({
    where: { email: DEFAULT_ADMIN.email },
    update: {},
    create: {
      email: DEFAULT_ADMIN.email,
      name: DEFAULT_ADMIN.name,
      passwordHash,
      role: "ADMIN",
      // The default password is public — force a change on first login.
      mustChangePassword: true,
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (id: ${admin.id})`);

  // 2) Site settings singleton
  await db.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      schoolName: "Trail Gliders Academy",
      shortName: "TGA",
      tagline: "Excellence as You Glide Beyond Limits",
      motto: "Knowledge • Character • Service",
      founded: 2026,
      location: "Nsukka, Enugu State, Nigeria",
      address:
        "15 Gliders Avenue, University Town, Nsukka, Enugu State, Nigeria",
      phone: "+234 803 456 7890",
      phoneAlt: "+234 701 234 5678",
      email: "info@trailgliders.edu.ng",
      admissionsEmail: "admissions@trailgliders.edu.ng",
      hours: "Monday – Friday: 7:30 AM – 3:30 PM",
      crestUrl: "/crest/school-crest.png",
      heroBadge: "Admissions Open for 2026/2027 Session",
      heroTitle1: "Where Young Minds",
      heroTitle2: "Glide Beyond Limits",
      heroDescription:
        "Trail Gliders Academy, Nsukka — a new premier Nigerian primary school dedicated to nurturing confident, curious, and creative learners. Discover the joy of an education that sees, celebrates, and elevates every child.",
      aboutHeading:
        "A school where every child is known, seen, and celebrated.",
      aboutParagraph:
        "Founded in 2026 in the heart of the historic university town of Nsukka, Trail Gliders Academy was born from a simple conviction: that every Nigerian child deserves an education that is rigorous, joyful, and deeply human. As we embark on this exciting journey, we are committed to shaping confident Gliders who will carry with them not just knowledge, but character, courage, and a sense of purpose that lasts a lifetime.",
      missionText:
        "To nurture a generation of confident, compassionate, and curious learners — equipping each Glider with the academic foundation, character, and creativity to glide beyond limits and shape a better Nigeria and world.",
      visionText:
        "To be the most loved and trusted primary school in Eastern Nigeria — a place where African heritage meets global excellence, and where every child is prepared not just for secondary school, but for a life of meaning and impact.",
      admissionsHeading: "Four simple steps to becoming a Glider.",
      admissionsParagraph:
        "Whether you are joining us from Nursery or transferring into Primary 5, we make the admissions journey warm, transparent, and welcoming — just like our school.",
      admissionsDeadline: "Applications close July 31, 2026",
      admissionsOpenDay: "Open Day: Saturday, 18 July 2026",
      applyButtonEnabled: true,
      applyButtonLabel: "Apply Now",
      applyButtonType: "scroll",
      applyButtonUrl: "#admissions",
      applyButtonStyle: "primary",
    },
  });
  console.log("  ✓ Site settings");

  // 2b) Cloudinary credentials → secrets vault
  const cloudinarySecrets = [
    {
      key: "CLOUDINARY_CLOUD_NAME",
      value: process.env.CLOUDINARY_CLOUD_NAME || "",
      description: "Cloudinary cloud name for image and file uploads",
    },
    {
      key: "CLOUDINARY_API_KEY",
      value: process.env.CLOUDINARY_API_KEY || "",
      description: "Cloudinary API key",
    },
    {
      key: "CLOUDINARY_API_SECRET",
      value: process.env.CLOUDINARY_API_SECRET || "",
      description: "Cloudinary API secret (keep confidential)",
    },
  ];
  if (isMasterKeyConfigured()) {
    for (const s of cloudinarySecrets) {
      if (!s.value) continue; // skip if env var not set
      const existing = await db.secret.findUnique({ where: { key: s.key } });
      if (existing && !force) {
        console.log(`  ⏭ Secret ${s.key} (already exists)`);
        continue;
      }
      const { ciphertext, previewHint } = encryptSecret(s.value);
      await db.secret.upsert({
        where: { key: s.key },
        update: { ciphertext, previewHint, lastRotatedAt: new Date() },
        create: {
          key: s.key,
          category: "storage",
          description: s.description,
          ciphertext,
          previewHint,
          lastRotatedAt: new Date(),
        },
      });
      console.log(`  ✓ Secret ${s.key}`);
    }
  } else {
    console.log("  ⚠ SECRETS_MASTER_KEY not set — skipping Cloudinary vault secrets");
    console.log("    Add them manually in Admin > Secrets after setting SECRETS_MASTER_KEY");
  }

  // Helper: only seed a table if it's empty (or --force was used)
  async function seedIfEmpty<T>(
    label: string,
    count: () => Promise<number>,
    clear: () => Promise<any>,
    create: () => Promise<T>,
  ) {
    const existing = await count();
    if (existing > 0 && !force) {
      console.log(`  ⏭ ${label} (${existing} rows already exist)`);
      return;
    }
    if (force) await clear();
    await create();
    console.log(`  ✓ ${label}`);
  }

  // 3) Stats
  await seedIfEmpty(
    "Stats",
    () => db.stat.count(),
    () => db.stat.deleteMany({}),
    () =>
      db.stat.createMany({
        data: [
          {
            value: 1,
            suffix: "",
            label: "Founding Year",
            description: "A brand-new beginning in 2026",
            order: 0,
          },
          {
            value: 850,
            suffix: "+",
            label: "Happy Pupils",
            description: "From Nursery to Primary 6",
            order: 1,
          },
          {
            value: 45,
            suffix: "",
            label: "Expert Educators",
            description: "Certified and passionate teachers",
            order: 2,
          },
          {
            value: 98,
            suffix: "%",
            label: "Placement Rate",
            description: "Gain admission into top secondary schools",
            order: 3,
          },
        ],
      }),
  );

  // 4) Values
  await seedIfEmpty(
    "Values",
    () => db.value.count(),
    () => db.value.deleteMany({}),
    () =>
      db.value.createMany({
        data: [
          {
            icon: "BookOpen",
            title: "Academic Excellence",
            description:
              "A rigorous, future-ready curriculum blending the Nigerian UBE syllabus with global best practices — delivered by certified, child-centered educators who ignite curiosity and a lifelong love of learning.",
            order: 0,
          },
          {
            icon: "Heart",
            title: "Character Formation",
            description:
              "We shape honest, respectful, and confident Gliders through daily mentorship, value-based discipline, and a culture of kindness. Every child is known, seen, and celebrated for who they are becoming.",
            order: 1,
          },
          {
            icon: "Sparkles",
            title: "Creative Expression",
            description:
              "From art studios to coding clubs, music suites to drama stages, we give every child the canvas to discover their unique voice and the courage to share it boldly with the world.",
            order: 2,
          },
          {
            icon: "Globe",
            title: "Global Perspective",
            description:
              "Rooted in Nsukka, open to the world. Our pupils explore cultures, languages, and ideas that prepare them to lead with empathy in an interconnected global community.",
            order: 3,
          },
        ],
      }),
  );

  // 5) Programs
  await seedIfEmpty(
    "Programs",
    () => db.program.count(),
    () => db.program.deleteMany({}),
    () =>
      db.program.createMany({
        data: [
          {
            name: "Early Years (Nursery)",
            slug: slugify("Early Years (Nursery)"),
            ages: "Ages 3 – 5",
            image: "/images/library.jpg",
            color: "orange",
            tagline: "Where wonder takes flight",
            description:
              "A play-based, Montessori-inspired foundation where little Gliders explore phonics, numeracy, sensory play, and social-emotional skills in a warm, safe, and joyful environment.",
            features:
              "Montessori-inspired learning stations\nDaily phonics & early numeracy\nCreative arts, music & movement\nQuiet nap & healthy snack routines\nCaring, certified early-years teachers",
            order: 0,
          },
          {
            name: "Lower Primary",
            slug: slugify("Lower Primary"),
            ages: "Primary 1 – 3",
            image: "/images/computer-lab.jpg",
            color: "navy",
            tagline: "Building strong foundations",
            description:
              "Children transition into structured literacy, numeracy, and inquiry-based STEM while developing independent study habits, digital fluency, and a deep appreciation for reading.",
            features:
              "English, Maths, Basic Science & Technology\nCoding & robotics introduction\nGuided reading library sessions\nHands-on STEM discovery labs\nCitizenship & moral instruction",
            order: 1,
          },
          {
            name: "Upper Primary",
            slug: slugify("Upper Primary"),
            ages: "Primary 4 – 6",
            image: "/images/science.jpg",
            color: "gold",
            tagline: "Gliding beyond limits",
            description:
              "Pupils hone critical thinking, leadership, and exam readiness through project-based learning, national competition coaching, and secondary-school transition preparation.",
            features:
              "Common Entrance examination coaching\nLeadership & public speaking program\nAdvanced STEM, robotics & chess\nEntrepreneurship & financial literacy\nMentorship & secondary school placement",
            order: 2,
          },
        ],
      }),
  );

  // 6) Faculty
  await seedIfEmpty(
    "Faculty",
    () => db.faculty.count(),
    () => db.faculty.deleteMany({}),
    () =>
      db.faculty.createMany({
        data: [
          {
            name: "Dr. Mrs. Adaeze Okonkwo",
            slug: slugify("Dr. Mrs. Adaeze Okonkwo"),
            role: "Head of School",
            image: "/images/teacher-1.jpg",
            bio: "PhD in Early Childhood Education (University of Nigeria, Nsukka). 22 years shaping young minds with warmth and rigor.",
            quote: "Every child carries a spark. Our duty is to fan it into a flame.",
            order: 0,
          },
          {
            name: "Mr. Chijioke Eze",
            slug: slugify("Mr. Chijioke Eze"),
            role: "Head, Upper Primary",
            image: "/images/teacher-2.jpg",
            bio: "B.Ed Mathematics, Nsukka. National Common Entrance Coach of the Year, 2022 & 2024.",
            quote: "Mathematics is not a subject — it is a way of seeing the world.",
            order: 1,
          },
          {
            name: "Mrs. Ngozi Ugwu",
            slug: slugify("Mrs. Ngozi Ugwu"),
            role: "Head, Lower Primary",
            image: "/images/teacher-3.jpg",
            bio: "Montessori-certified educator with 15 years guiding early readers into confident, curious learners.",
            quote: "When a child falls in love with reading, every door opens.",
            order: 2,
          },
          {
            name: "Mr. Emeka Nwosu",
            slug: slugify("Mr. Emeka Nwosu"),
            role: "STEM & Robotics Lead",
            image: "/images/teacher-4.jpg",
            bio: "First-class B.Sc Computer Science. Coached two national robotics championship teams.",
            quote: "We don't teach children what to think — we teach them how to think.",
            order: 3,
          },
        ],
      }),
  );

  // 7) Testimonials
  await seedIfEmpty(
    "Testimonials",
    () => db.testimonial.count(),
    () => db.testimonial.deleteMany({}),
    () =>
      db.testimonial.createMany({
        data: [
          {
            name: "Mr. & Mrs. Obiora",
            slug: slugify("Mr. & Mrs. Obiora"),
            relation: "Parents of Zara (P4) & Tobe (P2)",
            quote:
              "Trail Gliders has been a second family for our children. The teachers genuinely care, and our kids have grown not just academically but in confidence and character. We could not have asked for more.",
            rating: 5,
            order: 0,
          },
          {
            name: "Barr. Chinwe Anike",
            slug: slugify("Barr. Chinwe Anike"),
            relation: "Parent of Chidinma (P6 graduate)",
            quote:
              "My daughter gained admission into three top federal colleges. The preparation here is exceptional — but what I value most is the moral foundation she received. She is a Glider for life.",
            rating: 5,
            order: 1,
          },
          {
            name: "Engr. Ifeanyi Okeke",
            slug: slugify("Engr. Ifeanyi Okeke"),
            relation: "Parent of Kamsi (P3)",
            quote:
              "The robotics and coding program is on another level. My son built his first app at age 8 and presented it at the school science fair. Trail Gliders sees the future and prepares our kids for it.",
            rating: 5,
            order: 2,
          },
          {
            name: "Dr. Amara Eze",
            slug: slugify("Dr. Amara Eze"),
            relation: "Parent of Adaeze (Nursery 2)",
            quote:
              "The early years team is magical. My daughter literally runs into school every morning. She comes home singing, full of stories, and already reading simple words at age 4.",
            rating: 5,
            order: 3,
          },
        ],
      }),
  );

  // 8) News
  await seedIfEmpty(
    "News",
    () => db.newsItem.count(),
    () => db.newsItem.deleteMany({}),
    () =>
      db.newsItem.createMany({
        data: [
          {
            date: new Date("2026-06-21"),
            category: "Event",
            tag: "Sports",
            title: "Trail Gliders Annual Sports Day 2026",
            slug: slugify("Trail Gliders Annual Sports Day 2026"),
            excerpt:
              "Four houses. One spirit. Join us at the Nsukka Township Stadium for a day of athletics, music, and family fun.",
            image: "/images/sports.jpg",
            published: true,
            order: 0,
          },
          {
            date: new Date("2026-07-04"),
            category: "News",
            tag: "STEM",
            title: "Our Robotics Team Qualifies for Nationals",
            slug: slugify("Our Robotics Team Qualifies for Nationals"),
            excerpt:
              "The GliderBots placed second at the South-East regional FTC qualifier and now head to Lagos for the national championship.",
            image: "/images/computer-lab.jpg",
            published: true,
            order: 1,
          },
          {
            date: new Date("2026-07-18"),
            category: "Event",
            tag: "Admissions",
            title: "Open Day & Campus Tour",
            slug: slugify("Open Day & Campus Tour"),
            excerpt:
              "Prospective families are invited to walk our halls, meet our teachers, and discover what makes a Glider education different.",
            image: "/images/campus.jpg",
            published: true,
            order: 2,
          },
        ],
      }),
  );

  // 9) Admission steps
  await seedIfEmpty(
    "Admission steps",
    () => db.admissionStep.count(),
    () => db.admissionStep.deleteMany({}),
    () =>
      db.admissionStep.createMany({
        data: [
          {
            step: "01",
            title: "Enquiry & Tour",
            description:
              "Visit our campus or book a virtual tour. Meet the Head of School, walk the classrooms, and feel the Glider spirit in action.",
            order: 0,
          },
          {
            step: "02",
            title: "Application Form",
            description:
              "Complete the application form online or in person. Submit the pupil's birth certificate, two recent passports, and last school report (where applicable).",
            order: 1,
          },
          {
            step: "03",
            title: "Assessment & Interview",
            description:
              "A friendly, age-appropriate readiness assessment helps us place your child well. Parents meet with our admissions team for a warm conversation.",
            order: 2,
          },
          {
            step: "04",
            title: "Offer & Enrollment",
            description:
              "Receive your admission offer within 5 working days. Complete enrollment, pick up the Glider welcome pack, and join the family!",
            order: 3,
          },
        ],
      }),
  );

  // 10) FAQs
  await seedIfEmpty(
    "FAQs",
    () => db.faq.count(),
    () => db.faq.deleteMany({}),
    () =>
      db.faq.createMany({
        data: [
          {
            question: "What are the school's operating hours?",
            slug: slugify("What are the school's operating hours"),
            answer:
              "The school day runs from 7:30 AM to 3:30 PM, Monday through Friday. After-school clubs run until 4:30 PM. The early years program offers a half-day option ending at 12:30 PM.",
            order: 0,
          },
          {
            question: "Do you offer school transport?",
            slug: slugify("Do you offer school transport"),
            answer:
              "Yes. Our fleet of GPS-tracked school buses serves Nsukka town, the University of Nigeria campus, and surrounding towns including Enugu-Ezike, Opi, and Obukpa. Routes are reviewed annually.",
            order: 1,
          },
          {
            question: "What curriculum do you follow?",
            slug: slugify("What curriculum do you follow"),
            answer:
              "We follow the Nigerian Universal Basic Education (UBE) curriculum, enriched with Cambridge Primary content for English, Maths, and Science, plus coding, robotics, and creative arts.",
            order: 2,
          },
          {
            question: "What is the fee structure?",
            slug: slugify("What is the fee structure"),
            answer:
              "Our fees are competitive and transparent. A detailed fee schedule is shared during the admissions interview. We offer sibling discounts and flexible payment plans for families.",
            order: 3,
          },
          {
            question: "When does admission open?",
            slug: slugify("When does admission open"),
            answer:
              "Admissions for the new academic session open every January. Mid-year transfers are considered subject to availability. We recommend applying early as classes fill quickly.",
            order: 4,
          },
        ],
      }),
  );

  // 11) Campus items
  await seedIfEmpty(
    "Campus items",
    () => db.campusItem.count(),
    () => db.campusItem.deleteMany({}),
    () =>
      db.campusItem.createMany({
        data: [
          {
            image: "/images/sports.jpg",
            title: "Sports & Athletics",
            slug: slugify("Sports & Athletics"),
            description: "Football, athletics, swimming, and table tennis",
            order: 0,
          },
          {
            image: "/images/arts.jpg",
            title: "Creative Arts",
            slug: slugify("Creative Arts"),
            description: "Painting, sculpture, drama, and choir",
            order: 1,
          },
          {
            image: "/images/science.jpg",
            title: "STEM Club",
            slug: slugify("STEM Club"),
            description: "Robotics, coding, and science fairs",
            order: 2,
          },
          {
            image: "/images/library.jpg",
            title: "Reading Corner",
            slug: slugify("Reading Corner"),
            description: "A 6,000-book library to spark imagination",
            order: 3,
          },
          {
            image: "/images/computer-lab.jpg",
            title: "Digital Lab",
            slug: slugify("Digital Lab"),
            description: "Modern ICT suites with 1:1 devices",
            order: 4,
          },
          {
            image: "/images/graduation.jpg",
            title: "Graduation Day",
            slug: slugify("Graduation Day"),
            description: "Celebrating the next generation of leaders",
            order: 5,
          },
        ],
      }),
  );

  console.log("");
  console.log("✅ Seed complete.");
  console.log("");
  console.log("=== Default Admin Credentials ===");
  console.log(`Email:    ${DEFAULT_ADMIN.email}`);
  console.log(`Password: ${DEFAULT_ADMIN.password}`);
  console.log("");
  console.log("⚠️  Change this password immediately via /admin/settings after first login.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
