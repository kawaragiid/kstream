"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMediaOverlay } from "./MediaOverlayProvider";

const PLACEHOLDER_PORTRAIT =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="%23141414"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="24" font-family="Arial, sans-serif">Kstream</text></svg>';
const PLACEHOLDER_LANDSCAPE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23141414"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="26" font-family="Arial, sans-serif">Kstream</text></svg>';

function formatDuration(seconds) {
  const total = Number(seconds || 0);
  if (!total || Number.isNaN(total)) return "";
  const mins = Math.round(total / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}j ${m}m` : `${h}j`;
}

function getPreviewSources(item = {}) {
  const trailer = item?.trailerUrl || "";
  const previewAnimation = item?.previewAnimation || "";
  const playbackId = item?.playbackId || item?.mux_playback_id || "";
  const lowerTrailer = trailer.toLowerCase();
  const isGif = lowerTrailer.includes(".gif");
  const isVideo = lowerTrailer.includes(".mp4") || lowerTrailer.includes(".webm");
  // Hemat biaya Mux: jangan auto-stream HLS (.m3u8) saat hover kartu karena memakan
  // delivery minutes & mereset timer Automatic Cold Storage. Gunakan animated.gif ringan.
  const muxGif = playbackId
    ? `https://image.mux.com/${playbackId}/animated.gif?width=320&height=180&start=2&end=7&fps=10`
    : "";
  const fallbackGif = previewAnimation || (isGif ? trailer : "") || (!isVideo ? muxGif : "");
  const previewVideo = trailer && isVideo ? trailer : "";
  const hlsUrl = "";
  const poster = item?.backdropUrl || item?.posterUrl || item?.thumbnailUrl || PLACEHOLDER_LANDSCAPE;
  return {
    previewVideo,
    hlsUrl,
    previewGif: fallbackGif,
    poster,
    playbackId,
  };
}

