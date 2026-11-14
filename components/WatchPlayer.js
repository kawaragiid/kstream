"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { getUserHistory, saveHistoryProgress } from '../lib/firestore';
import VideoPlayer from './VideoPlayer';

const GUEST_DAILY_LIMIT = 1;
const GUEST_PREVIEW_MAX_SECONDS = 180; // 3 menit preview untuk tamu tanpa login
const GUEST_PREVIEW_STORAGE_KEY = 'kstream_guest_preview_sec_v1';

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const readGuestPreviewState = (todayKey, contentKey, episodeKey) => {
  if (typeof window === 'undefined' || !todayKey || !contentKey) {
    return { seconds: 0, episodePosition: 0 };
  }
  try {
    const raw = window.localStorage.getItem(GUEST_PREVIEW_STORAGE_KEY);
    if (!raw) return { seconds: 0, episodePosition: 0 };
    const parsed = JSON.parse(raw);
    const dayBucket = parsed && typeof parsed === 'object' ? parsed[todayKey] : null;
    const entry = dayBucket && typeof dayBucket === 'object' ? dayBucket[contentKey] : null;
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      const clamped = Math.max(0, entry);
      return { seconds: clamped, episodePosition: clamped };
    }
    if (entry && typeof entry === 'object') {
      const seconds = Math.max(0, Number(entry.seconds) || 0);
      const positions = entry.positions && typeof entry.positions === 'object' ? entry.positions : null;
      let episodePosition = 0;
      if (positions && typeof positions[episodeKey] === 'number' && Number.isFinite(positions[episodeKey])) {
        episodePosition = Math.max(0, positions[episodeKey]);
      } else if (!entry.episodeId || entry.episodeId === episodeKey) {
        episodePosition = seconds;
      }
      return { seconds, episodePosition };
    }
  } catch {
    // ignore storage errors
  }
  return { seconds: 0, episodePosition: 0 };
};

