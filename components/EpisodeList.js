"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDuration } from '../lib/helpers';

const FALLBACK_THUMB = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="26" font-family="Arial, sans-serif">Episode</text></svg>';

function EpisodeCard({ episode, href }) {
  const [thumbSrc, setThumbSrc] = useState(episode.thumbnail || FALLBACK_THUMB);
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl border border-white/10 bg-surface-100/60 p-4 backdrop-blur transition hover:border-brand hover:bg-white/5"
    >
      <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-xl bg-black sm:h-28 sm:w-48">
        <Image
          src={thumbSrc}
          alt={episode.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 1024px) 40vw, 25vw"
          onError={() => setThumbSrc(FALLBACK_THUMB)}
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2">
        <p className="text-sm font-semibold text-text-primary md:text-base">
          Episode {episode.number}: {episode.title}
        </p>
        {episode.overview && (
          <p className="line-clamp-2 text-xs text-text-muted md:text-sm">{episode.overview}</p>
        )}
        {episode.duration ? (
          <p className="text-xs text-text-muted">Durasi {formatDuration(episode.duration)}</p>
        ) : null}
      </div>
    </Link>
  );
}

export default function EpisodeList({ episodes = [], baseHref = '' }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {episodes.length
        ? episodes.map((ep) => {
            const encodedId = encodeURIComponent(ep.id);
            let href = "#";
            if (typeof baseHref === "function") {
              href = baseHref(ep);
            } else if (typeof baseHref === "string" && baseHref.length) {
              const separator = baseHref.includes("?") ? "&" : "?";
              href = `${baseHref}${separator}ep=${encodedId}&autoplay=1`;
            }
            return <EpisodeCard key={ep.id} episode={ep} href={href} />;
          })
        : [...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-white/5 bg-surface-100/60" />
          ))}
    </div>
  );
}
