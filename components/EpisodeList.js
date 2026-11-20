"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDuration } from '../lib/helpers';
import KLogoBadge from './KLogoBadge';

const FALLBACK_THUMB = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="26" font-family="Arial, sans-serif">Episode</text></svg>';

function EpisodeCard({ episode, href }) {
  const [thumbSrc, setThumbSrc] = useState(episode.thumbnail || FALLBACK_THUMB);
  const isAvailable = Boolean(episode.playbackId || episode.streamUrl);
  const epNum = episode.number ?? episode.episodeNumber;
  const hasEpNum = epNum !== undefined && epNum !== null && epNum !== '';

  useEffect(() => {
    setThumbSrc(episode.thumbnail || FALLBACK_THUMB);
  }, [episode.thumbnail]);

  const cardClassName = `group flex gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-surface-100/60 p-3 sm:p-4 backdrop-blur transition-all duration-200 motion-reduce:transition-none ${
    isAvailable && href
      ? 'hover:border-brand hover:bg-white/5 active:scale-[0.99] motion-reduce:active:scale-100'
      : !isAvailable
      ? 'cursor-not-allowed opacity-65'
      : ''
  }`;

  const content = (
    <>
      <div className="relative aspect-video w-28 sm:w-40 md:w-48 flex-shrink-0 overflow-hidden rounded-xl bg-black">
        <Image
          src={thumbSrc}
          alt={episode.title || (hasEpNum ? `Episode ${epNum}` : 'Episode')}
          fill
          className={`object-cover transition-transform duration-300 motion-reduce:transition-none ${isAvailable ? 'group-hover:scale-105 motion-reduce:group-hover:scale-100' : ''}`}
          sizes="(max-width: 640px) 112px, (max-width: 1024px) 160px, 192px"
          onError={() => setThumbSrc(FALLBACK_THUMB)}
        />
        <KLogoBadge size="xs" />
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-2 text-center">
            <span className="rounded-md border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Belum Tersedia
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5 sm:gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-xs sm:text-sm font-semibold text-text-primary md:text-base leading-snug">
            <span className="mr-1.5 inline-block text-xs font-bold uppercase tracking-wider text-brand">
              S{String(episode.seasonNumber || 1).padStart(2, '0')}
              {hasEpNum ? `E${String(epNum).padStart(2, '0')}` : ''}
            </span>
            {episode.title}
          </p>
          {isAvailable && episode.duration ? (
            <span className="flex-shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] sm:text-[11px] text-text-muted">
              {formatDuration(episode.duration)}
            </span>
          ) : null}
        </div>
        {episode.overview && (
          <p className="line-clamp-2 text-xs text-text-muted md:text-sm leading-relaxed">{episode.overview}</p>
        )}
      </div>
    </>
  );

  if (!isAvailable || !href) {
    return (
      <div data-episode-card aria-disabled={!isAvailable ? "true" : undefined} className={cardClassName}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} data-episode-card className={cardClassName}>
      {content}
    </Link>
  );
}

export default function EpisodeList({ episodes = [], baseHref = '' }) {
  const tabRefs = useRef(new Map());
  const seasons = useMemo(() => {
    return Array.from(
      new Set(episodes.map((ep) => Number(ep.seasonNumber || 1)))
    ).sort((a, b) => a - b);
  }, [episodes]);
  const defaultSeason = Number(
    episodes.find((ep) => ep.playbackId || ep.streamUrl)?.seasonNumber || seasons[0] || 1
  );
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);

  useEffect(() => {
    setSelectedSeason(defaultSeason);
  }, [baseHref, defaultSeason]);

  if (!episodes.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-100/40 p-6 text-center text-sm text-text-muted">
        Belum ada episode tersedia untuk serial ini.
      </div>
    );
  }

  const effectiveSeason = seasons.includes(selectedSeason) ? selectedSeason : seasons[0] ?? 1;
  const visibleEpisodes = seasons.length > 1
    ? episodes.filter((ep) => Number(ep.seasonNumber || 1) === effectiveSeason)
    : episodes;

  const handleTabKeyDown = (event, currentIndex) => {
    if (!seasons.length) return;
    let nextIndex = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % seasons.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + seasons.length) % seasons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = seasons.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextSeason = seasons[nextIndex];
    setSelectedSeason(nextSeason);
    tabRefs.current.get(nextSeason)?.focus();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {seasons.length > 1 && (
        <div
          role="tablist"
          aria-label="Pilih Season"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x py-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {seasons.map((season, index) => {
            const isSelected = effectiveSeason === season;
            return (
              <button
                key={season}
                ref={(el) => {
                  if (el) tabRefs.current.set(season, el);
                  else tabRefs.current.delete(season);
                }}
                id={`season-tab-${season}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`season-panel-${season}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelectedSeason(season)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`flex-shrink-0 snap-start inline-flex items-center justify-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 min-h-[44px] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  isSelected
                    ? 'bg-white text-black shadow-sm'
                    : 'border border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                Season {season}
              </button>
            );
          })}
        </div>
      )}
      <div
        role={seasons.length > 1 ? 'tabpanel' : undefined}
        id={seasons.length > 1 ? `season-panel-${effectiveSeason}` : undefined}
        aria-labelledby={seasons.length > 1 ? `season-tab-${effectiveSeason}` : undefined}
        className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2"
      >
        {visibleEpisodes.map((ep, idx) => {
          const epNum = ep.number ?? ep.episodeNumber;
          const rawEpId = ep.id || ep.episodeId || `ep-${epNum ?? idx + 1}`;
          const encodedId = encodeURIComponent(rawEpId);
          let href = '';
          if (typeof baseHref === "function") {
            href = baseHref(ep) || '';
          } else if (typeof baseHref === "string" && baseHref.length) {
            const separator = baseHref.includes("?") ? "&" : "?";
            href = `${baseHref}${separator}ep=${encodedId}&autoplay=1`;
          }
          return <EpisodeCard key={rawEpId} episode={ep} href={href} />;
        })}
      </div>
    </div>
  );
}
