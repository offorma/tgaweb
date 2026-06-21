import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Quote, BookOpen, GraduationCap } from "lucide-react";
import { getFacultyBySlug, getSiteSettings } from "@/lib/content";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export const revalidate = 60;

export default async function FacultyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [member, settings] = await Promise.all([
    getFacultyBySlug(slug),
    getSiteSettings(),
  ]);

  if (!member) notFound();

  const qualifications = member.qualifications
    ? member.qualifications.split("\n").filter(Boolean)
    : [];
  const subjects = member.subjects
    ? member.subjects.split("\n").filter(Boolean)
    : [];
  const gallery = member.gallery
    ? member.gallery.split("\n").filter(Boolean)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar settings={settings} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-[var(--navy-dark)] text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[var(--orange)]/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 relative">
            <Link
              href="/#faculty"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Faculty
            </Link>

            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-4">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden ring-4 ring-[var(--orange)]/30 shadow-2xl shadow-black/40 max-w-sm">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)] mb-3">
                  {member.role}
                </div>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                  {member.name}
                </h1>

                {member.yearsTeaching > 0 && (
                  <p className="mt-4 text-white/60 text-sm font-medium">
                    {member.yearsTeaching} years of teaching experience
                  </p>
                )}

                <div className="mt-6 relative pl-6 border-l-2 border-[var(--orange)]/40">
                  <Quote className="absolute -left-3 -top-1 h-5 w-5 text-[var(--orange)] fill-[var(--orange)]" />
                  <p className="text-white/80 italic text-lg leading-relaxed">
                    "{member.quote}"
                  </p>
                </div>

                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white text-sm font-semibold transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Bio & details */}
        <section className="py-20 lg:py-28 max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[var(--navy)] mb-4">About</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">{member.bio}</p>
              </div>

              {subjects.length > 0 && (
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[var(--navy)] mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[var(--orange)]" />
                    Subjects Taught
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1.5 rounded-full bg-[var(--navy)]/8 text-[var(--navy)] text-sm font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {qualifications.length > 0 && (
              <div>
                <h2 className="font-serif text-xl font-bold text-[var(--navy)] mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[var(--orange)]" />
                  Qualifications
                </h2>
                <ul className="space-y-2.5">
                  {qualifications.map((q) => (
                    <li key={q} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--orange)] flex-shrink-0" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                      alt={`${member.name} — photo ${i + 1}`}
                      className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer settings={settings} />
    </div>
  );
}
