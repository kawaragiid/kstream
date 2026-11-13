"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDuration } from '../lib/helpers';

const FALLBACK_THUMB = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="26" font-family="Arial, sans-serif">Episode</text></svg>';

function EpisodeCard({ episode, href }) {
  const [thumbSrc, setThumbSrc] = useState(episode.thumbnail || FALLBACK_THUMB);

  useEffect(() => {
    setThumbSrc(episode.thumbnail || FALLBACK_THUMB);
  }, [episode.thumbnail]);

  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl border border-white/10 bg-surface-100/60 p-4 backdrop-blur transition hover:border-brand hover:bg-white/5"
    >
      <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-xl bg-black sm:h-28 sm:w-48">
        <Image
          src={thumbSrc}
          alt={episode.title || `Episode ${episode.number}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 1024px) 40vw, 25vw"
          onError={() => setThumbSrc(FALLBACK_THUMB)}
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary md:text-base">
            <span className="mr-2 text-xs font-bold uppercase tracking-wider text-brand">
              S{String(episode.seasonNumber || 1).padStart(2, '0')}E{String(episode.number || 0).padStart(2, '0')}
            </span>
            {episode.title}
          </p>
          {episode.duration ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-text-muted">
              {formatDuration(episode.duration)}
            </span>
          ) : null}
        </div>
        {episode.overview && (
          <p className="line-clamp-2 text-xs text-text-muted md:text-sm">{episode.overview}</p>
        )}
      </div>
    </Link>
  );
}

export default function EpisodeList({ episodes = [], baseHref = '' }) {
  const seasons = Array.from(
    new Set(episodes.map((ep) => Number(ep.seasonNumber || 1)))
  ).sort((a, b) => a - b);
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] ?? 1);

  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);

  if (!episodes.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-100/40 p-6 text-center text-sm text-text-muted">
        Belum ada episode tersedia untuk serial ini.
      </div>
    );
  }

  const visibleEpisodes = seasons.length > 1
    ? episodes.filter((ep) => Number(ep.seasonNumber || 1) === selectedSeason)
    : episodes;

  return (
    <div className="space-y-5">
      {seasons.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {seasons.map((season) => (
            <button
              key={season}
              type="button"
              onClick={() => setSelectedSeason(season)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                selectedSeason === season
                  ? 'bg-white text-black'
                  : 'border border-white/15 bg-white/5 text-white/80 hover:border-white/30'
              }`}
            >
              Season {season}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visibleEpisodes.map((ep) => {
          const encodedId = encodeURIComponent(ep.id);
          let href = "#";
          if (typeof baseHref === "function") {
            href = baseHref(ep);
          } else if (typeof baseHref === "string" && baseHref.length) {
            const separator = baseHref.includes("?") ? "&" : "?";
            href = `${baseHref}${separator}ep=${encodedId}&autoplay=1`;
          }
          return <EpisodeCard key={ep.id} episode={ep} href={href} />;
        })}
      </div>
    </div>
  );
}
