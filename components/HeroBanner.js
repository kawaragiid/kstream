"use client";

import { useState } from 'react';
import Image from 'next/image';

const HERO_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="48" font-family="Arial, sans-serif">Kstream</text></svg>';

export default function HeroBanner({
  title = 'Kstream',
  subtitle = 'Tonton tanpa batas',
  description = '',
  ctaLabel = 'Mulai Nonton',
  ctaHref = '/',
  backdropUrl = '',
  badge = 'Sedang Populer',
}) {
  const [heroSrc, setHeroSrc] = useState(backdropUrl || HERO_PLACEHOLDER);
  return (
    <section className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-black text-white sm:aspect-[21/9] md:aspect-[32/13]">
      <Image
        src={heroSrc}
        alt={title}
        fill
        className="object-cover"
        priority
        sizes="100vw"
        onError={() => setHeroSrc(HERO_PLACEHOLDER)}
      />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute inset-0 flex flex-col justify-end gap-4 px-6 pb-12 md:px-12 md:pb-16 lg:max-w-2xl">
        {badge && (
          <span className="w-fit rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
            {badge}
          </span>
        )}
        <h1 className="text-3xl font-bold leading-tight md:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="text-base text-white/80 md:text-lg">{subtitle}</p>
        {description && (
          <p className="line-clamp-3 text-sm text-white/70 md:text-base">
            {description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <a
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded bg-white px-6 py-2 font-semibold text-black shadow-lg shadow-black/30 hover:bg-white/90 transition"
          >
            ▶ {ctaLabel}
          </a>
          <a
            href="/premium/upgrade"
            className="inline-flex items-center gap-2 rounded bg-white/10 px-6 py-2 font-semibold text-white hover:bg-white/20 transition"
          >
            Info Paket
          </a>
        </div>
      </div>
    </section>
  );
}
