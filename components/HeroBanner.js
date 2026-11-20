"use client";

import { useEffect, useMemo, useState } from "react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useMediaOverlay } from "./MediaOverlayProvider";

const HERO_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="48" font-family="Arial, sans-serif">Kstream</text></svg>';

function parseDetailTarget(detailHref) {
  if (!detailHref || typeof detailHref !== "string") return null;
  const match = detailHref.match(/^\/(movies|series)\/([^/?#]+)/i);
  if (!match) return null;
  return {
    type: match[1].toLowerCase() === "series" ? "series" : "movie",
    slug: decodeURIComponent(match[2]),
  };
}

export default function HeroBanner({
  title = "Kstream",
  subtitle = "Tonton tanpa batas",
  description = "",
  ctaLabel = "Mulai Nonton",
  ctaHref = "/",
  detailHref = "",
  backdropUrl = "",
  posterUrl = "",
  media = null,
  badge = "Sedang Populer",
}) {
  const { openMedia } = useMediaOverlay();
  const [desktopSrc, setDesktopSrc] = useState(backdropUrl || posterUrl || HERO_PLACEHOLDER);
  const [mobileSrc, setMobileSrc] = useState(posterUrl || backdropUrl || HERO_PLACEHOLDER);

  useEffect(() => {
    setDesktopSrc(backdropUrl || posterUrl || HERO_PLACEHOLDER);
    setMobileSrc(posterUrl || backdropUrl || HERO_PLACEHOLDER);
  }, [backdropUrl, posterUrl]);

  const overlayMedia = useMemo(() => {
    if (media && (media.id || media.slug)) return media;
    const parsed = parseDetailTarget(detailHref);
    if (!parsed) return null;
    return {
      id: parsed.slug,
      slug: parsed.slug,
      type: parsed.type,
      title,
      backdropUrl,
      posterUrl,
      overview: description,
    };
  }, [media, detailHref, title, backdropUrl, posterUrl, description]);

  const common = { alt: title, fill: true, sizes: "100vw", priority: true };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: desktopSrc });
  const {
    props: { srcSet: mobileSrcSet, ...mobileImgProps },
  } = getImageProps({ ...common, src: mobileSrc });

  return (
    <section className="relative aspect-[4/5] min-h-[440px] w-full overflow-hidden bg-[#141414] text-white sm:min-h-[480px] sm:aspect-[21/9] md:aspect-[32/13]">
      <picture>
        <source media="(min-width: 640px)" srcSet={desktopSrcSet} sizes="100vw" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...mobileImgProps}
          srcSet={mobileSrcSet}
          alt={title}
          className="object-cover"
          onError={() => {
            if (typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches) {
              setDesktopSrc(HERO_PLACEHOLDER);
            } else {
              setMobileSrc(HERO_PLACEHOLDER);
            }
          }}
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/45 to-transparent sm:bg-[linear-gradient(90deg,rgba(20,20,20,0.85)_0%,rgba(20,20,20,0.35)_45%,transparent_80%),linear-gradient(180deg,transparent_50%,#141414_100%)]" />
      <div className="absolute inset-0 flex flex-col justify-end gap-3 px-4 pb-8 pt-16 sm:gap-4 sm:px-6 sm:pb-12 sm:pt-20 md:px-12 md:pb-16 lg:max-w-2xl">
        {badge && (
          <span className="w-fit rounded-full bg-black/55 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-white/90">
            {badge}
          </span>
        )}
        <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold leading-tight">{title}</h1>
        <p className="line-clamp-2 text-sm sm:text-base md:text-lg text-white/85">{subtitle}</p>
        {description && <p className="line-clamp-3 text-xs sm:text-sm md:text-base text-white/85">{description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs sm:text-sm">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 sm:py-2.5 min-h-[44px] font-semibold text-black shadow-lg shadow-black/30 hover:bg-white/90 active:scale-95 transition text-xs sm:text-sm"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
            <span>{ctaLabel}</span>
          </Link>
          {overlayMedia ? (
            <button
              type="button"
              onClick={() => openMedia(overlayMedia, { origin: "hero" })}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 sm:py-2.5 min-h-[44px] font-semibold text-white hover:bg-white/20 active:scale-95 transition text-xs sm:text-sm"
            >
              Detail Konten
            </button>
          ) : detailHref ? (
            <Link
              href={detailHref}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 sm:py-2.5 min-h-[44px] font-semibold text-white hover:bg-white/20 active:scale-95 transition text-xs sm:text-sm"
            >
              Detail Konten
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