const writeGuestPreviewState = (todayKey, contentKey, episodeKey, seconds, episodePosition) => {
  if (typeof window === 'undefined' || !todayKey || !contentKey) return;
  try {
    const raw = window.localStorage.getItem(GUEST_PREVIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const prevDay =
      parsed && typeof parsed === 'object' && parsed[todayKey] && typeof parsed[todayKey] === 'object'
        ? parsed[todayKey]
        : {};
    const prevEntry =
      prevDay[contentKey] && typeof prevDay[contentKey] === 'object' ? prevDay[contentKey] : {};
    const prevPositions =
      prevEntry.positions && typeof prevEntry.positions === 'object' ? prevEntry.positions : {};
    const safeSeconds = Math.max(0, Math.min(GUEST_PREVIEW_MAX_SECONDS, Number(seconds) || 0));
    const safePos = Math.max(0, Number(episodePosition) || 0);
    const nextStore = {
      [todayKey]: {
        ...prevDay,
        [contentKey]: {
          seconds: safeSeconds,
          episodeId: episodeKey,
          positions: {
            ...prevPositions,
            [episodeKey]: safePos,
          },
        },
      },
    };
    window.localStorage.setItem(GUEST_PREVIEW_STORAGE_KEY, JSON.stringify(nextStore));
  } catch {
    // ignore storage errors
  }
};

export default function WatchPlayer({
  video = {},
  playbackId,
  src,
  poster,
  title,
  subtitles = [],
  episodes = [],
  currentEpisode = null,
  series = null,
  autoplay = false,
  backHref,
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lastUpdateRef = useRef(0);
  const autoAdvanceRef = useRef(null);
  const viewTrackedKeyRef = useRef('');
  const lastTrackedTimeRef = useRef(0);
  const pendingWatchSecondsRef = useRef(0);
  const guestPreviewSecondsRef = useRef(0);
  const lastSavedPreviewSecRef = useRef(-1);
  const latestVideoRef = useRef(video);
  const [guestLimitReason, setGuestLimitReason] = useState('');
  const [resumePosition, setResumePosition] = useState(0);
  const [guestResumePosition, setGuestResumePosition] = useState(0);

  const contentId = series?.id || video?.seriesId || video?.id || '';
  const contentSlug = series?.slug || video?.slug || contentId;
  const contentType = series ? 'series' : (video?.type === 'series' ? 'series' : 'movie');
  const contentKey = contentId ? `${contentType}:${contentId}` : '';
  const episodeKey = currentEpisode?.id || 'main';

  const sendAnalyticsPing = useCallback(
    ({ isNewView = false, watchSeconds = 0, beacon = false } = {}) => {
      if (!contentId && !contentSlug) return;
      if (!isNewView && watchSeconds < 1) return;
      const payload = JSON.stringify({
        id: contentId,
        slug: contentSlug,
        type: contentType,
        title: series?.title || video?.title || '',
        isNewView,
        watchSeconds: Math.round(watchSeconds),
      });
      if (beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/view', blob);
        return;
      }
      fetch('/api/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    },
    [contentId, contentSlug, contentType, series?.title, video?.title]
  );

  useEffect(() => {
    latestVideoRef.current = video;
  }, [video]);

  useEffect(() => {
    lastUpdateRef.current = 0;
    lastTrackedTimeRef.current = 0;
    pendingWatchSecondsRef.current = 0;
    lastSavedPreviewSecRef.current = -1;
  }, [video?.id, currentEpisode?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setGuestLimitReason('');
      setGuestResumePosition(0);
      guestPreviewSecondsRef.current = 0;
      return;
    }
    if (typeof window === 'undefined' || !contentKey) return;
    const todayKey = `kstream_guest_watches_${getLocalDateKey()}`;
    try {
      const raw = window.localStorage.getItem(todayKey);
      const list = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      const isTrackedToday = arr.includes(contentKey);
      if (!isTrackedToday && arr.length >= GUEST_DAILY_LIMIT) {
        setGuestLimitReason('daily');
        setGuestResumePosition(0);
        return;
      }
      if (!isTrackedToday) {
        arr.push(contentKey);
        window.localStorage.setItem(todayKey, JSON.stringify(arr));
      }

      const { seconds, episodePosition } = readGuestPreviewState(todayKey, contentKey, episodeKey);
      guestPreviewSecondsRef.current = seconds;
      lastSavedPreviewSecRef.current = Math.floor(seconds);
      if (seconds >= GUEST_PREVIEW_MAX_SECONDS) {
        setGuestLimitReason('preview');
        setGuestResumePosition(0);
        return;
      }
      setGuestResumePosition(episodePosition);
      setGuestLimitReason('');
    } catch {
      setGuestLimitReason('');
      return;
    }

    const persistGuestPreview = () => {
      if (guestPreviewSecondsRef.current > 0) {
        writeGuestPreviewState(
          todayKey,
          contentKey,
          episodeKey,
          guestPreviewSecondsRef.current,
          lastTrackedTimeRef.current
        );
      }
    };
    window.addEventListener('pagehide', persistGuestPreview);
    return () => {
      window.removeEventListener('pagehide', persistGuestPreview);
      persistGuestPreview();
    };
  }, [authLoading, user, contentKey, episodeKey]);

  useEffect(() => {
    if (authLoading || guestLimitReason) return;
    const sessionKey = `${contentType}:${contentId}:${currentEpisode?.id || 'main'}`;
    if (!contentId || viewTrackedKeyRef.current === sessionKey) return;
    viewTrackedKeyRef.current = sessionKey;
    sendAnalyticsPing({ isNewView: true, watchSeconds: 0 });
  }, [authLoading, guestLimitReason, contentId, contentType, currentEpisode?.id, sendAnalyticsPing]);

  useEffect(() => {
    return () => {
      if (pendingWatchSecondsRef.current >= 5) {
        sendAnalyticsPing({
          isNewView: false,
          watchSeconds: pendingWatchSecondsRef.current,
          beacon: true,
        });
        pendingWatchSecondsRef.current = 0;
      }
    };
  }, [video?.id, sendAnalyticsPing]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, [video?.id]);

  useEffect(() => {
    setResumePosition(0);
    if (!user?.uid || !video?.id) return;
    let active = true;
    getUserHistory(user.uid, 50)
      .then((items) => {
        if (!active || !Array.isArray(items)) return;
        const found = items.find((item) => item.id === video.id);
        if (found && Number(found.position) > 5 && Number(found.progress || 0) < 0.95) {
          setResumePosition(Number(found.position));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.uid, video?.id]);

  useEffect(() => {
    const currentVideo = latestVideoRef.current;
    if (!user?.uid || !video?.id || !currentVideo?.id) return;
    saveHistoryProgress(
      user.uid,
      currentVideo,
      { progress: 0, position: 0, duration: currentVideo.duration || 0 },
      { preserveExisting: true }
    ).catch(() => undefined);
  }, [user?.uid, video?.id, currentEpisode?.id]);

  const handleProgress = useCallback(({ currentTime, duration }) => {
    const currentVideo = latestVideoRef.current;
    const isGuest = !authLoading && !user;
    const hasValidTime = typeof currentTime === 'number' && Number.isFinite(currentTime) && currentTime >= 0;

    if (hasValidTime) {
      const delta = currentTime - lastTrackedTimeRef.current;
      if (delta > 0 && delta <= 2.5) {
        pendingWatchSecondsRef.current += delta;
        if (isGuest) {
          guestPreviewSecondsRef.current += delta;
        }
      }
      lastTrackedTimeRef.current = currentTime;

      if ((contentId || currentVideo?.id) && pendingWatchSecondsRef.current >= 30) {
        const toSend = pendingWatchSecondsRef.current;
        pendingWatchSecondsRef.current = 0;
        sendAnalyticsPing({ isNewView: false, watchSeconds: toSend });
      }
    }

    if (isGuest) {
      const todayKey = `kstream_guest_watches_${getLocalDateKey()}`;
      const reachedCap =
        (hasValidTime && currentTime >= GUEST_PREVIEW_MAX_SECONDS) ||
        guestPreviewSecondsRef.current >= GUEST_PREVIEW_MAX_SECONDS;

      if (reachedCap) {
        guestPreviewSecondsRef.current = Math.max(
          guestPreviewSecondsRef.current,
          GUEST_PREVIEW_MAX_SECONDS
        );
        if (contentKey) {
          writeGuestPreviewState(
            todayKey,
            contentKey,
            episodeKey,
            guestPreviewSecondsRef.current,
            hasValidTime ? currentTime : 0
          );
          lastSavedPreviewSecRef.current = Math.floor(guestPreviewSecondsRef.current);
        }
        if (pendingWatchSecondsRef.current >= 5) {
          const toSend = pendingWatchSecondsRef.current;
          pendingWatchSecondsRef.current = 0;
          sendAnalyticsPing({ isNewView: false, watchSeconds: toSend });
        }
        setGuestLimitReason('preview');
        return;
      }

      const currentFloorSec = Math.floor(guestPreviewSecondsRef.current);
      if (contentKey && currentFloorSec > lastSavedPreviewSecRef.current) {
        writeGuestPreviewState(
          todayKey,
          contentKey,
          episodeKey,
          guestPreviewSecondsRef.current,
          hasValidTime ? currentTime : 0
        );
        lastSavedPreviewSecRef.current = currentFloorSec;
      }
    }

    if (!user?.uid || !currentVideo?.id || !duration || !hasValidTime) return;
    const now = Date.now();
    const progressRatio = Math.min(currentTime / duration, 1);
    if (progressRatio < 0.05 && lastUpdateRef.current !== 0) return;
    if (now - lastUpdateRef.current < 15000 && progressRatio < 0.95) return;
    lastUpdateRef.current = now;
    saveHistoryProgress(user.uid, currentVideo, {
      progress: progressRatio,
      position: currentTime,
      duration,
    }).catch(() => undefined);
  }, [authLoading, user, contentId, contentKey, episodeKey, sendAnalyticsPing]);

  const handleEnded = useCallback(() => {
    if (!user || !video?.id) return;
    saveHistoryProgress(user.uid, video, { progress: 1, position: 0, duration: video.duration || 0 }).catch(() => undefined);
  }, [user, video]);

  const nextEpisode = useMemo(() => {
    if (!episodes?.length || !currentEpisode?.id) return null;
    const currentIndex = episodes.findIndex((episode) => episode.id === currentEpisode.id);
    if (currentIndex === -1) return null;
    return episodes[currentIndex + 1] || null;
  }, [episodes, currentEpisode]);

  const defaultSubtitleLang = useMemo(() => {
    const preferred = video?.preferredLanguage || video?.preferences?.preferredLanguage;
    if (typeof preferred === 'string' && preferred.trim()) {
      return preferred.trim();
    }
    if (Array.isArray(subtitles) && subtitles.length) {
      const defaultTrack = subtitles.find((track) => track?.default);
      const candidate = defaultTrack || subtitles[0];
      return candidate?.lang || candidate?.label || 'en';
    }
    return 'en';
  }, [video?.preferredLanguage, video?.preferences?.preferredLanguage, subtitles]);

  const navigateToEpisode = useCallback(
    (episode, { autoPlay = true } = {}) => {
      if (!episode || !series) return;
      if (autoAdvanceRef.current) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
      const slug = encodeURIComponent(series.slug || series.id);
      const href = `/player?id=${slug}&type=series&ep=${encodeURIComponent(episode.id)}${autoPlay ? '&autoplay=1' : ''}`;
      router.replace(href);
    },
    [router, series]
  );

  const handleEpisodeSelect = useCallback(
    (episode) => {
      if (!episode) return;
      navigateToEpisode(episode, { autoPlay: true });
    },
    [navigateToEpisode]
  );

  const handleAutoAdvance = useCallback(() => {
    if (!nextEpisode) return;
    navigateToEpisode(nextEpisode, { autoPlay: true });
  }, [navigateToEpisode, nextEpisode]);

  const handleComplete = useCallback(() => {
    handleEnded();
    if (nextEpisode && autoplay) {
      autoAdvanceRef.current = window.setTimeout(handleAutoAdvance, 2500);
    }
  }, [handleEnded, handleAutoAdvance, nextEpisode, autoplay]);

  if (!authLoading && !user && guestLimitReason) {
    return (
      <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-black px-4 text-white">
        {poster && (
          <img
            src={poster}
            alt={title || 'Preview'}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 blur-xl scale-105"
          />
        )}
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/15 bg-black/75 p-7 text-center shadow-2xl backdrop-blur-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E50914]">
            Akses Tamu Terbatas
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {guestLimitReason === 'preview'
              ? 'Preview Tamu (3 Menit) Selesai'
              : 'Batas Tontonan Tamu Tercapai'}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-white/70">
            Pengguna tanpa login dibatasi 1 tontonan per hari (maks. 3 menit preview) untuk menghemat server &amp; database. Masuk atau daftar akun gratis untuk lanjut menonton penuh tanpa batas.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="rounded-xl bg-[#E50914] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#f40612]"
            >
              Masuk Sekarang
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Daftar Gratis
            </Link>
          </div>
          <Link
            href={backHref || video?.href || '/'}
            className="mt-4 inline-block text-xs text-white/55 hover:text-white"
          >
            ← Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <VideoPlayer
      playbackId={playbackId}
      src={src}
      poster={poster}
      title={title}
      subtitles={subtitles}
      episodes={episodes}
      currentEpisode={currentEpisode}
      autoplay={autoplay}
      initialTime={user ? resumePosition : guestResumePosition}
      backHref={backHref || video?.href || '/'}
      defaultSubtitleLang={defaultSubtitleLang}
      onSelectEpisode={handleEpisodeSelect}
      onAutoAdvance={nextEpisode ? handleAutoAdvance : undefined}
      onProgress={handleProgress}
      onEnded={handleComplete}
    />
  );
}


