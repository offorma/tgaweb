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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Marquee />
        <About />
        <Stats />
        <WhyUs />
        <Academics />
        <CampusLife />
        <Faculty />
        <Testimonials />
        <Admissions />
        <News />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
