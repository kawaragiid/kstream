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
  if (!episodes.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Episode Tersedia</h3>
        <span className="text-xs uppercase tracking-widest text-white/60">{episodes.length} episode</span>
      </div>
      <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1">
        {episodes.map((episode) => (
          <button
            key={episode.id}
            type="button"
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition hover:border-white/40 hover:bg-white/[0.12]"
            onClick={() => onPlay(episode)}
          >
            <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded-xl bg-black">
              {episode.thumbnail ? (
                <Image
                  src={episode.thumbnail}
                  alt={episode.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="144px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs uppercase tracking-[0.3em] text-white/40">
                  Episode
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-3 text-sm font-semibold text-white">
                <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] uppercase tracking-widest text-white/80">
                  Ep {episode.number ?? episode.order ?? ""}
                </span>
                <span className="line-clamp-1">{episode.title}</span>
                {resumeEpisodeId === episode.id && (
                  <span className="text-xs font-semibold uppercase tracking-widest text-brand">Lanjutkan</span>
                )}
              </div>
              {episode.overview && <p className="line-clamp-2 text-xs text-white/70">{episode.overview}</p>}
              <div className="text-[11px] uppercase tracking-widest text-white/50">
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

  const resolvedId = useMemo(() => media?.slug || media?.id || null, [media]);

  useEffect(() => {
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
      .finally(() => setLoading(false));

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
      document.body.style.overflow = originalOverflow;
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

  const handleClose = useCallback(() => {
    closeMedia();
    setTimeout(() => {
      setDetail(null);
      setHistoryEntry(null);
      setError(null);
      setReady(false);
    }, 250);
  }, [closeMedia]);

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
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center">
      <div className="pointer-events-auto absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleClose} />
      <div className="pointer-events-auto relative z-[121] flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-surface-100 text-white shadow-2xl sm:h-auto sm:max-h-[92vh]">
        <button
          type="button"
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition hover:bg-black/90"
          onClick={handleClose}
        >
          &times;
        </button>

        {detail?.backdropUrl ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              src={detail.backdropUrl}
              alt={detail.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/0" />
          </div>
        ) : (
          <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-black to-surface-200" />
        )}

        <div className="relative flex-1 space-y-8 overflow-y-auto px-6 pb-8 pt-6 sm:px-10">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                {detail?.type === "series" ? "Series" : "Film"}
              </p>
              <h2 className="text-3xl font-bold md:text-4xl">{detail?.title || media?.title}</h2>
            </div>
            {metadataPills.length > 0 && (
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-widest text-white/60">
                {metadataPills.map((pill) => (
                  <span key={pill} className="rounded-full border border-white/20 px-3 py-1">
                    {pill}
                  </span>
                ))}
              </div>
            )}
            {detail?.overview && <p className="max-w-3xl text-sm leading-relaxed text-white/80">{detail.overview}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePlayNow}
                disabled={loading || !ready || (detail?.type === "series" && !detail?.episodes?.length)}
                className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-2 text-sm font-semibold text-black shadow-lg transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                ▶ Tonton sekarang
              </button>
              {detail && <FavoriteButton video={detail} />}
              {historyEntry?.progress > 0.05 && detail?.type === "movie" && (
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
                  Lanjutkan dari {Math.round((historyEntry.progress || 0) * 100)}%
                </span>
              )}
              {detail?.type === "series" && resumeEpisode && (
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
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
