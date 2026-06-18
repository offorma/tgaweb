"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Video } from "lucide-react";
import type { Slide } from "@prisma/client";

/**
 * SlidePreview — renders a scaled-down live preview of how a slide
 * will appear on the public hero section. Used in the admin edit dialog
 * and on the slide list cards.
 *
 * Shows: background image (or video icon), gradient overlay, badge, title,
 * subtitle, CTA button, and text position alignment.
 */
export function SlidePreview({
  slide,
  className,
}: {
  slide: Partial<Slide> & {
    image: string;
    title: string;
    subtitle?: string | null;
    badge?: string | null;
    linkLabel?: string | null;
    linkUrl?: string | null;
    videoUrl?: string | null;
    textPosition?: string;
    transitionType?: string;
  };
  className?: string;
}) {
  const textPos = slide.textPosition || "left";
  const hasVideo = slide.videoUrl && slide.videoUrl.trim() !== "";

  const alignmentClass =
    textPos === "center"
      ? "items-center text-center"
      : textPos === "right"
      ? "items-end text-right"
      : "items-start text-left";

  return (
    <div
      className={`relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-[var(--navy-dark)] ${className || ""}`}
    >
      {/* Background image */}
      {slide.image ? (
        <img
          src={slide.image}
          alt="Slide preview"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
          No image
        </div>
      )}

      {/* Video badge */}
      {hasVideo && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
          <Video className="h-3 w-3 text-white" />
          <span className="text-[10px] text-white font-semibold">Video</span>
        </div>
      )}

      {/* Transition type badge */}
      {slide.transitionType && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
          <span className="text-[10px] text-white font-semibold capitalize">{slide.transitionType}</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--navy-dark)]/85 via-[var(--navy)]/50 to-[var(--navy-dark)]/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-dark)]/60 to-transparent" />

      {/* Text content */}
      <div className={`absolute inset-0 flex flex-col justify-center p-4 sm:p-6 ${alignmentClass}`}>
        {/* Badge */}
        {slide.badge && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[var(--orange)]/90 to-[var(--orange-dark)]/90 text-[8px] sm:text-[10px] font-bold text-white shadow-lg mb-2">
            <span className="h-1 w-1 rounded-full bg-white" />
            {slide.badge}
          </div>
        )}

        {/* Title */}
        {slide.title && (
          <h3 className="font-serif font-bold text-white leading-tight text-sm sm:text-xl lg:text-2xl line-clamp-2 max-w-[80%]">
            {slide.title}
          </h3>
        )}

        {/* Subtitle */}
        {slide.subtitle && (
          <p className="mt-2 text-white/75 text-[10px] sm:text-xs lg:text-sm line-clamp-2 max-w-[70%]">
            {slide.subtitle}
          </p>
        )}

        {/* CTA button */}
        {slide.linkLabel && (
          <div className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[var(--orange)] to-[var(--orange-dark)] text-[9px] sm:text-xs font-semibold text-white shadow-lg">
            {slide.linkLabel}
            <ArrowRight className="h-2.5 w-2.5" />
          </div>
        )}
      </div>

      {/* Text position indicator (corner) */}
      <div className="absolute bottom-1 right-2 text-[8px] text-white/30 font-mono uppercase">
        {textPos}
      </div>
    </div>
  );
}
