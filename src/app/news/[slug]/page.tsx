import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import { getNewsItemBySlug, getSiteSettings } from "@/lib/content";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export const revalidate = 60;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [item, settings] = await Promise.all([
    getNewsItemBySlug(slug),
    getSiteSettings(),
  ]);

  if (!item || !item.published) notFound();

  const gallery = item.gallery ? item.gallery.split("\n").filter(Boolean) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar settings={settings} />

      <main className="flex-1">
        {/* Hero image */}
        <div className="relative h-72 sm:h-96 lg:h-[28rem] overflow-hidden bg-[var(--navy-dark)]">
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-dark)] via-[var(--navy-dark)]/50 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 max-w-4xl mx-auto px-6 pb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--orange)] text-white text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {item.tag}
              </span>
              <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                {item.category}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
              {item.title}
            </h1>
          </div>
        </div>

        {/* Article body */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link
            href="/#news"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-[var(--navy)] text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to News & Events
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b border-black/8">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[var(--orange)]" />
              {formatDate(new Date(item.date))}
            </span>
            {item.author && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-[var(--orange)]" />
                {item.author}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-[var(--orange)]" />
              {item.tag}
            </span>
          </div>

          {/* Excerpt */}
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 font-medium">
            {item.excerpt}
          </p>

          {/* Body */}
          {item.body && (
            <div
              className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:text-[var(--navy)] prose-a:text-[var(--orange-dark)] prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: item.body }}
            />
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="mt-16">
              <h2 className="font-serif text-2xl font-bold text-[var(--navy)] mb-6">Gallery</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.map((url, i) => (
                  <div key={i} className="aspect-video rounded-2xl overflow-hidden">
                    <img
                      src={url}
                      alt={`${item.title} — photo ${i + 1}`}
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
