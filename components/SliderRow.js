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
  loading = false,
}) {
  const scrollRef = useRef(null);

  const skeletonOrientationClass = orientation === "portrait" ? "aspect-[2/3]" : "aspect-video";
  const hasItems = items.length > 0;

  const handleScroll = useCallback((direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const firstCard = container.querySelector(":scope > div > div") || container.querySelector(":scope > div");
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
          className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/70 p-2.5 text-white shadow-lg transition hover:bg-black md:flex"
        >
          &larr;
        </button>
        <button
          type="button"
          aria-label="Gulir ke kanan"
          onClick={() => handleScroll("next")}
          className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/70 p-2.5 text-white shadow-lg transition hover:bg-black md:flex"
        >
          &rarr;
        </button>
      </>
    );
  }, [handleScroll, hasItems]);

  if (!hasItems && !loading) {
    return null;
  }

  return (
    <section className="relative z-10 space-y-3 hover:z-30 focus-within:z-30">
      <div className="flex items-center justify-between gap-4">
        {title && <h2 className="text-xl font-semibold text-text-primary">{title}</h2>}
        {actionHref && hasItems && (
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
        <div
          ref={scrollRef}
          className="-mx-4 -my-20 flex gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar scroll-smooth px-4 py-20 snap-x snap-mandatory scroll-pl-4 [-webkit-overflow-scrolling:touch]"
        >
          {hasItems
            ? items.map((item) => (
                <div
                  key={`${item.type || "item"}-${item.id}`}
                  className="w-[62vw] shrink-0 snap-start sm:w-[40vw] md:w-[27vw] lg:w-[21vw] xl:w-[18.5vw]"
                >
                  <CardPoster item={item} orientation={orientation} />
                </div>
              ))
            : [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-[62vw] shrink-0 snap-start sm:w-[40vw] md:w-[27vw] lg:w-[21vw] xl:w-[18.5vw] ${skeletonOrientationClass} animate-pulse rounded-[4px] bg-surface-200`}
                />
              ))}
        </div>
      </div>
    </section>
  );
}
