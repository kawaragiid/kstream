"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";

export default function Top10Row({ title = "Top 10 Hari Ini", items = [] }) {
  const scrollerRef = useRef(null);
  const topItems = Array.isArray(items) ? items.slice(0, 10) : [];

  if (topItems.length === 0) return null;

  const scrollByAmount = (direction) => {
    const node = scrollerRef.current;
    if (!node) return;
    const distance = Math.max(300, node.clientWidth * 0.75);
    node.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  return (
    <section className="group/row relative space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white">{title}</h2>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label="Geser kiri"
          className="hidden md:flex absolute left-0 top-0 bottom-4 z-20 w-10 items-center justify-center rounded-r bg-black/60 text-white opacity-0 transition hover:bg-black/80 group-hover/row:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none scroll-smooth"
        >
          {topItems.map((item, idx) => {
            const rank = idx + 1;
            const slugId = encodeURIComponent(item.slug || item.id);
            const href =
              item.href ||
              (item.type === "series" ? `/series/${slugId}` : `/movies/${slugId}`);
            const imageSrc = item.posterUrl || item.backdropUrl || "";

            return (
              <Link
                key={`${item.type || "movie"}-${item.id}`}
                href={href}
                className="group/card relative flex flex-shrink-0 items-end select-none"
              >
                <svg
                  viewBox={rank >= 10 ? "0 0 135 140" : "0 0 95 140"}
                  className="h-28 sm:h-36 md:h-40 w-auto flex-shrink-0 -mr-4 sm:-mr-5 z-0 transition-transform duration-200 group-hover/card:scale-105"
                  aria-hidden="true"
                >
                  <text
                    x={rank >= 10 ? "68" : "48"}
                    y="122"
                    textAnchor="middle"
                    fill="#141414"
                    stroke="#595959"
                    strokeWidth="4"
                    fontSize="128"
                    fontWeight="900"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    letterSpacing="-6"
                  >
                    {rank}
                  </text>
                </svg>

                <div className="relative z-10 h-32 w-24 sm:h-40 sm:w-28 md:h-44 md:w-32 overflow-hidden rounded-[4px] bg-[#1f1f1f] shadow-lg ring-1 ring-white/10 transition duration-200 group-hover/card:scale-105 group-hover/card:ring-white/40">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={item.title || `Rank ${rank}`}
                      fill
                      sizes="140px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs font-semibold text-white/70">
                      {item.title}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2 opacity-0 transition-opacity group-hover/card:opacity-100">
                    <p className="truncate text-[11px] font-semibold text-white">{item.title}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label="Geser kanan"
          className="hidden md:flex absolute right-0 top-0 bottom-4 z-20 w-10 items-center justify-center rounded-l bg-black/60 text-white opacity-0 transition hover:bg-black/80 group-hover/row:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
