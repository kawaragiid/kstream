"use client";

import { useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import CardPoster from "./CardPoster";

const DEFAULT_SCROLL_FACTOR = 1.2;

export default function SliderRow({
  title,
  items = [],
  actionHref = "",
  actionLabel = "Lihat semua",
  orientation,
}) {
  const scrollRef = useRef(null);

  const skeletonOrientationClass = orientation === "portrait" ? "aspect-[2/3]" : "aspect-video";
  const hasItems = items.length > 0;

  const handleScroll = useCallback((direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const firstCard = container.querySelector(":scope > div > div");
    const cardWidth = firstCard?.offsetWidth || 320;
    const amount = cardWidth * DEFAULT_SCROLL_FACTOR;
    container.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  const arrowButtons = useMemo(() => {
    if (!hasItems) return null;
    return (
      <>
        <button
          type="button"
          aria-label="Gulir ke kiri"
          onClick={() => handleScroll("prev")}
          className="absolute left-0 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white transition hover:bg-black/70 md:flex"
        >
          &larr;
        </button>
        <button
          type="button"
          aria-label="Gulir ke kanan"
          onClick={() => handleScroll("next")}
          className="absolute right-0 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white transition hover:bg-black/70 md:flex"
        >
          &rarr;
        </button>
      </>
    );
  }, [handleScroll, hasItems]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        {title && <h3 className="text-xl font-semibold text-text-primary">{title}</h3>}
        {actionHref && (
          <Link
            href={actionHref}
            className="text-xs font-semibold uppercase tracking-widest text-text-muted transition hover:text-text-primary"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      <div className="relative">
        {arrowButtons}
        <div ref={scrollRef} className="-mx-4 overflow-x-auto scroll-smooth pb-4">
          <div className="flex gap-4 px-4">
            {hasItems
              ? items.map((item) => (
                  <div
                    key={`${item.type || "item"}-${item.id}`}
                    className="w-[55vw] flex-shrink-0 sm:w-[28vw] md:w-[20vw] lg:w-[16vw] xl:w-[14vw]"
                  >
                    <CardPoster item={item} orientation={orientation} />
                  </div>
                ))
              : [...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-[55vw] flex-shrink-0 sm:w-[28vw] md:w-[20vw] lg:w-[16vw] xl:w-[14vw] ${skeletonOrientationClass} rounded-xl bg-surface-200`}
                  />
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}
