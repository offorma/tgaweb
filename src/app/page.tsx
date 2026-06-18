import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { About } from "@/components/site/about";
import { Stats } from "@/components/site/stats";
import { WhyUs } from "@/components/site/why-us";
import { Academics } from "@/components/site/academics";
import { CampusLife } from "@/components/site/campus-life";
import { Faculty } from "@/components/site/faculty";
import { Testimonials } from "@/components/site/testimonials";
import { Admissions } from "@/components/site/admissions";
import { News } from "@/components/site/news";
import { FAQ } from "@/components/site/faq";
import { Contact } from "@/components/site/contact";
import { Footer } from "@/components/site/footer";
import { getSiteData } from "@/components/site/data-server";

// Revalidate every 60 seconds so admin edits appear within a minute
export const revalidate = 60;

export default async function Home() {
  // Fetch all site content from DB on the server
  const data = await getSiteData();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar settings={data.settings} />
      <main className="flex-1">
        <Hero settings={data.settings} slides={data.slides} />
        <Marquee settings={data.settings} />
        <About settings={data.settings} values={data.values} />
        <Stats stats={data.stats} />
        <WhyUs />
        <Academics programs={data.programs} />
        <CampusLife items={data.campusItems} />
        <Faculty faculty={data.faculty} />
        <Testimonials testimonials={data.testimonials} />
        <Admissions
          settings={data.settings}
          steps={data.admissionSteps}
        />
        <News news={data.news} />
        <FAQ faqs={data.faqs} />
        <Contact settings={data.settings} />
      </main>
      <Footer settings={data.settings} />
    </div>
  );
}
