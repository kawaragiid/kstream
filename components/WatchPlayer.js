"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { saveHistoryProgress } from '../lib/firestore';
import VideoPlayer from './VideoPlayer';

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
  const { user } = useAuth();
  const router = useRouter();
  const lastUpdateRef = useRef(0);
  const autoAdvanceRef = useRef(null);
  const viewTrackedKeyRef = useRef('');
  const lastTrackedTimeRef = useRef(0);
  const pendingWatchSecondsRef = useRef(0);

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
    const sessionKey = `${contentType}:${contentId}:${currentEpisode?.id || 'main'}`;
    if (!contentId || viewTrackedKeyRef.current === sessionKey) return;
    viewTrackedKeyRef.current = sessionKey;
    sendAnalyticsPing({ isNewView: true, watchSeconds: 0 });
  }, [contentId, contentType, currentEpisode?.id, sendAnalyticsPing]);

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
    if (!user || !video?.id) return;
    saveHistoryProgress(
      user.uid,
      video,
      { progress: 0, position: 0, duration: video.duration || 0 },
      { preserveExisting: true }
    ).catch(() => undefined);
  }, [user, video]);

  const handleProgress = useCallback(({ currentTime, duration }) => {
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
    if (!user || !video?.id || !duration) return;
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
  }, [user, video, sendAnalyticsPing]);

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
      backHref={backHref || video?.href || '/'}
      defaultSubtitleLang={defaultSubtitleLang}
      onSelectEpisode={handleEpisodeSelect}
      onAutoAdvance={nextEpisode ? handleAutoAdvance : undefined}
      onProgress={handleProgress}
      onEnded={handleComplete}
    />
  );
}


