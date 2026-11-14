"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FavoriteButton from "./FavoriteButton";
import { useMediaOverlay } from "./MediaOverlayProvider";
import { useAuth } from "../hooks/useAuth";
import { getUserHistory } from "../lib/firestore";
import { formatDuration } from "../lib/helpers";

function toMillis(value) {
  if (typeof value === "number") return value;
  if (value?._seconds) return value._seconds * 1000;
  return 0;
}

function EpisodeListSection({ episodes = [], onPlay, resumeEpisodeId }) {
  // Multi-season detection for series with multiple seasons (satisfies T3-COMB-05)
  const seasons = useMemo(() => {
    return Array.from(
      new Set(episodes.map((ep) => Number(ep.seasonNumber || 1)))
    ).sort((a, b) => a - b);
  }, [episodes]);

  const [selectedSeason, setSelectedSeason] = useState(seasons[0] ?? 1);

  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);

  const visibleEpisodes = useMemo(() => {
    return seasons.length > 1
      ? episodes.filter((ep) => Number(ep.seasonNumber || 1) === selectedSeason)
      : episodes;
  }, [episodes, seasons, selectedSeason]);

  if (!episodes.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-white">Episode Tersedia</h3>
        <span className="text-xs uppercase tracking-widest text-white/60">
          {visibleEpisodes.length} episode
        </span>
      </div>

      {/* Season swipe selector if series has >1 season */}
      {seasons.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {seasons.map((season) => (
            <button
              key={season}
              type="button"
              onClick={() => setSelectedSeason(season)}
              className={`flex-shrink-0 min-h-[38px] rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95 ${
                selectedSeason === season
                  ? "bg-white text-black shadow-sm"
                  : "border border-white/15 bg-white/5 text-white/80 hover:border-white/30"
              }`}
            >
              Season {season}
            </button>
          ))}
        </div>
      )}

      {/* Episode list without nested overflow-y-auto to eliminate inner scroll trap */}
      <div className="flex flex-col gap-3">
        {visibleEpisodes.map((episode) => (
          <button
            key={episode.id}
            type="button"
            className="group flex items-center gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 sm:p-3 text-left transition hover:border-white/40 hover:bg-white/[0.12] active:scale-[0.99] active:bg-white/[0.15]"
            onClick={() => onPlay(episode)}
          >
            {/* Scaled thumbnail: w-28 sm:w-40 aspect-video */}
            <div className="relative aspect-video w-28 sm:w-40 flex-shrink-0 overflow-hidden rounded-xl bg-black">
              {episode.thumbnail ? (
                <Image
                  src={episode.thumbnail}
                  alt={episode.title || `Episode ${episode.number}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 112px, 160px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/40">
                  Episode
                </div>
              )}
            </div>

            {/* Defensive flex container with min-w-0 to prevent squashing */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex-shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] sm:text-[11px] uppercase tracking-widest text-white/80">
                  Ep {episode.number ?? episode.order ?? ""}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-semibold text-white">
                  {episode.title}
                </span>
                {resumeEpisodeId === episode.id && (
                  <span className="flex-shrink-0 text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-brand">
                    Lanjutkan
                  </span>
                )}
              </div>
              {episode.overview && (
                <p className="line-clamp-2 text-xs text-white/70">{episode.overview}</p>
              )}
              <div className="text-[10px] sm:text-[11px] uppercase tracking-widest text-white/50">
                {episode.duration ? formatDuration(episode.duration) : "Durasi tidak tersedia"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MediaOverlayRoot() {
  const { isOpen, media, closeMedia, resetMedia } = useMediaOverlay();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyEntry, setHistoryEntry] = useState(null);
  const [ready, setReady] = useState(false);
  const lastPathnameRef = useRef(pathname);
  const closeTimerRef = useRef(null);

  const resolvedId = useMemo(() => media?.slug || media?.id || null, [media]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (!isOpen) {
      setDetail(null);
      setError(null);
      setHistoryEntry(null);
      setReady(false);
      return;
    }

    if (!resolvedId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/media/${encodeURIComponent(resolvedId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Gagal memuat detail konten.");
        }
        return response.json();
      })
      .then((payload) => {
        setDetail(payload.media || null);
        setReady(true);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Gagal memuat detail media:", err);
        setError(err.message || "Gagal memuat detail media.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOpen, resolvedId]);

  useEffect(() => {
    if (!isOpen || !user?.uid || !detail?.id) {
      setHistoryEntry(null);
      return;
    }

    let mounted = true;
    getUserHistory(user.uid, 50)
      .then((historyItems) => {
        if (!mounted) return;
        if (!Array.isArray(historyItems) || !historyItems.length) {
          setHistoryEntry(null);
          return;
        }
        if (detail.type === "series") {
          const prefix = `${detail.id}-`;
          const seriesEntries = historyItems
            .filter((item) => typeof item.id === "string" && item.id.startsWith(prefix))
            .map((item) => ({
              ...item,
              episodeId: item.id.slice(prefix.length),
              updatedAtValue: toMillis(item.updatedAt),
            }))
            .sort((a, b) => (b.updatedAtValue || 0) - (a.updatedAtValue || 0));
          setHistoryEntry(seriesEntries[0] || null);
        } else {
          const movieEntry = historyItems
            .map((item) => ({ ...item, updatedAtValue: toMillis(item.updatedAt) }))
            .find((item) => item.id === detail.id);
          setHistoryEntry(movieEntry || null);
        }
      })
      .catch((err) => {
        console.warn("Gagal mengambil riwayat pengguna:", err);
        setHistoryEntry(null);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, user?.uid, detail?.id, detail?.type]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      lastPathnameRef.current = pathname;
      return;
    }
    if (lastPathnameRef.current !== pathname) {
      resetMedia();
    }
    lastPathnameRef.current = pathname;
  }, [pathname, isOpen, resetMedia]);

  const handleClose = useCallback(() => {
    closeMedia();
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setDetail(null);
      setHistoryEntry(null);
      setError(null);
      setReady(false);
      closeTimerRef.current = null;
    }, 250);
  }, [closeMedia]);

  // Escape key accessibility handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleClose]);

  const metadataPills = useMemo(() => {
    if (!detail) return [];
    const releaseYear = detail.releaseDate ? new Date(detail.releaseDate).getFullYear() : null;
    return [releaseYear, detail.category, detail.isPremium ? "Premium" : "Free"].filter(Boolean);
  }, [detail]);

  const resumeEpisode = useMemo(() => {
    if (detail?.type !== "series" || !historyEntry?.episodeId) return null;
    return detail.episodes?.find((ep) => ep.id === historyEntry.episodeId) || null;
  }, [detail, historyEntry]);

  const firstEpisode = useMemo(() => {
    if (detail?.type !== "series") return null;
    return detail.episodes?.[0] || null;
  }, [detail]);

  const navigateToPlayer = useCallback(
    (options = {}) => {
      if (!detail) return;
      const type = detail.type === "series" ? "series" : "movie";
      const identifier = detail.slug || detail.id;
      const params = new URLSearchParams({ id: identifier, type });
      if (type === "series" && options.episodeId) {
        params.set("ep", options.episodeId);
      }
      if (options.autoplay) params.set("autoplay", "1");

      handleClose();
      router.push(`/player?${params.toString()}`);
    },
    [detail, handleClose, router]
  );

  const handlePlayNow = useCallback(() => {
    if (!detail) return;
    if (detail.type === "series") {
      const targetEpisodeId = resumeEpisode?.id || firstEpisode?.id;
      if (!targetEpisodeId) return;
      navigateToPlayer({ episodeId: targetEpisodeId, autoplay: true });
      return;
    }
    navigateToPlayer({ autoplay: true });
  }, [detail, resumeEpisode, firstEpisode, navigateToPlayer]);

  const handlePlayEpisode = useCallback(
    (episode) => {
      if (!episode) return;
      navigateToPlayer({ episodeId: episode.id, autoplay: true });
    },
    [navigateToPlayer]
  );

  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8">
      {/* Backdrop with touch-none dismiss */}
      <div
        className="pointer-events-auto absolute inset-0 bg-black/80 backdrop-blur-md touch-none"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container: full-screen on mobile, centered floating dialog on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={detail?.title || "Detail Konten"}
        className="pointer-events-auto relative z-[121] flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none bg-surface-100 text-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl"
      >
        {/* Close Button: >= 44x44px accessible hit target with safe-area top clearance & SVG icon */}
        <button
          type="button"
          className="absolute right-3.5 sm:right-4 z-30 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-md transition hover:bg-black/90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40"
          onClick={handleClose}
          aria-label="Tutup modal detail"
          style={{
            top: "max(0.875rem, env(safe-area-inset-top, 0.875rem))",
          }}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Backdrop Banner */}
        {detail?.backdropUrl ? (
          <div className="relative aspect-[16/9] w-full flex-shrink-0 overflow-hidden">
            <Image
              src={detail.backdropUrl}
              alt={detail.title || "Detail Backdrop"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1152px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/0" />
          </div>
        ) : (
          <div className="relative aspect-[16/9] w-full flex-shrink-0 bg-gradient-to-br from-black to-surface-200" />
        )}

        {/* Modal Content Scroll Container: unified overflow with overscroll-contain & pb-safe */}
        <div
          className="relative flex-1 space-y-6 sm:space-y-8 overflow-y-auto overscroll-contain px-4 pb-8 pt-4 sm:px-10 sm:pt-6"
          style={{
            paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))",
          }}
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                {detail?.type === "series" ? "Series" : "Film"}
              </p>
              <h2 className="break-words text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
                {detail?.title || media?.title}
              </h2>
            </div>

            {metadataPills.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 text-[11px] font-semibold uppercase tracking-widest text-white/60">
                {metadataPills.map((pill) => (
                  <span key={pill} className="rounded-full border border-white/20 px-3 py-0.5 sm:py-1">
                    {pill}
                  </span>
                ))}
              </div>
            )}

            {detail?.overview && (
              <p className="max-w-3xl text-sm leading-relaxed text-white/80">{detail.overview}</p>
            )}

            {/* Action Buttons: Full-width on mobile with >= 44px touch targets */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handlePlayNow}
                disabled={loading || !ready || (detail?.type === "series" && !detail?.episodes?.length)}
                className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg transition hover:bg-white/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Tonton sekarang</span>
              </button>

              <div className="w-full sm:w-auto [&>button]:w-full [&>button]:sm:w-auto [&>button]:min-h-[44px] [&>button]:justify-center [&>button]:rounded-full [&>button]:px-5 [&>button]:py-2.5 [&>button]:text-sm">
                {detail && <FavoriteButton video={detail} />}
              </div>

              {historyEntry?.progress > 0.05 && detail?.type === "movie" && (
                <span className="self-start sm:self-auto rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-white/60">
                  Lanjutkan dari {Math.round((historyEntry.progress || 0) * 100)}%
                </span>
              )}

              {detail?.type === "series" && resumeEpisode && (
                <span className="self-start sm:self-auto rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-white/60">
                  Lanjutkan Episode {resumeEpisode.number}
                </span>
              )}
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-sm text-white/70">
              Memuat detail konten...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && detail?.type === "series" && detail?.episodes?.length > 0 && (
            <EpisodeListSection
              episodes={detail.episodes}
              onPlay={handlePlayEpisode}
              resumeEpisodeId={resumeEpisode?.id || firstEpisode?.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
