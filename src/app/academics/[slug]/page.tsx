import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Users, BookOpen } from "lucide-react";
import { getProgramBySlug, getSiteSettings } from "@/lib/content";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ApplyButton } from "@/components/site/apply-button";

export const revalidate = 60;

const COLOR_STYLES: Record<string, { bg: string; text: string; chip: string; border: string }> = {
  orange: {
    bg: "bg-[var(--orange)]",
    text: "text-[var(--orange-dark)]",
    chip: "bg-[var(--orange)]/10 text-[var(--orange-dark)]",
    border: "border-[var(--orange)]/30",
  },
  navy: {
    bg: "bg-[var(--navy)]",
    text: "text-[var(--navy)]",
    chip: "bg-[var(--navy)]/10 text-[var(--navy)]",
    border: "border-[var(--navy)]/30",
  },
  gold: {
    bg: "bg-[var(--gold)]",
    text: "text-amber-700",
    chip: "bg-amber-100 text-amber-700",
    border: "border-amber-300",
  },
};

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [program, settings] = await Promise.all([
    getProgramBySlug(slug),
    getSiteSettings(),
  ]);

  if (!program) notFound();

  const colors = COLOR_STYLES[program.color] || COLOR_STYLES.orange;
  const features = program.features.split("\n").filter(Boolean);
  const curriculum = program.curriculum ? program.curriculum.split("\n").filter(Boolean) : [];
  const gallery = program.gallery ? program.gallery.split("\n").filter(Boolean) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar settings={settings} />

      <main className="flex-1">
        {/* Hero */}
        <div className="relative h-72 sm:h-96 lg:h-[32rem] overflow-hidden bg-[var(--navy-dark)]">
          <img
            src={program.image}
            alt={program.name}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-dark)] via-[var(--navy-dark)]/40 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 max-w-5xl mx-auto px-6 pb-12">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${colors.chip}`}>
              {program.tagline}
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {program.name}
            </h1>
            <div className="mt-3 flex items-center gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {program.ages}
              </span>
              {program.schedule && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {program.schedule}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-12">
          <Link
            href="/#academics"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-[var(--navy)] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Academics
          </Link>

          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {/* Description */}
              <div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {program.description}
                </p>
              </div>

              {/* Body */}
              {program.body && (
                <div
                  className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:text-[var(--navy)] prose-a:text-[var(--orange-dark)] prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: program.body }}
                />
              )}

              {/* Curriculum */}
              {curriculum.length > 0 && (
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[var(--navy)] mb-5 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[var(--orange)]" />
                    Curriculum Overview
                  </h2>
                  <ul className="space-y-2">
                    {curriculum.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.bg}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Highlights */}
              <div className={`rounded-2xl border p-6 ${colors.border} bg-white`}>
                <h3 className="font-serif text-lg font-bold text-[var(--navy)] mb-4">
                  Programme Highlights
                </h3>
                <ul className="space-y-2.5">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${colors.chip}`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-foreground/90">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="rounded-2xl bg-[var(--navy)] text-white p-6">
                <h3 className="font-serif text-lg font-bold mb-2">Ready to Enrol?</h3>
                <p className="text-white/70 text-sm mb-4">
                  Admissions are open for the 2026/2027 session.
                </p>
                <ApplyButton
                  settings={settings}
                  className="w-full justify-center"
                >
                  {settings?.applyButtonLabel || "Apply Now"}
                </ApplyButton>
              </div>
            </div>
          </div>

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="mt-16">
              <h2 className="font-serif text-2xl font-bold text-[var(--navy)] mb-6">Gallery</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.map((url, i) => (
                  <div key={i} className="aspect-video rounded-2xl overflow-hidden">
                    <img
                      src={url}
                      alt={`${program.name} — photo ${i + 1}`}
                      className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer settings={settings} />
    </div>
  );
}