export default function CardPoster({ item = {}, orientation: forcedOrientation }) {
  const router = useRouter();
  const { openMedia } = useMediaOverlay();
  const typePath = item?.type === "series" ? "series" : "movies";
  const playbackType = item?.type === "series" ? "series" : "movie";
  const slugOrId = encodeURIComponent(item?.slug || item?.id || "sample");
  const detailHref = item?.href || `/${typePath}/${slugOrId}`;
  const watchHref = item?.watchHref || `/player?id=${slugOrId}&type=${playbackType}`;
  const title = item?.title || "Judul";
  const orientation = forcedOrientation || "landscape";
  const isPortrait = orientation === "portrait";
  const defaultPoster = isPortrait ? PLACEHOLDER_PORTRAIT : PLACEHOLDER_LANDSCAPE;

  const { previewVideo, hlsUrl, previewGif, poster } = getPreviewSources(item);
  const safePoster = poster || defaultPoster;
  const [posterSrc, setPosterSrc] = useState(
    isPortrait ? item?.posterUrl || safePoster : item?.backdropUrl || item?.posterUrl || safePoster
  );
  const progressValue = typeof item?.progress === "number" ? Math.min(Math.max(item.progress, 0), 1) : null;

  const [showPreview, setShowPreview] = useState(false);
  const [popoverPos, setPopoverPos] = useState(null);
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const previewTimer = useRef(null);
  const leaveTimer = useRef(null);
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    setPosterSrc(isPortrait ? item?.posterUrl || safePoster : item?.backdropUrl || item?.posterUrl || safePoster);
  }, [item?.posterUrl, item?.backdropUrl, safePoster, isPortrait]);

  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Attach HLS or MP4 trailer playback when hovered
  useEffect(() => {
    if (!showPreview) {
      setVideoReady(false);
      setVideoFailed(false);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    let cancelled = false;

    const startPlayback = () => {
      if (cancelled || !videoEl) return;
      try {
        // Start slightly into the video for a more dynamic preview if no dedicated trailer
        if (!previewVideo && videoEl.duration && videoEl.duration > 25 && videoEl.currentTime < 5) {
          videoEl.currentTime = 12;
        }
        const playPromise = videoEl.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } catch {
        // Ignore autoplay interruption
      }
    };

    if (previewVideo) {
      videoEl.src = previewVideo;
      videoEl.addEventListener("loadeddata", startPlayback, { once: true });
      return () => {
        cancelled = true;
      };
    }

    if (hlsUrl) {
      if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        videoEl.src = hlsUrl;
        videoEl.addEventListener("loadedmetadata", startPlayback, { once: true });
      } else {
        import("hls.js")
          .then(({ default: Hls }) => {
            if (cancelled || !videoRef.current) return;
            if (!Hls.isSupported()) {
              setVideoFailed(true);
              return;
            }
            const hls = new Hls({
              maxBufferLength: 8,
              maxMaxBufferLength: 12,
              startLevel: 0,
            });
            hlsRef.current = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, startPlayback);
            hls.on(Hls.Events.ERROR, (_evt, data) => {
              if (data?.fatal) {
                setVideoFailed(true);
              }
            });
          })
          .catch(() => setVideoFailed(true));
      }
    }

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [showPreview, previewVideo, hlsUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const updatePopoverPosition = () => {
    if (typeof window === "undefined" || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const popoverWidth = window.innerWidth >= 1024 ? 400 : 360;
    const minLeft = 16;
    const maxLeft = Math.max(minLeft, window.innerWidth - popoverWidth - 16);
    const rawLeft = rect.left + rect.width / 2 - popoverWidth / 2;
    const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);

    const estimatedHalfHeight = popoverWidth === 400 ? 180 : 168;
    const minTop = Math.min(estimatedHalfHeight + 16, window.innerHeight / 2);
    const maxTop = Math.max(window.innerHeight - estimatedHalfHeight - 16, window.innerHeight / 2);
    const rawTop = rect.top + rect.height / 2;
    const top = Math.min(Math.max(rawTop, minTop), maxTop);

    setPopoverPos({ left, top, width: popoverWidth });
  };

  useEffect(() => {
    if (!showPreview) return;
    const handleReposition = () => updatePopoverPosition();
    window.addEventListener("scroll", handleReposition, { passive: true, capture: true });
    window.addEventListener("resize", handleReposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleReposition, { capture: true });
      window.removeEventListener("resize", handleReposition);
    };
  }, [showPreview]);

  const handleMouseEnter = (event) => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (event?.nativeEvent?.pointerType === "touch") return;
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }

    updatePopoverPosition();
    if (!showPreview) {
      previewTimer.current = window.setTimeout(() => {
        updatePopoverPosition();
        setShowPreview(true);
      }, 240);
    }
  };

  const handlePopoverMouseEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      setShowPreview(false);
      setMuted(true);
    }, 120);
  };

  const genres = Array.isArray(item?.genres) && item.genres.length
    ? item.genres.slice(0, 3)
    : item?.category
    ? [item.category]
    : [];

  const durationText =
    playbackType === "series" && Array.isArray(item?.episodes) && item.episodes.length > 0
      ? `${item.episodes.length} Episode`
      : formatDuration(item?.duration);

  const hasVideoStream = Boolean((previewVideo || hlsUrl) && !videoFailed);

  return (
    <div
      ref={cardRef}
      data-card="true"
      data-href={detailHref}
      className={`relative cursor-pointer select-none ${showPreview ? "z-40" : "z-10"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Tonton ${title}`}
      onClick={() => openMedia(item, { origin: "card" })}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openMedia(item, { origin: "card" });
        }
      }}
    >
      {/* Base Card */}
      <div className="group relative block">
        <div
          className={`relative ${
            isPortrait ? "aspect-[2/3]" : "aspect-video"
          } overflow-hidden rounded-[4px] bg-[#181818] shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-transform duration-200 active:scale-95`}
        >
          <Image
            src={posterSrc}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 62vw, (max-width: 768px) 40vw, (max-width: 1024px) 27vw, 19vw"
            onError={() => setPosterSrc(defaultPoster)}
          />
          {/* Subtle Netflix K Badge */}
          <span className="absolute left-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-[2px] bg-[#E50914] text-[10px] font-black text-white shadow">
            K
          </span>
          {/* Bottom title gradient on base card */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2.5 pb-2 pt-6">
            <p className="line-clamp-1 text-xs sm:text-[13px] font-semibold text-white drop-shadow">{title}</p>
          </div>
          {progressValue !== null && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
              <div className="h-full bg-[#E50914]" style={{ width: `${progressValue * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Netflix Expanded Hover Mini-Card with Instant Trailer Playback (Portaled to avoid edge/overflow clipping) */}
      {showPreview &&
        popoverPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-popover="true"
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "fixed",
              left: `${popoverPos.left}px`,
              top: `${popoverPos.top}px`,
              width: `${popoverPos.width}px`,
              transform: "translateY(-50%)",
              zIndex: 60,
            }}
            className="hidden md:block"
          >
            <div className="w-full overflow-hidden rounded-md bg-[#181818] text-white shadow-[0_18px_48px_rgba(0,0,0,0.92)] ring-1 ring-white/20 animate-in fade-in zoom-in-95 duration-150">
              {/* 16:9 Live Video Preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
              <Image
                src={safePoster}
                alt={`${title} poster`}
                fill
                className={`object-cover transition-opacity duration-300 ${videoReady ? "opacity-0" : "opacity-100"}`}
                sizes="420px"
              />
              {!hasVideoStream && previewGif && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewGif}
                  alt={`${title} preview`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {hasVideoStream && (
                <video
                  ref={videoRef}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                    videoReady ? "opacity-100" : "opacity-0"
                  }`}
                  autoPlay
                  loop
                  muted={muted}
                  playsInline
                  onPlaying={() => setVideoReady(true)}
                  onCanPlay={() => setVideoReady(true)}
                  onError={() => setVideoFailed(true)}
                />
              )}

              {/* Bottom vignette + Title overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/20" />
              <p className="pointer-events-none absolute bottom-2 left-3 right-12 line-clamp-1 text-sm font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                {title}
              </p>

              {/* Netflix Mute / Unmute Button */}
              {hasVideoStream && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMuted((prev) => !prev);
                  }}
                  className="absolute bottom-2 right-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-black/55 text-white/90 transition hover:border-white hover:bg-black/80"
                  aria-label={muted ? "Nyalakan suara trailer" : "Matikan suara trailer"}
                >
                  {muted ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M23 9l-6 6M17 9l6 6" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                    </svg>
                  )}
                </button>
              )}
            </div>

            {/* Netflix Action Buttons & Metadata */}
            <div className="space-y-2.5 px-3.5 pb-3.5 pt-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Play Circle */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(watchHref);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 active:scale-95"
                    aria-label={`Putar ${title}`}
                  >
                    <svg className="h-4 w-4 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  {/* Detail / Info Circle */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openMedia(item, { origin: "card" });
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/45 bg-white/5 text-white transition hover:border-white hover:bg-white/15 active:scale-95"
                    aria-label={`Info ${title}`}
                    title="Info Lengkap"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                {/* Expand Overlay Info */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openMedia(item, { origin: "card" });
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/45 bg-white/5 text-white transition hover:border-white hover:bg-white/15 active:scale-95"
                  aria-label={`Info lengkap ${title}`}
                  title="Info Lengkap"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {/* Match / Year / Maturity / Duration */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="text-[#46d369]">Gratis</span>
                {item?.releaseYear && <span className="text-white/80">{item.releaseYear}</span>}
                <span className="rounded-[2px] border border-white/40 px-1 py-[1px] text-[10px] leading-none text-white/80">
                  {item?.maturityRating || "13+"}
                </span>
                {durationText && <span className="text-white/75">{durationText}</span>}
                <span className="rounded-[2px] border border-white/35 px-1 py-[1px] text-[9px] leading-none text-white/70">
                  HD
                </span>
              </div>

              {/* Dot-separated Genres */}
              {genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/85">
                  {genres.map((g, idx) => (
                    <span key={g} className="inline-flex items-center gap-1.5">
                      {idx > 0 && <span className="h-1 w-1 rounded-full bg-white/40" />}
                      <span>{g}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}
