"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMediaOverlay } from "./MediaOverlayProvider";
import { useAuth } from "../hooks/useAuth";
import { getUserHistory, isFavorite, toggleFavorite } from "../lib/firestore";
import { formatDuration } from "../lib/helpers";

function toMillis(value) {
  if (typeof value === "number") return value;
  if (value?._seconds) return value._seconds * 1000;
  return 0;
}

function formatMetaList(value) {
  if (Array.isArray(value)) {
    const filtered = value.map((item) => String(item || "").trim()).filter(Boolean);
    return filtered.length ? filtered.join(", ") : null;
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function ModalFavoriteButton({ video }) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user || !video?.id) {
      setFavorite(false);
      return;
    }
    isFavorite(user.uid, video.id)
      .then((state) => {
        if (active) setFavorite(state);
      })
      .catch(() => {
        if (active) setFavorite(false);
      });
    return () => {
      active = false;
    };
  }, [user, video?.id]);

  const handleToggle = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const result = await toggleFavorite(user.uid, video);
      if (typeof result?.isFavorite === "boolean") {
        setFavorite(result.isFavorite);
      }
    } catch (err) {
      console.warn("Gagal mengubah status favorit:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={favorite ? "Hapus dari Favorit" : "Tambah ke Favorit"}
      title={favorite ? "Hapus dari Favorit" : "Tambah ke Favorit"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        favorite
          ? "border-white bg-white/15 text-white hover:bg-white/25"
          : "border-white/50 bg-[#2a2a2a]/70 text-white hover:border-white hover:bg-[#2a2a2a]"
      }`}
    >
      {favorite ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </button>
  );
}

function EpisodeListSection({ episodes = [], onPlay, resumeEpisodeId }) {
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
    <div className="border-t border-white/10 pt-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-white">Episode</h3>
          <span className="text-xs text-white/50">{visibleEpisodes.length} episode</span>
        </div>

        {seasons.length > 1 && (
          <select
            aria-label="Pilih Season"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="rounded-[4px] border border-white/25 bg-[#242424] px-3.5 py-2 text-sm font-semibold text-white outline-none transition hover:border-white/50 focus:border-white"
          >
            {seasons.map((season) => (
              <option key={season} value={season} className="bg-[#242424] text-white">
                Season {season}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="divide-y divide-white/10">
        {visibleEpisodes.map((episode, index) => {
          const epNumber = episode.number ?? episode.order ?? index + 1;
          const isResume = resumeEpisodeId === episode.id;
          const isAvailable = Boolean(episode.playbackId || episode.streamUrl);

          return (
            <button
              key={episode.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onPlay(episode)}
              className={`group flex w-full items-center gap-3 sm:gap-5 rounded-md px-2 sm:px-4 py-4 text-left transition ${
                isAvailable
                  ? "hover:bg-white/[0.08] active:bg-white/[0.12]"
                  : "cursor-not-allowed opacity-65"
              } ${isResume ? "bg-white/[0.04]" : ""}`}
            >
              <span className="w-6 sm:w-8 flex-shrink-0 text-center text-base sm:text-xl font-medium text-white/60">
                {epNumber}
              </span>

              <div className="relative aspect-video w-28 sm:w-36 flex-shrink-0 overflow-hidden rounded-[4px] bg-black/70">
                {episode.thumbnail ? (
                  <Image
                    src={episode.thumbnail}
                    alt={episode.title || `Episode ${epNumber}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 112px, 144px"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-white/5 px-1 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                      Ep {epNumber}
                    </span>
                    {!isAvailable && (
                      <span className="text-[9px] font-medium text-amber-300/90">
                        Belum Tersedia
                      </span>
                    )}
                  </div>
                )}

                {isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-black/60 text-white">
                      <svg className="ml-0.5 h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm sm:text-[15px] font-semibold text-white">
                      {episode.title || `Episode ${epNumber}`}
                    </span>
                    {!isAvailable && (
                      <span className="flex-shrink-0 rounded-[3px] border border-amber-400/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                        Belum Tersedia
                      </span>
                    )}
                    {isResume && isAvailable && (
                      <span className="flex-shrink-0 rounded-[3px] bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Lanjutkan
                      </span>
                    )}
                  </div>
                  {episode.duration ? (
                    <span className="flex-shrink-0 text-xs sm:text-sm text-white/60">
                      {formatDuration(episode.duration)}
                    </span>
                  ) : null}
                </div>

                {episode.overview && (
                  <p className="line-clamp-2 text-xs sm:text-[13px] leading-relaxed text-white/60">
                    {episode.overview}
                  </p>
                )}
              </div>
            </button>
          );
        })}
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

  const releaseYear = useMemo(() => {
    const raw = detail?.releaseDate || detail?.year || media?.releaseDate || media?.year;
    if (!raw) return null;
    if (typeof raw === "number") return raw;
    const parsed = new Date(raw).getFullYear();
    return Number.isNaN(parsed) ? null : parsed;
  }, [detail, media]);

  const maturityRating = useMemo(() => {
    const value = detail?.maturityRating || detail?.ageRating || detail?.rating;
    if (value) return String(value);
    return detail?.isPremium ? "18+" : "13+";
  }, [detail]);

  const seasonCount = useMemo(() => {
    if (detail?.type !== "series") return 0;
    if (detail?.episodes?.length) {
      return new Set(detail.episodes.map((ep) => Number(ep.seasonNumber || 1))).size;
    }
    return Number(detail?.seasonCount || detail?.seasons || 1);
  }, [detail]);

  const heroImageUrl =
    detail?.backdropUrl || detail?.posterUrl || media?.backdropUrl || media?.posterUrl || "";

  const castLabel = formatMetaList(detail?.cast || detail?.actors) || "Tidak tersedia";
  const genreLabel =
    formatMetaList(detail?.genres || detail?.genre) || detail?.category || "Tidak tersedia";
  const directorLabel =
    formatMetaList(detail?.director || detail?.directors) || "Tidak tersedia";
  const languageLabel =
    formatMetaList(detail?.language || detail?.languages) || "Tidak tersedia";

  const resumeEpisode = useMemo(() => {
    if (detail?.type !== "series" || !historyEntry?.episodeId) return null;
    return detail.episodes?.find((ep) => ep.id === historyEntry.episodeId) || null;
  }, [detail, historyEntry]);

  const firstEpisode = useMemo(() => {
    if (detail?.type !== "series") return null;
    return detail.episodes?.find((ep) => ep.playbackId || ep.streamUrl) || detail.episodes?.[0] || null;
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
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Smooth dark backdrop */}
      <div
        className="pointer-events-auto absolute inset-0 bg-black/75 backdrop-blur-sm touch-none"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Netflix Title Detail Popup Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={detail?.title || media?.title || "Detail Konten"}
        className="pointer-events-auto relative z-[121] h-[100dvh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-none bg-[#181818] text-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg"
      >
        {/* Crisp top-right close button */}
        <button
          type="button"
          className="absolute right-3.5 sm:right-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#181818]/80 text-white shadow-lg backdrop-blur-sm transition hover:bg-[#181818] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40"
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

        {/* Top 16:9 Hero Section */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt={detail?.title || media?.title || "Detail Backdrop"}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-neutral-900 to-[#181818]" />
          )}

          {/* #181818 bottom gradient fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/35 to-transparent" />

          {/* Hero Title + Primary Actions */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 sm:gap-4 px-5 pb-5 sm:px-8 sm:pb-7">
            <h2 className="max-w-2xl break-words text-2xl font-bold leading-tight text-white drop-shadow-md sm:text-3xl md:text-4xl">
              {detail?.title || media?.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePlayNow}
                disabled={
                  loading ||
                  !ready ||
                  (detail?.type === "series" && !detail?.episodes?.length)
                }
                className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-white px-5 sm:px-6 py-2.5 text-sm font-bold text-black shadow-md transition hover:bg-white/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Putar</span>
              </button>

              {detail && <ModalFavoriteButton video={detail} />}

              {historyEntry?.progress > 0.05 && detail?.type !== "series" && (
                <span className="rounded-[4px] border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-medium text-white/80">
                  Lanjutkan {Math.round((historyEntry.progress || 0) * 100)}%
                </span>
              )}

              {detail?.type === "series" && resumeEpisode && (
                <span className="rounded-[4px] border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-medium text-white/80">
                  Lanjutkan Ep {resumeEpisode.number ?? resumeEpisode.order ?? ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata + Conditional Episodes */}
        <div
          className="space-y-8 px-5 pb-8 pt-3 sm:px-8 sm:pt-4"
          style={{
            paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))",
          }}
        >
          {loading && (
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70">
              Memuat detail konten...
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {/* Two-column Netflix Metadata Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                {/* Left Column: Year, Maturity Rating, Duration/Seasons, Overview */}
                <div className="space-y-4 md:col-span-2">
                  <div className="flex flex-wrap items-center gap-2.5 text-sm">
                    {releaseYear && (
                      <span className="font-semibold text-white/90">{releaseYear}</span>
                    )}
                    <span className="rounded-[2px] border border-white/40 px-1.5 py-0.5 text-xs font-medium leading-none text-white/90">
                      {maturityRating}
                    </span>
                    {detail.type === "series" ? (
                      <span className="text-white/80">
                        {seasonCount} Season
                      </span>
                    ) : detail.duration ? (
                      <span className="text-white/80">
                        {formatDuration(detail.duration)}
                      </span>
                    ) : null}
                    {detail.isPremium && (
                      <span className="rounded-[2px] border border-white/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                        Premium
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-[15px] leading-relaxed text-white/90">
                    {detail.overview || "Tidak ada sinopsis tersedia."}
                  </p>
                </div>

                {/* Right Column: Pemeran, Genre, Sutradara, Bahasa */}
                <div className="space-y-2.5 text-xs sm:text-[13px] leading-relaxed">
                  <div>
                    <span className="text-white/50">Pemeran: </span>
                    <span className="text-white/90">{castLabel}</span>
                  </div>
                  <div>
                    <span className="text-white/50">Genre: </span>
                    <span className="text-white/90">{genreLabel}</span>
                  </div>
                  <div>
                    <span className="text-white/50">Sutradara: </span>
                    <span className="text-white/90">{directorLabel}</span>
                  </div>
                  <div>
                    <span className="text-white/50">Bahasa: </span>
                    <span className="text-white/90">{languageLabel}</span>
                  </div>
                </div>
              </div>

              {/* Conditional Series Episodes Section */}
              {detail.type === "series" && detail.episodes?.length > 0 && (
                <EpisodeListSection
                  episodes={detail.episodes}
                  onPlay={handlePlayEpisode}
                  resumeEpisodeId={resumeEpisode?.id || firstEpisode?.id}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
