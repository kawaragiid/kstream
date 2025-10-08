"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSignedPlaybackUrl } from "../lib/mux";

const formatTime = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

const attributeRegex = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi;

const parseAttributeList = (line) => {
  attributeRegex.lastIndex = 0;
  const attributes = {};
  let match = attributeRegex.exec(line);
  while (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    attributes[key] = value;
    match = attributeRegex.exec(line);
  }
  return attributes;
};

const parseMuxSubtitleTracks = (manifestText = "", manifestUrl = "") => {
  if (!manifestText) return [];
  const lines = manifestText.split(/\r?\n/);
  const tracks = [];
  const seen = new Set();

  lines.forEach((line) => {
    if (!line.startsWith("#EXT-X-MEDIA") || !line.includes("TYPE=SUBTITLES")) return;
    const attrs = parseAttributeList(line);
    if (!attrs.URI) return;

    const absoluteUri = (() => {
      try {
        return new URL(attrs.URI, manifestUrl).toString();
      } catch (error) {
        return attrs.URI;
      }
    })();

    const vttUrl = absoluteUri.endsWith(".m3u8") ? `${absoluteUri}?format=webvtt` : absoluteUri;

    const key = `${attrs.LANGUAGE || attrs.NAME || vttUrl}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    tracks.push({
      lang: attrs.LANGUAGE || attrs.NAME || key,
      label: attrs.NAME || attrs.LANGUAGE || key.toUpperCase(),
      url: vttUrl,
      sourceUrl: absoluteUri,
      default: attrs.DEFAULT === "YES",
    });
  });

  return tracks;
};

const PLAY_LABEL = "Play";
const PAUSE_LABEL = "Pause";
const MUTE_LABEL = "Mute";
const UNMUTE_LABEL = "Unmute";
const FULLSCREEN_LABEL = "Fullscreen";
const subtitleSizeOptions = [
  { value: "small", label: "Subtitles: Small" },
  { value: "medium", label: "Subtitles: Medium" },
  { value: "large", label: "Subtitles: Large" },
  { value: "xlarge", label: "Subtitles: Extra Large" },
];

const BackIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const normalizeSubtitleKey = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const sanitizeCueText = (text = "") => {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(c|i|b|u|ruby|rt|v|lang|span|font)[^>]*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "");
};

const SUBTITLE_BASE_OFFSET_PERCENT = 5;
const SUBTITLE_CONTROL_GAP_PX = 16;
const MOBILE_SCREEN_WIDTH = 768; // Breakpoint untuk layar mobile

export default function VideoPlayer({
  playbackId = "",
  src = "",
  poster = "",
  title = "Video",
  subtitles = [],
  episodes = [],
  currentEpisode = null,
  autoplay = false,
  defaultSubtitleLang = "en",
  backHref = "/",
  onSelectEpisode,
  onAutoAdvance,
  onProgress,
  onEnded,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const containerRef = useRef(null);
  const router = useRouter();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [activeSubtitle, setActiveSubtitle] = useState("off");
  const [muxSubtitles, setMuxSubtitles] = useState([]);
  const [isEpisodePanelOpen, setEpisodePanelOpen] = useState(false);
  const [subtitleSize, setSubtitleSize] = useState("medium");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const subtitleStylesRef = useRef(null);
  const [subtitleLines, setSubtitleLines] = useState([]);
  const [subtitleBottom, setSubtitleBottom] = useState(`${SUBTITLE_BASE_OFFSET_PERCENT}%`);
  const controlBarRef = useRef(null);
  const controlsVisible = !isIOS && (showControls || isEpisodePanelOpen);

  // Deteksi Safari iOS
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isWebkit = /WebKit/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIOS(isIOSDevice && isWebkit);
  }, []);

  // Handle iOS auto fullscreen
  useEffect(() => {
    if (!isIOS || !videoRef.current) return;

    const handlePlay = () => {
      const video = videoRef.current;
      if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    };

    const video = videoRef.current;
    video.addEventListener("play", handlePlay);
    return () => video.removeEventListener("play", handlePlay);
  }, [isIOS]);

  // Update container height real-time pada mobile
  useEffect(() => {
    if (typeof window === "undefined" || isIOS) return;

    const container = containerRef.current;
    const updateSize = () => {
      if (window.innerWidth <= MOBILE_SCREEN_WIDTH) {
        container.style.height = `${window.innerHeight}px`;
        container.style.width = "100vw";
      } else {
        container.style.height = "";
        container.style.width = "";
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isIOS]);

  // Deteksi orientasi & auto fullscreen di landscape
  useEffect(() => {
    if (isIOS) return;
    const handleOrientation = () => {
      const video = videoRef.current;
      if (!video) return;
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape && window.innerWidth <= MOBILE_SCREEN_WIDTH) {
        video.requestFullscreen?.().catch(() => {});
      } else if (!isLandscape && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener("orientationchange", handleOrientation);
    return () => window.removeEventListener("orientationchange", handleOrientation);
  }, [isIOS]);

  // Handler untuk masuk ke mode landscape fullscreen di mobile
  const enterMobileFullscreen = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (window.innerWidth <= MOBILE_SCREEN_WIDTH) {
        // iOS Safari specific method
        if (video.webkitEnterFullscreen) {
          await video.webkitEnterFullscreen();
        }
        // Standard methods
        else if (video.requestFullscreen) {
          await video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          await video.webkitRequestFullscreen();
        }
        // Request landscape orientation
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape");
        }
      }
    } catch (err) {
      console.warn("Failed to enter mobile fullscreen:", err);
    }
  }, []);

  // Auto fullscreen & landscape ketika video dimulai di mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePlay = () => {
      enterMobileFullscreen();
    };
    const video = videoRef.current;
    if (video) {
      video.addEventListener("play", handlePlay);
      return () => video.removeEventListener("play", handlePlay);
    }
  }, [enterMobileFullscreen]);

  // Reset orientation ketika keluar dari fullscreen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleBack = useCallback(
    (event) => {
      event?.preventDefault();
      if (typeof window !== "undefined" && window.history && window.history.length > 1) {
        router.back();
        return;
      }
      if (backHref) {
        router.push(backHref);
      }
    },
    [router, backHref]
  );

  const videoSrc = useMemo(() => {
    if (src) return src;
    if (playbackId) {
      try {
        return getSignedPlaybackUrl(playbackId, defaultSubtitleLang) || "";
      } catch (error) {
        console.error("Failed to generate playback URL", error);
      }
    }
    return "";
  }, [playbackId, src, defaultSubtitleLang]);

  const subtitleTracks = useMemo(() => {
    const unique = new Map();
    [...(subtitles || []), ...(muxSubtitles || [])].forEach((track) => {
      if (!track) return;
      const key = `${track.lang || track.label || track.url}`.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, {
          ...track,
          lang: track.lang || track.label || key,
          label: track.label || track.lang || key.toUpperCase(),
        });
      }
    });
    return Array.from(unique.values());
  }, [subtitles, muxSubtitles]);

  const activeSubtitleMeta = useMemo(() => {
    if (!subtitleTracks.length || !activeSubtitle || activeSubtitle === "off") return null;
    const target = normalizeSubtitleKey(activeSubtitle);
    if (!target) return null;
    return (
      subtitleTracks.find((track) => {
        const candidates = [track.lang, track.label].map(normalizeSubtitleKey);
        return candidates.some((value) => value === target);
      }) || null
    );
  }, [activeSubtitle, subtitleTracks]);

  const resolveActiveTextTrack = useCallback(() => {
    const media = videoRef.current;
    if (!media || !activeSubtitle || activeSubtitle === "off") return null;
    const textTracks = Array.from(media.textTracks || []);
    if (!textTracks.length) return null;
    // 1) Try direct match by language/label/id/kind
    const targetKeys = new Set([activeSubtitle, activeSubtitleMeta?.lang, activeSubtitleMeta?.label].map(normalizeSubtitleKey).filter(Boolean));
    if (targetKeys.size) {
      for (const track of textTracks) {
        const keys = [track.language, track.label, track.id, track.kind].map(normalizeSubtitleKey).filter(Boolean);
        if (keys.some((k) => targetKeys.has(k))) {
          return track;
        }
        const lang = normalizeSubtitleKey(track.language || "");
        for (const tk of targetKeys) {
          if (!tk) continue;
          if (lang.startsWith(tk) || tk.startsWith(lang)) {
            return track;
          }
        }
      }
    }
    // 2) Fallback by index based on our subtitleTracks order
    const idx = (subtitleTracks || []).findIndex((t) => {
      const a = normalizeSubtitleKey(activeSubtitle);
      return [t.lang, t.label]
        .map(normalizeSubtitleKey)
        .filter(Boolean)
        .some((v) => v === a || a.startsWith(v) || v.startsWith(a));
    });
    if (idx >= 0 && idx < textTracks.length) {
      return textTracks[idx];
    }
    // 3) Last resort: first available
    return textTracks[0] || null;
  }, [activeSubtitle, activeSubtitleMeta, subtitleTracks]);

  // subtitleSizeClass sudah digantikan dengan versi responsif di bawah

  const subtitleTextShadow = "0 3px 12px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.9)";

  const episodeList = useMemo(() => (Array.isArray(episodes) ? episodes : []), [episodes]);
  const hasEpisodes = episodeList.length > 0;
  const nextEpisode = useMemo(() => {
    if (!hasEpisodes || !currentEpisode?.id) return null;
    const index = episodeList.findIndex((episode) => episode.id === currentEpisode.id);
    if (index === -1) return null;
    return episodeList[index + 1] || null;
  }, [episodeList, hasEpisodes, currentEpisode]);

  const detachHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const attachSource = useCallback(async () => {
    const media = videoRef.current;
    if (!media || !videoSrc) return;

    if (videoSrc.includes(".m3u8")) {
      try {
        const { default: Hls } = await import("hls.js");
        if (Hls?.isSupported()) {
          detachHls();
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hls.loadSource(videoSrc);
          hls.attachMedia(media);
          hlsRef.current = hls;
          return;
        }
        if (media.canPlayType("application/vnd.apple.mpegurl")) {
          media.src = videoSrc;
          return;
        }
      } catch (error) {
        console.warn("HLS.js failed to load, falling back to native playback", error);
      }
    }

    media.src = videoSrc;
  }, [detachHls, videoSrc]);

  useEffect(() => {
    attachSource();
    return () => detachHls();
  }, [attachSource, detachHls]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!subtitleStylesRef.current) {
      const style = document.createElement("style");
      style.dataset.kstreamSubtitleStyles = "true";
      style.textContent = `
        video[data-subtitle-size="small"]::cue { font-size: 0.85em; }
        video[data-subtitle-size="medium"]::cue { font-size: 1em; }
        video[data-subtitle-size="large"]::cue { font-size: 1.25em; }
        video[data-subtitle-size="xlarge"]::cue { font-size: 1.5em; }
        video[data-subtitle-size="small"]::-webkit-media-text-track-display { font-size: 0.85em; }
        video[data-subtitle-size="medium"]::-webkit-media-text-track-display { font-size: 1em; }
        video[data-subtitle-size="large"]::-webkit-media-text-track-display { font-size: 1.25em; }
        video[data-subtitle-size="xlarge"]::-webkit-media-text-track-display { font-size: 1.5em; }
      `;
      document.head.appendChild(style);
      subtitleStylesRef.current = style;
    }
  }, []);

  useEffect(() => {
    const looksLikeMux = playbackId || (videoSrc && videoSrc.includes("stream.mux.com"));
    if (!looksLikeMux) {
      setMuxSubtitles([]);
      return;
    }
    const manifestUrl = videoSrc && videoSrc.endsWith(".m3u8") ? videoSrc : playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : "";
    if (!manifestUrl) return;

    let cancelled = false;
    console.info("[VideoPlayer] Fetching Mux manifest", manifestUrl);
    fetch(manifestUrl)
      .then((response) => {
        if (!response.ok) {
          console.warn("[VideoPlayer] Manifest request failed", manifestUrl, response.status, response.statusText);
          return null;
        }
        return response.text();
      })
      .then((text) => {
        if (cancelled || !text) {
          if (!cancelled) {
            console.info("[VideoPlayer] No subtitle manifest returned for", manifestUrl);
            setMuxSubtitles([]);
          }
          return;
        }
        const tracks = parseMuxSubtitleTracks(text, manifestUrl);
        console.info("[VideoPlayer] Discovered subtitle tracks", tracks);
        setMuxSubtitles(tracks);
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("[VideoPlayer] Subtitle manifest fetch error", error);
          setMuxSubtitles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [playbackId, videoSrc]);

  // Auto fullscreen when playing on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePlay = () => {
      if (window.innerWidth <= MOBILE_SCREEN_WIDTH) {
        requestFullscreen();
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener("play", handlePlay);
      return () => video.removeEventListener("play", handlePlay);
    }
  }, []);

  useEffect(() => {
    if (!subtitleTracks.length) {
      setActiveSubtitle("off");
      return;
    }
    setActiveSubtitle((prev) => {
      if (prev && prev !== "off") {
        const stillExists = subtitleTracks.some((track) => track.lang === prev || track.label === prev);
        if (stillExists) return prev;
      }
      const defaultSubtitle = subtitleTracks.find((track) => track.default) || subtitleTracks[0];
      return defaultSubtitle?.lang || defaultSubtitle?.label || "off";
    });
  }, [subtitleTracks]);

  useEffect(() => {
    if (!subtitleTracks.length) return;
    const tracksNeedingValidation = subtitleTracks.filter((track) => track.sourceUrl && track.url && track.url !== track.sourceUrl);
    if (!tracksNeedingValidation.length) return;

    let cancelled = false;
    Promise.all(
      tracksNeedingValidation.map(async (track) => {
        try {
          const response = await fetch(track.url, { method: "HEAD" });
          if (!response.ok) {
            throw new Error(`status ${response.status}`);
          }
          return null;
        } catch (error) {
          console.warn("[VideoPlayer] Subtitle URL failed, falling back to original manifest URI", { attempted: track.url, fallback: track.sourceUrl, reason: error?.message });
          return track.sourceUrl;
        }
      })
    ).then((fallbackUrls) => {
      if (cancelled) return;
      const fallbackMap = new Map();
      fallbackUrls.forEach((url, index) => {
        if (url) {
          fallbackMap.set(tracksNeedingValidation[index].sourceUrl, url);
        }
      });
      if (!fallbackMap.size) return;
      setMuxSubtitles((prev) =>
        prev.map((track) => {
          if (track.sourceUrl && fallbackMap.has(track.sourceUrl)) {
            return { ...track, url: fallbackMap.get(track.sourceUrl) };
          }
          return track;
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, [subtitleTracks]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return undefined;
    media.setAttribute("data-subtitle-size", subtitleSize);
    return () => {
      media.removeAttribute("data-subtitle-size");
    };
  }, [subtitleSize]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => setShowControls(false), 2500);
  }, []);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [videoSrc, showControlsTemporarily]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const full = Boolean(document.fullscreenElement);
      setIsFullscreen(full);
      if (!full) {
        showControlsTemporarily();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [showControlsTemporarily]);

  const togglePlay = () => {
    const media = videoRef.current;
    if (!media) return;
    showControlsTemporarily();
    if (media.paused) {
      media.play().catch(() => undefined);
    } else {
      media.pause();
    }
  };

  const toggleMute = () => {
    const media = videoRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  };

  const seekBy = useCallback(
    (offset) => {
      const media = videoRef.current;
      if (!media || Number.isNaN(offset)) return;
      const targetTime = Math.min(Math.max(0, media.currentTime + offset), media.duration || Infinity);
      media.currentTime = targetTime;
      if (media.duration) {
        setProgress((targetTime / media.duration) * 100);
      }
      setCurrentTime(targetTime);
      showControlsTemporarily();
    },
    [showControlsTemporarily]
  );

  const handleEpisodePanelToggle = useCallback(() => {
    if (!hasEpisodes) return;
    setEpisodePanelOpen((prev) => !prev);
    showControlsTemporarily();
  }, [hasEpisodes, showControlsTemporarily]);

  const handleEpisodeSelection = useCallback(
    (episode) => {
      if (!episode) return;
      onSelectEpisode?.(episode);
      setEpisodePanelOpen(false);
      showControlsTemporarily();
    },
    [onSelectEpisode, showControlsTemporarily]
  );

  const handleNextEpisode = useCallback(() => {
    if (onAutoAdvance) {
      onAutoAdvance();
      return;
    }
    if (nextEpisode) {
      onSelectEpisode?.(nextEpisode);
    }
  }, [nextEpisode, onAutoAdvance, onSelectEpisode]);

  const handleProgressChange = (event) => {
    const value = Number(event.target.value);
    const media = videoRef.current;
    if (!media || Number.isNaN(value)) return;
    media.currentTime = (value / 100) * (media.duration || 0);
    setProgress(value);
    setCurrentTime(media.currentTime);
    showControlsTemporarily();
  };

  const handleVolumeChange = (event) => {
    const value = Number(event.target.value);
    const media = videoRef.current;
    if (!media || Number.isNaN(value)) return;
    media.volume = value;
    media.muted = value === 0;
    setVolume(value);
    setIsMuted(media.muted);
    showControlsTemporarily();
  };

  const requestFullscreen = async () => {
    const video = videoRef.current;
    const container = video?.parentElement;
    if (!video || !container) return;

    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      } else {
        // iOS Safari specific method
        if (video.webkitEnterFullscreen) {
          await video.webkitEnterFullscreen();
        }
        // Standard Fullscreen API
        else if (video.requestFullscreen) {
          await video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          await video.webkitRequestFullscreen();
        }
        // Fallback to container
        else if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }

        // Try to force landscape on supported devices
        if (window.innerWidth <= MOBILE_SCREEN_WIDTH) {
          if (screen.orientation?.lock) {
            try {
              await screen.orientation.lock("landscape");
            } catch (err) {
              console.warn("Failed to lock orientation:", err);
            }
          } else if (window.orientation !== undefined) {
            try {
              await window.screen.orientation?.lock("landscape");
            } catch (err) {
              console.warn("Failed to lock legacy orientation:", err);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Fullscreen request failed:", err);
    }
    showControlsTemporarily();
  };

  const updateSubtitlePosition = useCallback(() => {
    const base = `${SUBTITLE_BASE_OFFSET_PERCENT}%`;
    if (!controlsVisible) {
      setSubtitleBottom(base);
      return;
    }
    const rect = controlBarRef.current?.getBoundingClientRect();
    const offset = rect && rect.height ? Math.round(rect.height + SUBTITLE_CONTROL_GAP_PX) : 0;
    if (!offset) {
      setSubtitleBottom(base);
      return;
    }
    setSubtitleBottom(`calc(${base} + ${offset}px)`);
  }, [controlsVisible]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    const tracks = Array.from(media.textTracks || []);
    if (!tracks.length) {
      setSubtitleLines([]);
      return;
    }
    const activeTrack = resolveActiveTextTrack();
    tracks.forEach((track) => {
      track.mode = track === activeTrack ? "hidden" : "disabled";
    });
    if (!activeTrack) {
      setSubtitleLines([]);
    }
  }, [resolveActiveTextTrack]);

  useEffect(() => {
    if (!autoplay) return;
    const media = videoRef.current;
    if (!media) return;

    const attemptPlay = () => {
      media.play().catch((error) => {
        if (error?.name === "NotAllowedError" && !media.muted) {
          media.muted = true;
          setIsMuted(true);
          media.play().catch(() => undefined);
        }
      });
    };

    if (media.readyState >= 2) {
      attemptPlay();
      return undefined;
    }

    const handleLoaded = () => {
      attemptPlay();
    };

    media.addEventListener("loadeddata", handleLoaded, { once: true });
    return () => media.removeEventListener("loadeddata", handleLoaded);
  }, [autoplay, videoSrc]);

  useEffect(() => {
    if (!hasEpisodes) {
      setEpisodePanelOpen(false);
    }
  }, [hasEpisodes]);

  useEffect(() => {
    if (currentEpisode?.id) {
      setEpisodePanelOpen(false);
    }
  }, [currentEpisode?.id]);

  useEffect(() => {
    if (isEpisodePanelOpen) {
      setShowControls(true);
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    }
  }, [isEpisodePanelOpen]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!media.duration) return;
      const ratio = (media.currentTime / media.duration) * 100;
      setProgress(ratio);
      setCurrentTime(media.currentTime);
      onProgress?.({
        progress: media.currentTime / media.duration,
        currentTime: media.currentTime,
        duration: media.duration,
      });
    };
    const handleLoadedMetadata = () => {
      setDuration(media.duration || 0);
      setCurrentTime(media.currentTime || 0);
    };
    const handleVolumeUpdate = () => {
      setVolume(media.volume);
      setIsMuted(media.muted);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    media.addEventListener("play", handlePlay);
    media.addEventListener("pause", handlePause);
    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("loadedmetadata", handleLoadedMetadata);
    media.addEventListener("volumechange", handleVolumeUpdate);
    media.addEventListener("ended", handleEnded);

    return () => {
      media.removeEventListener("play", handlePlay);
      media.removeEventListener("pause", handlePause);
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeEventListener("volumechange", handleVolumeUpdate);
      media.removeEventListener("ended", handleEnded);
    };
  }, [onEnded, onProgress, videoSrc]);

  useEffect(() => {
    const handler = (event) => {
      const tagName = event.target?.tagName?.toLowerCase?.();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || event.target?.isContentEditable) return;
      const media = videoRef.current;
      if (!media) return;
      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlay();
          break;
        case "arrowright":
          media.currentTime = Math.min(media.duration || Infinity, media.currentTime + (event.shiftKey ? 30 : 10));
          showControlsTemporarily();
          break;
        case "arrowleft":
          media.currentTime = Math.max(0, media.currentTime - (event.shiftKey ? 30 : 10));
          showControlsTemporarily();
          break;
        case "arrowup":
          event.preventDefault();
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1) } });
          break;
        case "arrowdown":
          event.preventDefault();
          handleVolumeChange({ target: { value: Math.max(0, volume - 0.1) } });
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          requestFullscreen();
          break;
        case "c":
          if (subtitleTracks.length) {
            const currentIndex = subtitleTracks.findIndex((sub) => sub.lang === activeSubtitle || sub.label === activeSubtitle);
            const nextIndex = (currentIndex + 1) % (subtitleTracks.length + 1);
            if (nextIndex === subtitleTracks.length) {
              setActiveSubtitle("off");
            } else {
              const next = subtitleTracks[nextIndex];
              setActiveSubtitle(next.lang || next.label);
            }
            showControlsTemporarily();
          }
          break;
        case "n":
          if (nextEpisode) {
            event.preventDefault();
            handleNextEpisode();
          }
          break;
        case "e":
          if (hasEpisodes) {
            event.preventDefault();
            handleEpisodePanelToggle();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSubtitle, subtitleTracks, togglePlay, requestFullscreen, toggleMute, handleVolumeChange, volume, showControlsTemporarily, nextEpisode, handleNextEpisode, hasEpisodes, handleEpisodePanelToggle]);

  useEffect(() => {
    if (!activeSubtitle || activeSubtitle === "off") {
      setSubtitleLines([]);
      return undefined;
    }
    const track = resolveActiveTextTrack();
    if (!track) {
      setSubtitleLines([]);
      return undefined;
    }
    const handleCueChange = () => {
      const cues = track.activeCues ? Array.from(track.activeCues) : [];
      if (!cues.length) {
        setSubtitleLines((prev) => (prev.length ? [] : prev));
        return;
      }
      const lines = [];
      cues.forEach((cue) => {
        const sanitized = sanitizeCueText(cue?.text || "");
        sanitized
          .split("\n")
          .map((line) => line.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .forEach((line) => {
            lines.push(line);
          });
      });
      setSubtitleLines((prev) => {
        if (prev.length === lines.length && prev.every((value, index) => value === lines[index])) {
          return prev;
        }
        return lines;
      });
    };
    track.addEventListener("cuechange", handleCueChange);
    const rafId = window.requestAnimationFrame(() => handleCueChange());
    handleCueChange();
    return () => {
      window.cancelAnimationFrame(rafId);
      track.removeEventListener("cuechange", handleCueChange);
    };
  }, [resolveActiveTextTrack, activeSubtitle]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const raf = window.requestAnimationFrame(() => updateSubtitlePosition());
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [updateSubtitlePosition, subtitleSize, isFullscreen]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => updateSubtitlePosition();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateSubtitlePosition]);
  // Responsive subtitle size
  const [autoSubtitleSize, setAutoSubtitleSize] = useState("medium");
  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width < 500) setAutoSubtitleSize("large"); // mobile
      else if (width < 900) setAutoSubtitleSize("medium"); // tablet
      else if (width < 1600) setAutoSubtitleSize("large"); // desktop
      else setAutoSubtitleSize("xlarge"); // monitor besar
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const subtitleSizeClass = {
    small: "text-xs md:text-sm",
    medium: "text-base md:text-lg",
    large: "text-lg md:text-xl",
    xlarge: "text-2xl md:text-3xl",
  }[subtitleSize || autoSubtitleSize];
  const overlayBackgroundClass = isFullscreen ? "bg-transparent" : "bg-gradient-to-b from-black/80 via-black/10 to-black/90";
  const showOverlay = controlsVisible;
  const controlButtonClass = "inline-flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-white/10 text-white text-[10px] md:text-sm transition hover:bg-white/20";
  const shouldShowBackdropGradient = !isFullscreen;
  const shouldRenderSubtitles = !isIOS && activeSubtitle !== "off" && subtitleLines.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-black w-full aspect-video md:rounded-3xl md:min-h-[60vh]"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => {
        if (!isEpisodePanelOpen) {
          setShowControls(false);
        }
      }}
      style={{
        // Mobile fullscreen styling
        position: typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? "fixed" : "relative",
        height: typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? "100vh" : undefined,
        width: typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? "100vw" : undefined,
        top: typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? 0 : undefined,
        left: typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? 0 : undefined,
        zIndex: typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? 50 : undefined,
      }}
    >
      {isIOS ? (
        // Native Safari iOS player
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          src={src}
          poster={poster || undefined}
          title={title}
          controls
          autoPlay={autoplay}
          playsInline
          webkit-playsinline="true"
          x-webkit-playsinline="true"
          x-webkit-airplay="allow"
          style={{
            width: "100%",
            height: "100%",
            maxHeight: typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? "100dvh" : undefined,
          }}
        >
          {subtitleTracks.map((track) => (
            <track
              key={`${track.lang}-${track.url}`}
              kind="subtitles"
              src={track.url}
              srcLang={track.lang || undefined}
              label={track.label || track.lang}
              default={activeSubtitle !== "off" && (track.lang === activeSubtitle || track.label === activeSubtitle)}
            />
          ))}
        </video>
      ) : (
        // Custom player untuk browser lain
        <video ref={videoRef} className="w-full h-full object-contain bg-black" poster={poster || undefined} title={title} muted={isMuted} playsInline x-webkit-airplay="allow" webkit-playsinline="true" x-webkit-playsinline="true">
          {subtitleTracks.map((track) => (
            <track
              key={`${track.lang}-${track.url}`}
              kind="subtitles"
              src={track.url}
              srcLang={track.lang || undefined}
              label={track.label || track.lang}
              default={activeSubtitle !== "off" && (track.lang === activeSubtitle || track.label === activeSubtitle)}
            />
          ))}
        </video>
      )}

      {shouldShowBackdropGradient && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" aria-hidden="true" />}

      {shouldRenderSubtitles && (
        <div
          className="pointer-events-none absolute inset-x-0 flex w-full justify-center px-2 md:px-4 transition-all duration-200 ease-out"
          style={{
            bottom: subtitleBottom,
            zIndex: 30,
            fontSize: typeof window !== "undefined" ? (window.innerWidth < 500 ? "4vw" : window.innerWidth < 900 ? "2.5vw" : window.innerWidth < 1600 ? "1.5vw" : "1vw") : "2.5vw",
          }}
        >
          <div className="flex w-full max-w-4xl flex-col items-center gap-1.5 text-center leading-tight">
            {subtitleLines.map((line, index) => (
              <span key={`${index}-${line}`} className="text-white font-bold" style={{ textShadow: subtitleTextShadow }}>
                {line}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button type="button" onClick={togglePlay} className="pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition hover:bg-white">
            {PLAY_LABEL}
          </button>
        </div>
      )}

      {hasEpisodes && (
        <div
          className={`pointer-events-auto absolute inset-y-0 right-0 w-full max-w-xs transform-gpu bg-black/85 backdrop-blur-md transition duration-300 ${
            isEpisodePanelOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Episode</span>
            <button type="button" onClick={() => setEpisodePanelOpen(false)} className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/10">
              Close
            </button>
          </div>
          <div className="max-h-full overflow-y-auto p-4">
            <div className="space-y-3">
              {episodeList.map((episode) => {
                const isActive = episode.id === currentEpisode?.id;
                return (
                  <button
                    key={episode.id}
                    type="button"
                    onClick={() => handleEpisodeSelection(episode)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isActive ? "border-brand bg-brand/20 text-white" : "border-white/10 bg-white/[0.08] text-white hover:border-white/30 hover:bg-white/[0.15]"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Episode {episode.number ?? ""}</span>
                      {episode.duration ? <span className="text-[11px] font-medium text-white/50">{formatTime(episode.duration)}</span> : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">{episode.title}</p>
                    {episode.overview && <p className="mt-1 text-xs text-white/70 line-clamp-2">{episode.overview}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className={`pointer-events-none absolute inset-0 flex flex-col justify-between ${overlayBackgroundClass} transition-opacity duration-300 ${showOverlay ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-start justify-between px-6 pt-6 text-white drop-shadow">
          <div className="flex items-center gap-3">
            {backHref ? (
              <button
                type="button"
                onClick={handleBack}
                className={`pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition duration-200 hover:border-white/40 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-0 ${
                  showOverlay ? "opacity-100" : "opacity-0"
                }`}
                aria-label="Kembali"
              >
                <BackIcon className="h-4 w-4" />
              </button>
            ) : null}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.45em] text-white/60">Now Playing</p>
              <h3 className="text-lg font-semibold md:text-2xl">{title}</h3>
              {currentEpisode && (
                <p className="text-xs text-white/70 md:text-sm">
                  Episode {currentEpisode.number}: {currentEpisode.title}
                </p>
              )}
            </div>
          </div>
        </div>

        <div ref={controlBarRef} className="pointer-events-auto flex flex-col gap-3 px-4 pb-6">
          <input type="range" min={0} max={100} step={0.1} value={progress} onChange={handleProgressChange} className="w-full accent-brand" />
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-white/80 md:text-sm">
            <div className="flex items-center gap-2 md:gap-3">
              <button type="button" onClick={togglePlay} className={`${controlButtonClass} w-auto px-4 text-sm font-semibold`}>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={() => seekBy(-10)} className={controlButtonClass} aria-label="Mundur 10 detik">
                -10s
              </button>
              <button type="button" onClick={() => seekBy(10)} className={controlButtonClass} aria-label="Maju 10 detik">
                +10s
              </button>
              <button type="button" onClick={toggleMute} className={controlButtonClass} aria-label="Senyap">
                {isMuted || volume === 0 ? "Mute" : "Sound"}
              </button>
              <div className="hidden items-center gap-2 lg:flex">
                <input type="range" min={0} max={1} step={0.05} value={volume} onChange={handleVolumeChange} className="w-24 accent-brand" />
                <span className="tabular-nums text-xs text-white/70 md:text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="tabular-nums text-xs text-white/70 lg:hidden">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <select
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/20 focus:outline-none"
                value={subtitleSize}
                onChange={(event) => {
                  setSubtitleSize(event.target.value);
                  showControlsTemporarily();
                }}
              >
                {subtitleSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {subtitleTracks.length > 0 && (
                <select
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/20 focus:outline-none"
                  value={activeSubtitle}
                  onChange={(event) => {
                    setActiveSubtitle(event.target.value);
                    showControlsTemporarily();
                  }}
                >
                  <option value="off">Subtitles: Off</option>
                  {subtitleTracks.map((track) => (
                    <option key={`${track.lang}-${track.url}`} value={track.lang || track.label}>
                      Subtitles: {track.label || track.lang}
                    </option>
                  ))}
                </select>
              )}
              {hasEpisodes && (
                <button
                  type="button"
                  onClick={handleEpisodePanelToggle}
                  className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white transition hover:border-white/40 hover:bg-white/10"
                >
                  Episode
                </button>
              )}
              {nextEpisode && (
                <button
                  type="button"
                  onClick={handleNextEpisode}
                  className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white transition hover:border-white/40 hover:bg-white/10"
                >
                  Next
                </button>
              )}
              <button
                type="button"
                onClick={requestFullscreen}
                className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Full
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
