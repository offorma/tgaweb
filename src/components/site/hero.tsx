"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ChevronDown, ArrowRight, Star, Play, Sparkles, ChevronLeft, ChevronRight, Pause, GalleryVerticalEnd } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteSettings, Slide } from "@prisma/client";
import { ApplyButton } from "./apply-button";

const DEFAULT_DURATION = 6500;
const TRANSITION_DURATION = 1200;

function getTransitionVariants(type: string, direction: number) {
  switch (type) {
    case "slide":
      return {
        initial: { opacity: 0, x: direction > 0 ? "5%" : "-5%" },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction > 0 ? "-3%" : "3%" },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 1.1 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      };
    case "curtain":
      return {
        initial: { opacity: 0, clipPath: "inset(0 50% 0 50%)" },
        animate: { opacity: 1, clipPath: "inset(0 0% 0 0%)" },
        exit: { opacity: 0, clipPath: "inset(0 50% 0 50%)" },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
}

function getKenBurnsVariants(type: string, parallaxDepth: number) {
  const depth = parallaxDepth / 100;
  switch (type) {
    case "zoom":
      return { initialScale: 1.2 + depth * 0.3, animateScale: 1.0 };
    case "slide":
      return { initialScale: 1.08, animateScale: 1.0 };
    case "curtain":
      return { initialScale: 1.0, animateScale: 1.0 };
    case "fade":
    default:
      return { initialScale: 1.15 + depth * 0.2, animateScale: 1.0 };
  }
}

function getTextPositionClasses(position: string) {
  switch (position) {
    case "center":
      return {
        container: "lg:col-span-12 text-center mx-auto max-w-3xl",
        title: "text-center",
        subtitle: "text-center mx-auto",
        buttons: "justify-center",
        trust: "justify-center",
      };
    case "right":
      return {
        container: "lg:col-span-7 lg:col-start-6 text-right ml-auto",
        title: "text-right",
        subtitle: "text-right ml-auto",
        buttons: "justify-end",
        trust: "justify-end",
      };
    case "left":
    default:
      return {
        container: "lg:col-span-7 text-left",
        title: "text-left",
        subtitle: "text-left",
        buttons: "justify-start",
        trust: "justify-start",
      };
  }
}

export function Hero({
  settings,
  slides,
}: {
  settings: SiteSettings | null;
  slides: Slide[];
}) {
  const t = useTranslations("hero");
  const tagline = settings?.tagline || "Excellence as You Glide Beyond Limits";
  const crest = settings?.crestUrl || "/crest/school-crest.png";
  const heroBadge = settings?.heroBadge || "Admissions Open for 2026/2027 Session";
  const heroTitle1 = settings?.heroTitle1 || "Where Young Minds";
  const heroTitle2 = settings?.heroTitle2 || "Glide Beyond Limits";
  const heroDescription = settings?.heroDescription ||
    "Trail Gliders Academy, Nsukka — a premier Nigerian primary school nurturing confident, curious, and creative learners.";

  const activeSlides = slides && slides.length > 0
    ? slides
    : [{
        id: "fallback",
        image: "/images/hero.jpg",
        videoUrl: null,
        title: heroTitle1,
        subtitle: heroDescription,
        badge: heroBadge,
        linkUrl: "",
        linkLabel: "",
        transitionType: "fade",
        duration: DEFAULT_DURATION,
        textPosition: "left",
        parallaxDepth: 15,
        active: true,
        order: 0,
        updatedAt: new Date(),
      } as Slide];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Parallax scroll effect — moves background slightly as user scrolls
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 800], [0, 100]);

  const currentDuration = activeSlides[currentSlide]?.duration || DEFAULT_DURATION;

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  }, [currentSlide]);

  useEffect(() => {
    if (!autoplay || isPaused || activeSlides.length <= 1) return;
    timerRef.current = setTimeout(nextSlide, currentDuration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSlide, isPaused, autoplay, nextSlide, activeSlides.length, currentDuration]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextSlide, prevSlide]);

  const slide = activeSlides[currentSlide];
  const transitionType = slide.transitionType || "fade";
  const variants = getTransitionVariants(transitionType, direction);
  const kenBurns = getKenBurnsVariants(transitionType, slide.parallaxDepth || 15);
  const hasVideo = slide.videoUrl && slide.videoUrl.trim() !== "";
  const textPos = getTextPositionClasses(slide.textPosition || "left");
  const parallaxDepth = (slide.parallaxDepth || 15) / 100;

  // Show crest only on "left" position (since center/right take full width)
  const showCrest = (slide.textPosition || "left") === "left";

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-[100svh] flex items-center overflow-hidden bg-[var(--navy-dark)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ====== Background slideshow with parallax ====== */}
      <motion.div style={{ y: parallaxY }} className="absolute inset-0 z-0 scale-110">
        <AnimatePresence custom={direction} mode="sync">
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: TRANSITION_DURATION / 1000, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            {hasVideo ? (
              <video
                key={`video-${currentSlide}`}
                src={slide.videoUrl!}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
                poster={slide.image}
              />
            ) : (
              <motion.img
                src={slide.image}
                alt={slide.title || "School hero"}
                className="h-full w-full object-cover"
                initial={{ scale: kenBurns.initialScale, x: `${parallaxDepth * 10}%` }}
                animate={{ scale: kenBurns.animateScale, x: "0%" }}
                transition={{
                  duration: currentDuration / 1000,
                  ease: "easeOut",
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-br from-[var(--navy-dark)]/90 via-[var(--navy)]/60 to-[var(--navy-dark)]/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--navy-dark)]/80 via-transparent to-[var(--navy-dark)]/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-dark)]/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-[5%] h-72 w-72 rounded-full bg-gradient-to-br from-[var(--orange)]/30 to-[var(--gold)]/15 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-[8%] h-56 w-56 rounded-full bg-gradient-to-br from-[var(--gold)]/20 to-[var(--orange)]/10 blur-3xl pointer-events-none"
        />

        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ y: ["0%", "-100%"], opacity: [0, 0.5, 0] }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: "linear",
            }}
            className="absolute h-1 w-1 rounded-full bg-[var(--orange)]/40 pointer-events-none"
            style={{ left: `${(i * 8.3) % 100}%`, top: "100%" }}
          />
        ))}
      </motion.div>

      {/* ====== Content ====== */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Text content */}
          <div className={textPos.container + " text-white"}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {(slide.badge || heroBadge) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--orange)]/90 to-[var(--orange-dark)]/90 backdrop-blur-md border border-[var(--orange-light)]/40 text-xs font-bold tracking-wide text-white shadow-lg shadow-orange-500/30 ${textPos.buttons === "justify-center" ? "" : textPos.buttons === "justify-end" ? "ml-auto" : ""}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    {slide.badge || heroBadge}
                  </motion.div>
                )}

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className={`mt-6 font-serif font-bold leading-[1.05] text-5xl sm:text-6xl lg:text-7xl text-balance text-shadow-hero ${textPos.title}`}
                >
                  {slide.title || heroTitle1}
                </motion.h1>

                {slide.subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className={`mt-6 max-w-xl text-lg text-white/85 leading-relaxed text-balance ${textPos.subtitle}`}
                  >
                    {slide.subtitle}
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className={`mt-9 flex flex-wrap items-center gap-4 ${textPos.buttons}`}
                >
                  {slide.linkUrl && slide.linkLabel ? (
                    <ApplyButton
                      settings={settings}
                      size="lg"
                      className="shadow-2xl shadow-orange-500/40 hover:scale-105 transition-all px-8 h-13 text-base"
                    >
                      {slide.linkLabel}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </ApplyButton>
                  ) : (
                    <ApplyButton
                      settings={settings}
                      size="lg"
                      className="shadow-2xl shadow-orange-500/40 hover:scale-105 transition-all px-8 h-13 text-base"
                    >
                      {t("beginApplication")}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </ApplyButton>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => document.getElementById("campus-life")?.scrollIntoView({ behavior: "smooth" })}
                    className="bg-white/5 backdrop-blur-md border-white/30 text-white hover:bg-white/15 hover:text-white rounded-full px-8 h-13 text-base"
                  >
                    <Play className="mr-2 h-4 w-4 fill-white" />
                    {t("exploreCampus")}
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  className={`mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-white/75 ${textPos.trust}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" />
                      ))}
                    </div>
                    <span className="text-sm">
                      <span className="font-bold text-white">4.9/5</span> {t("rating")}
                    </span>
                  </div>
                  <div className="h-5 w-px bg-white/20" />
                  <div className="text-sm">
                    <span className="font-bold text-white">850+</span> {t("alumni")}
                  </div>
                  <div className="h-5 w-px bg-white/20" />
                  <div className="text-sm">
                    {t("ubeApproved")}
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Crest — only shown on "left" text position */}
          {showCrest && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <div className="relative">
                <div className="absolute -inset-8 rounded-full border border-white/10 animate-rotate-slow" />
                <div
                  className="absolute -inset-12 rounded-full border-2 border-dashed border-[var(--orange)]/20 animate-rotate-slow"
                  style={{ animationDirection: "reverse", animationDuration: "40s" }}
                />
                <div className="absolute inset-0 rounded-full bg-[var(--orange)]/30 blur-3xl animate-pulse-glow" />
                <div className="relative h-72 w-72 lg:h-80 lg:w-80 rounded-full overflow-hidden ring-4 ring-white/40 shadow-2xl shadow-orange-900/50">
                  <img
                    src={crest}
                    alt="Trail Gliders Academy Crest"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[var(--navy)]/20 to-transparent" />
                </div>

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-6 -left-6 lg:-left-16 glass-card-dark text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-[var(--orange)]/30"
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--orange-light)] font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    {t("ourPromise")}
                  </div>
                  <div className="text-base font-serif italic mt-1 max-w-[220px] leading-snug">
                    "{tagline}"
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ====== Slide controls ====== */}
      {activeSlides.length > 1 && (
        <>
          {/* Left/right arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Bottom controls bar: dots + autoplay toggle + counter */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
            {/* Dot indicators with progress */}
            <div className="flex items-center gap-2.5">
              {activeSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="group relative"
                >
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? "w-10 bg-[var(--orange)]"
                        : "w-2 bg-white/30 hover:bg-white/50"
                    }`}
                  />
                  {i === currentSlide && autoplay && !isPaused && (
                    <motion.div
                      key={`${currentSlide}-${currentDuration}`}
                      className="absolute inset-0 h-2 rounded-full bg-[var(--gold)] origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: currentDuration / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Autoplay toggle */}
            <button
              onClick={() => setAutoplay(!autoplay)}
              className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
              aria-label={autoplay ? "Pause slideshow" : "Play slideshow"}
              title={autoplay ? "Pause" : "Play"}
            >
              {autoplay ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-white" />
              )}
            </button>
          </div>

          {/* Slide counter */}
          <div className="absolute bottom-16 right-6 z-20 hidden sm:flex items-center gap-2 text-white/60 text-sm font-mono">
            <span className="text-white font-bold">{String(currentSlide + 1).padStart(2, "0")}</span>
            <span>/</span>
            <span>{String(activeSlides.length).padStart(2, "0")}</span>
          </div>

          {/* Thumbnail navigation strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-2 max-w-[600px] overflow-x-auto pb-1 scrollbar-thin">
            {activeSlides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}: ${s.title}`}
                className={`relative flex-shrink-0 h-10 w-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentSlide
                    ? "border-[var(--orange)] opacity-100 scale-110"
                    : "border-white/20 opacity-50 hover:opacity-80 hover:border-white/40"
                }`}
              >
                <img
                  src={s.image}
                  alt={s.title}
                  className="h-full w-full object-cover"
                  loading={i < 3 ? "eager" : "lazy"}
                />
                {s.videoUrl && (
                  <div className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                    <Play className="h-2 w-2 text-white fill-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <motion.button
        onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/70 hover:text-white flex flex-col items-center gap-2"
        aria-label="Scroll to about"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">{t("scroll")}</span>
        <div className="h-10 w-6 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
          <span className="h-2 w-1 rounded-full bg-white animate-scroll-down" />
        </div>
      </motion.button>
    </section>
  );
}
