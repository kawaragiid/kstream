"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMediaOverlay } from "./MediaOverlayProvider";
import { useAuth } from "../hooks/useAuth";
import { readUserDoc, toggleFavorite } from "../lib/firestore";
import KLogoBadge from "./KLogoBadge";

const FAVORITES_CACHE_TTL_MS = 30000;
const favoritesCache = new Map();

async function getCachedFavoriteIds(uid) {
  if (!uid) return new Set();
  const now = Date.now();
  const entry = favoritesCache.get(uid);
  if (entry?.ids && now - entry.fetchedAt < FAVORITES_CACHE_TTL_MS) {
    return entry.ids;
  }
  if (entry?.promise) {
    return entry.promise;
  }
  const promise = readUserDoc(uid)
    .then(({ data = {} }) => {
      const list = Array.isArray(data.favorites) ? data.favorites : [];
      const ids = new Set(list.map((fav) => fav?.id).filter(Boolean));
      favoritesCache.set(uid, { ids, fetchedAt: Date.now(), promise: null });
      return ids;
    })
    .catch(() => {
      favoritesCache.delete(uid);
      return new Set();
    });
  favoritesCache.set(uid, { ids: entry?.ids || null, fetchedAt: entry?.fetchedAt || 0, promise });
  return promise;
}

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
  const rawTrailer = item?.trailerUrl || "";
  const previewAnimation = item?.previewAnimation || "";
  const playbackId = item?.playbackId || item?.mux_playback_id || "";
  const lowerTrailer = rawTrailer.toLowerCase();
  const isGif = lowerTrailer.includes(".gif");
  const isHls = lowerTrailer.includes(".m3u8");
  const isVideo = lowerTrailer.includes(".mp4") || lowerTrailer.includes(".webm");
  const fallbackGif = previewAnimation || (isGif ? rawTrailer : "");
  const previewVideo = rawTrailer && isVideo ? rawTrailer : "";
  const hlsUrl = rawTrailer && isHls ? rawTrailer : "";
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
  const { user } = useAuth();
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
  const [gifFailed, setGifFailed] = useState(false);
  const [popoverPosterSrc, setPopoverPosterSrc] = useState(safePoster);
  const [favorite, setFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState("");

  const previewTimer = useRef(null);
  const leaveTimer = useRef(null);
  const favErrorTimer = useRef(null);
  const cardRef = useRef(null);
  const popoverRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const lastInputTouchRef = useRef(false);

  useEffect(() => {
    setPosterSrc(isPortrait ? item?.posterUrl || safePoster : item?.backdropUrl || item?.posterUrl || safePoster);
  }, [item?.posterUrl, item?.backdropUrl, safePoster, isPortrait]);

  useEffect(() => {
    setPopoverPosterSrc(safePoster);
    setGifFailed(false);
  }, [safePoster, previewGif]);

  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      if (favErrorTimer.current) clearTimeout(favErrorTimer.current);
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
    } else if (hlsUrl) {
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
      videoEl.removeEventListener("loadeddata", startPlayback);
      videoEl.removeEventListener("loadedmetadata", startPlayback);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
      } catch {
        // Ignore media teardown errors
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
    const popoverWidth = Math.min(window.innerWidth >= 1024 ? 400 : 360, Math.max(240, window.innerWidth - 32));
    const minLeft = 16;
    const maxLeft = Math.max(minLeft, window.innerWidth - popoverWidth - 16);
    const rawLeft = rect.left + rect.width / 2 - popoverWidth / 2;
    const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);

    const estimatedHalfHeight = 210;
    const minTop = Math.min(estimatedHalfHeight + 12, window.innerHeight / 2);
    const maxTop = Math.max(window.innerHeight - estimatedHalfHeight - 12, window.innerHeight / 2);
    const rawTop = rect.top + rect.height / 2;
    const clampedTop = Math.min(Math.max(rawTop, minTop), maxTop);
    const top = Math.min(Math.max(clampedTop, 12), Math.max(12, window.innerHeight - 12));

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

  useEffect(() => {
    if (!user?.uid || !item?.id) {
      setFavorite(false);
      return;
    }
    if (!showPreview) return;
    let active = true;
    getCachedFavoriteIds(user.uid)
      .then((ids) => {
        if (active) setFavorite(ids.has(item.id));
      })
      .catch(() => {
        if (active) setFavorite(false);
      });
    return () => {
      active = false;
    };
  }, [showPreview, user?.uid, item?.id]);

  const handleToggleFavorite = async (event) => {
    event.stopPropagation();
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`);
      return;
    }
    if (!item?.id || favLoading) return;
    setFavLoading(true);
    setFavError("");
    try {
      const result = await toggleFavorite(user.uid, item);
      if (typeof result?.isFavorite === "boolean") {
        setFavorite(result.isFavorite);
        const cached = favoritesCache.get(user.uid);
        if (cached?.ids) {
          if (result.isFavorite) cached.ids.add(item.id);
          else cached.ids.delete(item.id);
          cached.fetchedAt = Date.now();
        }
      }
    } catch (err) {
      console.warn("Gagal mengubah status favorit:", err);
      setFavError("Gagal menyimpan favorit");
      if (favErrorTimer.current) clearTimeout(favErrorTimer.current);
      favErrorTimer.current = setTimeout(() => setFavError(""), 3000);
    } finally {
      setFavLoading(false);
    }
  };

  const handlePointerEnter = (event) => {
    if (typeof window === "undefined") return;
    const pointerType = event?.pointerType || event?.nativeEvent?.pointerType || "";
    if (pointerType === "touch") {
      lastInputTouchRef.current = true;
      return;
    }
    if (pointerType) {
      lastInputTouchRef.current = false;
    } else if (lastInputTouchRef.current) {
      return;
    }
    // Untuk keyboard focus (tanpa pointerType), batasi ke layar >= 768px atau perangkat yang mendukung hover
    if (!pointerType && window.innerWidth < 768 && !window.matchMedia("(any-hover: hover)").matches) {
      return;
    }
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

  const handleMouseLeave = (event) => {
    const pointerType = event?.pointerType || event?.nativeEvent?.pointerType || "";
    if (pointerType === "touch") return;
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

  const handleBlur = (event) => {
    const nextFocused = event?.relatedTarget;
    if (nextFocused && (cardRef.current?.contains(nextFocused) || popoverRef.current?.contains(nextFocused))) {
      return;
    }
    handleMouseLeave();
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
  const hasPlayableSeriesEpisode =
    playbackType !== "series" ||
    !Array.isArray(item?.episodes) ||
    item.episodes.length === 0 ||
    item.episodes.some((ep) => Boolean(ep?.playbackId || ep?.streamUrl));

  return (
    <div
      ref={cardRef}
      data-card="true"
      data-href={detailHref}
      className={`relative cursor-pointer select-none ${showPreview ? "z-40" : "z-10"}`}
      onPointerDown={(event) => {
        lastInputTouchRef.current = event.pointerType === "touch";
      }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handleMouseLeave}
      onFocus={handlePointerEnter}
      onBlur={handleBlur}
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
          <KLogoBadge size={isPortrait ? "sm" : "xs"} />
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
            ref={popoverRef}
            data-popover="true"
            onPointerEnter={handlePopoverMouseEnter}
            onPointerLeave={handleMouseLeave}
            onFocus={handlePopoverMouseEnter}
            onBlur={handleBlur}
            onKeyDown={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              left: `${popoverPos.left}px`,
              top: `${popoverPos.top}px`,
              width: `${popoverPos.width}px`,
              transform: "translateY(-50%)",
              zIndex: 60,
            }}
            className="block"
          >
            <div className="w-full max-h-[calc(100vh-24px)] overflow-y-auto overflow-x-hidden rounded-md bg-[#181818] text-white shadow-[0_18px_48px_rgba(0,0,0,0.92)] ring-1 ring-white/20 animate-in fade-in zoom-in-95 duration-150">
              {/* 16:9 Live Video Preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
              <Image
                src={popoverPosterSrc}
                alt={`${title} poster`}
                fill
                onError={() => setPopoverPosterSrc(PLACEHOLDER_LANDSCAPE)}
                className={`object-cover transition-opacity duration-300 ${videoReady ? "opacity-0" : "opacity-100"}`}
                sizes="420px"
              />
              {!hasVideoStream && previewGif && !gifFailed && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewGif}
                  alt={`${title} preview`}
                  onError={() => setGifFailed(true)}
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
                      if (!hasPlayableSeriesEpisode) {
                        openMedia(item, { origin: "card" });
                        return;
                      }
                      router.push(watchHref);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 active:scale-95"
                    aria-label={`Putar ${title}`}
                  >
                    <svg className="h-4 w-4 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  {/* Toggle Favorite / Daftar Saya */}
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={favLoading}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                      favorite
                        ? "border-white bg-white/15 text-white hover:bg-white/25"
                        : "border-white/45 bg-white/5 text-white hover:border-white hover:bg-white/15"
                    }`}
                    aria-label={favorite ? `Hapus ${title} dari Daftar Saya` : `Tambah ${title} ke Daftar Saya`}
                    title={favorite ? "Hapus dari Daftar Saya" : "Tambah ke Daftar Saya"}
                  >
                    {favorite ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    )}
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

              {favError && (
                <p className="text-[11px] font-medium text-[#e87c03]">{favError}</p>
              )}

              {/* Year / Maturity / Duration */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                {item?.releaseYear && <span className="text-white/80">{item.releaseYear}</span>}
                <span className="rounded-[2px] border border-white/40 px-1 py-[1px] text-[10px] leading-none text-white/80">
                  {item?.maturityRating || "13+"}
                </span>
                {durationText && <span className="text-white/75">{durationText}</span>}
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
