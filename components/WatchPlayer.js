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

  useEffect(() => {
    if (!user || !video?.id) return;
    saveHistoryProgress(user.uid, video, { progress: 0, position: 0, duration: video.duration || 0 }).catch(() => undefined);
    return () => {
      if (autoAdvanceRef.current) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, [user, video]);

  const handleProgress = useCallback(({ currentTime, duration }) => {
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
  }, [user, video]);

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


