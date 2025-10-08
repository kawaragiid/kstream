"use client";

import { useState } from "react";
import Image from "next/image";

const HERO_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="48" font-family="Arial, sans-serif">Kstream</text></svg>';

export default function HeroBanner({ title = "Kstream", subtitle = "Tonton tanpa batas", description = "", ctaLabel = "Mulai Nonton", ctaHref = "/", backdropUrl = "", badge = "Sedang Populer" }) {
  const [heroSrc, setHeroSrc] = useState(backdropUrl || HERO_PLACEHOLDER);
  return (
    <section className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-black text-white sm:aspect-[21/9] md:aspect-[32/13]">
      <Image src={heroSrc} alt={title} fill className="object-cover" priority sizes="100vw" onError={() => setHeroSrc(HERO_PLACEHOLDER)} />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute inset-0 flex flex-col justify-end gap-3 px-3 pb-8 sm:gap-4 sm:px-6 sm:pb-12 md:px-12 md:pb-16 lg:max-w-2xl">
        {badge && <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-white/80">{badge}</span>}
        <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold leading-tight">{title}</h1>
        <p className="text-sm sm:text-base md:text-lg text-white/80">{subtitle}</p>
        {description && <p className="line-clamp-3 text-xs sm:text-sm md:text-base text-white/70">{description}</p>}
        <div className="mt-2 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
          <a href={ctaHref} className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 sm:px-6 sm:py-2 font-semibold text-black shadow-lg shadow-black/30 hover:bg-white/90 transition text-xs sm:text-sm">
            ▶ {ctaLabel}
          </a>
          <a href="/premium/upgrade" className="inline-flex items-center gap-2 rounded bg-white/10 px-4 py-2 sm:px-6 sm:py-2 font-semibold text-white hover:bg-white/20 transition text-xs sm:text-sm">
            Info Paket
          </a>
        </div>
      </div>
    </section>
  );
}
