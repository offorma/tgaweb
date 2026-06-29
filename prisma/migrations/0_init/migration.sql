-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorBackupCodes" TEXT,
    "twoFactorEnabledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustEnable2FA" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityPolicy" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enforceTwoFactorForAdmins" BOOLEAN NOT NULL DEFAULT true,
    "enforceTwoFactorForEditors" BOOLEAN NOT NULL DEFAULT false,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 12,
    "sessionTimeoutHours" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "schoolName" TEXT NOT NULL DEFAULT 'Trail Gliders Academy',
    "shortName" TEXT NOT NULL DEFAULT 'TGA',
    "tagline" TEXT NOT NULL DEFAULT 'Excellence as You Glide Beyond Limits',
    "motto" TEXT NOT NULL DEFAULT 'Knowledge • Character • Service',
    "founded" INTEGER NOT NULL DEFAULT 2026,
    "location" TEXT NOT NULL DEFAULT 'Nsukka, Enugu State, Nigeria',
    "address" TEXT NOT NULL DEFAULT '57 Obukpa Estate, Nsukka, Enugu State, Nigeria',
    "phone" TEXT NOT NULL DEFAULT '+234 803 456 7890',
    "phoneAlt" TEXT NOT NULL DEFAULT '+234 701 234 5678',
    "email" TEXT NOT NULL DEFAULT 'info@trailgliders.com.ng',
    "admissionsEmail" TEXT NOT NULL DEFAULT 'admissions@trailgliders.com.ng',
    "hours" TEXT NOT NULL DEFAULT 'Monday – Friday: 7:30 AM – 3:30 PM',
    "crestUrl" TEXT NOT NULL DEFAULT '/crest/school-crest.png',
    "heroBadge" TEXT NOT NULL DEFAULT 'Admissions Open for 2026/2027 Session',
    "heroTitle1" TEXT NOT NULL DEFAULT 'Where Young Minds',
    "heroTitle2" TEXT NOT NULL DEFAULT 'Glide Beyond Limits',
    "heroDescription" TEXT NOT NULL,
    "aboutHeading" TEXT NOT NULL,
    "aboutParagraph" TEXT NOT NULL,
    "missionText" TEXT NOT NULL,
    "visionText" TEXT NOT NULL,
    "admissionsHeading" TEXT NOT NULL,
    "admissionsParagraph" TEXT NOT NULL,
    "admissionsDeadline" TEXT NOT NULL DEFAULT 'Applications close August 31, 2026',
    "admissionsOpenDay" TEXT NOT NULL DEFAULT 'Open Day: Saturday, 18 July 2026',
    "applyButtonEnabled" BOOLEAN NOT NULL DEFAULT true,
    "applyButtonLabel" TEXT NOT NULL DEFAULT 'Apply Now',
    "applyButtonType" TEXT NOT NULL DEFAULT 'scroll',
    "applyButtonUrl" TEXT NOT NULL DEFAULT '#admissions',
    "applyButtonStyle" TEXT NOT NULL DEFAULT 'primary',
    "facebookUrl" TEXT NOT NULL DEFAULT '',
    "instagramUrl" TEXT NOT NULL DEFAULT '',
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "twitterUrl" TEXT NOT NULL DEFAULT '',
    "resourceAdmissionsPortal" TEXT NOT NULL DEFAULT '',
    "resourceFeeStructure" TEXT NOT NULL DEFAULT '',
    "resourceSchoolCalendar" TEXT NOT NULL DEFAULT '',
    "resourceParentPortal" TEXT NOT NULL DEFAULT '',
    "resourceAlumniNetwork" TEXT NOT NULL DEFAULT '',
    "resourceCareers" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stat" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "suffix" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Value" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ages" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'orange',
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "curriculum" TEXT NOT NULL DEFAULT '',
    "schedule" TEXT NOT NULL DEFAULT '',
    "gallery" TEXT NOT NULL DEFAULT '',
    "leadFaculty" TEXT NOT NULL DEFAULT '',
    "nameI18n" JSONB,
    "taglineI18n" JSONB,
    "descriptionI18n" JSONB,
    "featuresI18n" JSONB,
    "bodyI18n" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL DEFAULT '',
    "subjects" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "gallery" TEXT NOT NULL DEFAULT '',
    "yearsTeaching" INTEGER NOT NULL DEFAULT 0,
    "roleI18n" JSONB,
    "bioI18n" JSONB,
    "quoteI18n" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "fullStory" TEXT NOT NULL DEFAULT '',
    "childName" TEXT NOT NULL DEFAULT '',
    "yearEnrolled" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "gallery" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "titleI18n" JSONB,
    "excerptI18n" JSONB,
    "bodyI18n" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionStep" (
    "id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "expanded" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "gallery" TEXT NOT NULL DEFAULT '',
    "schedule" TEXT NOT NULL DEFAULT '',
    "coach" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "videoUrl" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "badge" TEXT,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "transitionType" TEXT NOT NULL DEFAULT 'fade',
    "duration" INTEGER NOT NULL DEFAULT 6500,
    "textPosition" TEXT NOT NULL DEFAULT 'left',
    "parallaxDepth" INTEGER NOT NULL DEFAULT 15,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'pdf',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secret" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "ciphertext" TEXT NOT NULL,
    "previewHint" TEXT,
    "lastRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Secret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Program_slug_key" ON "Program"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_slug_key" ON "Faculty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Testimonial_slug_key" ON "Testimonial"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsItem_slug_key" ON "NewsItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Faq_slug_key" ON "Faq"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CampusItem_slug_key" ON "CampusItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Secret_key_key" ON "Secret"("key");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

