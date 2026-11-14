"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { getUserHistory, saveHistoryProgress } from '../lib/firestore';
import VideoPlayer from './VideoPlayer';

const GUEST_DAILY_LIMIT = 1;
const GUEST_PREVIEW_SECONDS = 180; // 3 menit preview untuk tamu tanpa login

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
  const [guestLimitReason, setGuestLimitReason] = useState('');
  const [resumePosition, setResumePosition] = useState(0);

  const contentId = series?.id || video?.id || '';
  const contentSlug = series?.slug || video?.slug || contentId;
  const contentType = series ? 'series' : (video?.type === 'series' ? 'series' : 'movie');

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
    lastUpdateRef.current = 0;
    lastTrackedTimeRef.current = 0;
    pendingWatchSecondsRef.current = 0;
  }, [video?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setGuestLimitReason('');
      return;
    }
    if (typeof window === 'undefined' || !contentId) return;
    try {
      const todayKey = `kstream_guest_watches_${new Date().toISOString().slice(0, 10)}`;
      const sessionKey = `${contentType}:${contentId}:${currentEpisode?.id || 'main'}`;
      const raw = window.localStorage.getItem(todayKey);
      const list = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      if (arr.includes(sessionKey)) {
        setGuestLimitReason('');
        return;
      }
      if (arr.length >= GUEST_DAILY_LIMIT) {
        setGuestLimitReason('daily');
        return;
      }
      arr.push(sessionKey);
      window.localStorage.setItem(todayKey, JSON.stringify(arr));
      setGuestLimitReason('');
    } catch {
      setGuestLimitReason('');
    }
  }, [authLoading, user, contentType, contentId, currentEpisode?.id]);

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
    if (!user || !video?.id) return;
    saveHistoryProgress(
      user.uid,
      video,
      { progress: 0, position: 0, duration: video.duration || 0 },
      { preserveExisting: true }
    ).catch(() => undefined);
  }, [user, video]);

  const handleProgress = useCallback(({ currentTime, duration }) => {
    if (!authLoading && !user && currentTime >= GUEST_PREVIEW_SECONDS) {
      setGuestLimitReason('preview');
      return;
    }
    if (!user || !video?.id || !duration) return;
    if (typeof currentTime === 'number' && currentTime >= 0) {
      const delta = currentTime - lastTrackedTimeRef.current;
      if (delta > 0 && delta < 30) {
        pendingWatchSecondsRef.current += delta;
      }
      lastTrackedTimeRef.current = currentTime;
      if (pendingWatchSecondsRef.current >= 30) {
        const toSend = pendingWatchSecondsRef.current;
        pendingWatchSecondsRef.current = 0;
        sendAnalyticsPing({ isNewView: false, watchSeconds: toSend });
      }
    }
    const now = Date.now();
    const progressRatio = Math.min(currentTime / duration, 1);
    if (progressRatio < 0.05 && lastUpdateRef.current !== 0) return;
    if (now - lastUpdateRef.current < 15000 && progressRatio < 0.95) return;
    lastUpdateRef.current = now;
    saveHistoryProgress(user.uid, video, {
      progress: progressRatio,
      position: currentTime,
      duration,
    }).catch(() => undefined);
  }, [authLoading, user, video, sendAnalyticsPing]);

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
      initialTime={resumePosition}
      backHref={backHref || video?.href || '/'}
      defaultSubtitleLang={defaultSubtitleLang}
      onSelectEpisode={handleEpisodeSelect}
      onAutoAdvance={nextEpisode ? handleAutoAdvance : undefined}
      onProgress={handleProgress}
      onEnded={handleComplete}
    />
  );
}


