"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMediaOverlay } from './MediaOverlayProvider';

const PLACEHOLDER_PORTRAIT = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="28" font-family="Arial, sans-serif">Poster</text></svg>';
const PLACEHOLDER_LANDSCAPE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="28" font-family="Arial, sans-serif">Poster</text></svg>';

function getPreviewSources(item = {}) {
  const trailer = item?.trailerUrl || '';
  const previewAnimation = item?.previewAnimation || '';
  const playbackId = item?.playbackId;
  const lowerTrailer = trailer.toLowerCase();
  const isGif = lowerTrailer.includes('.gif');
  const isMp4 = lowerTrailer.includes('.mp4');
  const isWebm = lowerTrailer.includes('.webm');
  const fallbackGif = previewAnimation || (isGif ? trailer : '');
  const previewVideo = trailer && (isMp4 || isWebm) ? trailer : '';
  const poster = item?.posterUrl || item?.thumbnailUrl || PLACEHOLDER_LANDSCAPE;
  return {
    previewVideo,
    previewGif: fallbackGif,
    poster,
    playbackId,
  };
}

export default function CardPoster({ item = {}, orientation: forcedOrientation }) {
  const router = useRouter();
  const { openMedia } = useMediaOverlay();
  const typePath = item?.type === 'series' ? 'series' : 'movies';
  const playbackType = item?.type === 'series' ? 'series' : 'movie';
  const slugOrId = encodeURIComponent(item?.slug || item?.id || 'sample');
  const detailHref = item?.href || `/${typePath}/${slugOrId}`;
  const watchHref = item?.watchHref || `/player?id=${slugOrId}&type=${playbackType}`;
  const title = item?.title || 'Judul';
  const orientation = forcedOrientation || item?.orientation || item?.posterOrientation || (playbackType === 'series' ? 'landscape' : 'portrait');
  const isPortrait = orientation === 'portrait';
  const defaultPoster = isPortrait ? PLACEHOLDER_PORTRAIT : PLACEHOLDER_LANDSCAPE;
  const [posterSrc, setPosterSrc] = useState(item?.posterUrl || item?.thumbnailUrl || defaultPoster);
  const meta = item?.category || item?.genres?.[0] || item?.type;
  const { previewVideo, previewGif, poster } = getPreviewSources(item);
  const safePoster = poster || defaultPoster;
  const progressValue = typeof item?.progress === 'number' ? Math.min(Math.max(item.progress, 0), 1) : null;

  const [showPreview, setShowPreview] = useState(false);
  const previewTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (previewTimer.current) {
        clearTimeout(previewTimer.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => setShowPreview(true), 200);
  };

  const handleMouseLeave = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setShowPreview(false);
  };

  const previewMedia = () => {
    if (previewVideo) {
      const lower = previewVideo.toLowerCase();
      const isMp4 = lower.includes('.mp4');
      const isWebm = lower.includes('.webm');
      return (
        <video
          className="aspect-video w-full rounded-t-3xl object-cover"
          src={previewVideo}
          autoPlay
          loop
          muted
          playsInline
          poster={safePoster}
        >
          {!isMp4 && !isWebm ? null : 'Browser Anda tidak mendukung video.'}
        </video>
      );
    }
    if (previewGif) {
      return (
        <img
          src={previewGif}
          alt={`${title} preview`}
          className="aspect-video w-full rounded-t-3xl object-cover"
          onError={(event) => {
            event.currentTarget.src = safePoster;
          }}
        />
      );
    }
    return (
      <Image
        src={safePoster}
        alt={`${title} poster`}
        width={320}
        height={180}
        className="aspect-video w-full rounded-t-3xl object-cover"
      />
    );
  };

  return (
    <div
      className="relative cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Tonton ${title}`}
      onClick={() => openMedia(item, { origin: 'card' })}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMedia(item, { origin: 'card' });
        }
      }}
    >
      <div className="group block">
        <div
          className={`relative ${isPortrait ? 'aspect-[2/3]' : 'aspect-video'} overflow-hidden rounded-xl bg-surface-100 shadow-poster transition-transform duration-300 group-hover:-translate-y-1`}
        >
          <Image
            src={posterSrc}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 45vw, (max-width: 1024px) 20vw, 15vw"
            onError={() => setPosterSrc(defaultPoster)}
          />
          {progressValue !== null && (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/10">
              <div className="h-full bg-brand" style={{ width: `${progressValue * 100}%` }} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <p className="line-clamp-1 text-sm font-semibold text-white">{title}</p>
            {meta && <p className="text-xs text-white/60">{meta}</p>}
          </div>
        </div>
        <p className="mt-2 line-clamp-1 text-sm font-medium text-text-secondary group-hover:text-text-primary">
          {title}
        </p>
      </div>
      {showPreview && (
        <div className="absolute left-1/2 top-0 z-40 hidden -translate-x-1/2 -translate-y-8 md:block">
          <div className="w-[26rem] overflow-hidden rounded-3xl border border-white/10 bg-surface-100/95 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out">
            {previewMedia()}
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(watchHref);
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black shadow-sm transition hover:bg-white/80"
                >
                  Play
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    openMedia(item, { origin: 'card' });
                  }}
                >
                  Info
                </button>
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-text-muted">{item?.overview || item?.synopsis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
