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

const icons = {
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  ),
  back10: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <text x="12" y="15.2" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.5" fontWeight="700" fontFamily="sans-serif">
        10
      </text>
    </svg>
  ),
  forward10: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <text x="12" y="15.2" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.5" fontWeight="700" fontFamily="sans-serif">
        10
      </text>
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M22 9l-6 6M16 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  sound: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  full: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  exitFull: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  ),
  subsOn: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 8H5v-2h6v2zm8 0h-6v-2h6v2zm-8 4H5v-2h6v2zm8 0h-6v-2h6v2z" />
    </svg>
  ),
  subsOff: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 8H5v-2h6v2zm8 0h-6v-2h6v2zm-8 4H5v-2h6v2zm8 0h-6v-2h6v2z" opacity="0.55" />
      <path d="M3 20L21 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  episodes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7">
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M7 2h10" />
      <path d="M8 11h8M8 15h5" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
      <path d="M5 5l10 7-10 7V5zM17 5h2.5v14H17V5z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 sm:h-7 sm:w-7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
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

    const vttUrl =
      /\.m3u8(\?|$)/i.test(absoluteUri) && !/[?&]format=webvtt/i.test(absoluteUri)
        ? `${absoluteUri}${absoluteUri.includes("?") ? "&" : "?"}format=webvtt`
        : absoluteUri;

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
  { value: "small", label: "Kecil" },
  { value: "medium", label: "Sedang" },
  { value: "large", label: "Besar" },
  { value: "xlarge", label: "Ekstra Besar" },
];

const subtitleColorOptions = [
  { value: "#FFFFFF", label: "Putih" },
  { value: "#FACC15", label: "Kuning" },
  { value: "#22D3EE", label: "Cyan" },
  { value: "#4ADE80", label: "Hijau" },
];

const subtitleBgOptions = [
  { value: "none", label: "Tanpa" },
  { value: "soft", label: "Tipis" },
  { value: "solid", label: "Gelap" },
];

const subtitleEdgeOptions = [
  { value: "shadow", label: "Bayangan" },
  { value: "outline", label: "Outline" },
  { value: "none", label: "Polos" },
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
  // Remove SSA/ASS tags like {\\pos(400,570)}
  const withoutSSATags = text.replace(/\{[\s\S]*?\}/g, "");
  return withoutSSATags
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

const SUBTITLE_BASE_OFFSET_PERCENT = 8; // Increased base offset
const SUBTITLE_CONTROL_GAP_PX = 24; // Increased gap for better spacing with controls
const SUBTITLE_FULLSCREEN_OFFSET_PERCENT = 10; // Specific offset for fullscreen mode
const MOBILE_SCREEN_WIDTH = 768; // Breakpoint untuk layar mobile
const PAUSE_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh session after 5 minutes paused

export default function VideoPlayer({
  playbackId = "",
  src = "",
  poster = "",
  title = "Video",
  subtitles = [],
  episodes = [],
  currentEpisode = null,
  autoplay = false,
  initialTime = 0,
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
  const [subtitleColor, setSubtitleColor] = useState("#FFFFFF");
  const [subtitleBg, setSubtitleBg] = useState("soft");
  const [subtitleEdge, setSubtitleEdge] = useState("shadow");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1024);
  const isMobileViewport = viewportWidth < 768;
  const subtitleStylesRef = useRef(null);
  const [subtitleLines, setSubtitleLines] = useState([]);
  const [subtitleBottom, setSubtitleBottom] = useState(`${SUBTITLE_BASE_OFFSET_PERCENT}%`);
  const controlBarRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const controlsVisible = !isIOS && (showControls || isEpisodePanelOpen || isSettingsOpen);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(-1);
  const [nextEpisodeDismissed, setNextEpisodeDismissed] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState(null);
  const lastTapRef = useRef({ time: 0, side: null });
  const singleTapTimerRef = useRef(null);
  const seekIndicatorTimerRef = useRef(null);
  const pausedAtRef = useRef(null);
  const pendingResumeRef = useRef(null);
  const validatedSubtitleUrlsRef = useRef(new Set());
  const resumeAppliedRef = useRef("");
  const hasOpenPopoverRef = useRef(false);
  const [sessionNonce, setSessionNonce] = useState(0);
  const activeSubtitleRef = useRef(activeSubtitle);
  useEffect(() => {
    activeSubtitleRef.current = activeSubtitle;
  }, [activeSubtitle]);
  useEffect(() => {
    hasOpenPopoverRef.current = isSettingsOpen || isEpisodePanelOpen;
  }, [isSettingsOpen, isEpisodePanelOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem("kstream_subtitle_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.size) setSubtitleSize(parsed.size);
        if (parsed?.color) setSubtitleColor(parsed.color);
        if (parsed?.bg) setSubtitleBg(parsed.bg);
        if (parsed?.edge) setSubtitleEdge(parsed.edge);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "kstream_subtitle_prefs",
        JSON.stringify({ size: subtitleSize, color: subtitleColor, bg: subtitleBg, edge: subtitleEdge })
      );
    } catch {
      // ignore storage errors
    }
  }, [subtitleSize, subtitleColor, subtitleBg, subtitleEdge]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncWidth = () => setViewportWidth(window.innerWidth);
    syncWidth();
    window.addEventListener("resize", syncWidth);
    return () => window.removeEventListener("resize", syncWidth);
  }, []);

  // Deteksi Safari iOS
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isWebkit = /WebKit/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIOS(isIOSDevice && isWebkit);
  }, []);

  // Control aspect ratio and fullscreen behavior
  useEffect(() => {
    if (!containerRef.current || isIOS) return;
    const el = containerRef.current;

    const handleResize = () => {
      const isMobile = window.innerWidth <= MOBILE_SCREEN_WIDTH;
      const isFull = document.fullscreenElement;
      if (isMobile && !isFull) {
        // Mode portrait → pakai rasio 16:9
        el.style.width = "100%";
        el.style.aspectRatio = "16/9";
        el.style.height = "auto";
        el.style.position = "relative";
      } else if (isFull) {
        // Mode fullscreen → isi penuh
        el.style.width = "100vw";
        el.style.height = "100vh";
        el.style.aspectRatio = "unset";
        el.style.position = "fixed";
        el.style.top = "0";
        el.style.left = "0";
        el.style.zIndex = "50";
      } else {
        // Desktop atau landscape
        el.style.width = "";
        el.style.height = "";
        el.style.aspectRatio = "";
        el.style.position = "";
        el.style.zIndex = "";
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleResize);
    };
  }, [isIOS]);

  // Deteksi orientasi & auto fullscreen di landscape
  useEffect(() => {
    if (isIOS) return;
    let orientationTimer = null;
    const handleOrientation = () => {
      if (orientationTimer) {
        window.clearTimeout(orientationTimer);
      }
      orientationTimer = window.setTimeout(() => {
        orientationTimer = null;
        const video = videoRef.current;
        if (!video) return;
        const orientationType = window.screen?.orientation?.type;
        const isLandscape = orientationType
          ? orientationType.startsWith("landscape")
          : window.matchMedia?.("(orientation: landscape)")?.matches ??
            window.innerWidth > window.innerHeight;
        const isMobileViewportNow =
          Math.min(window.innerWidth, window.innerHeight) <= MOBILE_SCREEN_WIDTH;
        if (isLandscape && isMobileViewportNow) {
          (containerRef.current || video).requestFullscreen?.().catch(() => {});
        } else if (!isLandscape && document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      }, 150);
    };
    window.addEventListener("orientationchange", handleOrientation);
    return () => {
      if (orientationTimer) {
        window.clearTimeout(orientationTimer);
      }
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, [isIOS]);

  // Handler untuk masuk ke mode landscape fullscreen di mobile
  const enterMobileFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current || video;
    if (!video) return;

    try {
      if (isIOS && video.webkitEnterFullscreen) {
        await video.webkitEnterFullscreen();
        return;
      }
      if (window.innerWidth <= MOBILE_SCREEN_WIDTH) {
        // iOS Safari specific method
        if (video.webkitEnterFullscreen) {
          await video.webkitEnterFullscreen();
        }
        // Standard methods
        else if (container?.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container?.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
        // Request landscape orientation
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape");
        }
      }
    } catch (err) {
      console.warn("Failed to enter mobile fullscreen:", err);
    }
  }, [isIOS]);

  // Handle fullscreen changes and cleanup
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFullscreenChange = () => {
      const isInFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

      // If we're leaving fullscreen
      if (!isInFullscreen) {
        // Unlock orientation if possible
        if (screen.orientation?.unlock) {
          try {
            screen.orientation.unlock();
          } catch (err) {
            console.warn("Failed to unlock orientation:", err);
          }
        }

        // Remove pseudo-fullscreen if active
        const container = containerRef.current;
        if (container?.classList.contains("pseudo-fullscreen")) {
          container.classList.remove("pseudo-fullscreen");
        }

        setIsFullscreen(false);
      }
    };

    // Handle ESC key for pseudo-fullscreen (only when no settings/episode popover is open)
    const handleEscKey = (e) => {
      if (e.key === "Escape" && !hasOpenPopoverRef.current) {
        const container = containerRef.current;
        if (container?.classList.contains("pseudo-fullscreen")) {
          container.classList.remove("pseudo-fullscreen");
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    window.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      window.removeEventListener("keydown", handleEscKey);
    };
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

  // Auto fullscreen & landscape ketika video dimulai di mobile / iOS
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
  }, [enterMobileFullscreen, isIOS, videoSrc]);

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

    const hasCues = (track) => Boolean(track?.cues && track.cues.length > 0);
    // 1) Try direct match by language/label/id/kind, preferring tracks that already have cues
    const targetKeys = new Set([activeSubtitle, activeSubtitleMeta?.lang, activeSubtitleMeta?.label].map(normalizeSubtitleKey).filter(Boolean));
    if (targetKeys.size) {
      const exactMatches = [];
      const prefixMatches = [];
      for (const track of textTracks) {
        const keys = [track.language, track.label, track.id, track.kind].map(normalizeSubtitleKey).filter(Boolean);
        if (keys.some((k) => targetKeys.has(k))) {
          exactMatches.push(track);
          continue;
        }
        const lang = normalizeSubtitleKey(track.language || "");
        if (lang) {
          for (const tk of targetKeys) {
            if (tk && (lang.startsWith(tk) || tk.startsWith(lang))) {
              prefixMatches.push(track);
              break;
            }
          }
        }
      }
      const matches = [...exactMatches, ...prefixMatches];
      if (matches.length) {
        return matches.find(hasCues) || matches[0];
      }
    }
    // 2) Fallback by index based on our subtitleTracks order
    const idx = (subtitleTracks || []).findIndex((t) => {
      const a = normalizeSubtitleKey(activeSubtitle);
      if (!a) return false;
      return [t.lang, t.label]
        .map(normalizeSubtitleKey)
        .filter(Boolean)
        .some((v) => v === a || a.startsWith(v) || v.startsWith(a));
    });
    if (idx >= 0 && idx < textTracks.length) {
      const candidate = textTracks[idx];
      if (hasCues(candidate)) return candidate;
      return textTracks.find(hasCues) || candidate;
    }
    // 3) Last resort: prefer a track with cues, then first available
    return textTracks.find(hasCues) || textTracks[0] || null;
  }, [activeSubtitle, activeSubtitleMeta, subtitleTracks]);

  // subtitleSizeClass sudah digantikan dengan versi responsif di bawah

  const subtitleTextShadow = "";

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

  const attachSource = useCallback(
    async (isCancelled = () => false) => {
      detachHls();
      const media = videoRef.current;
      if (!media || !videoSrc) return;

      if (videoSrc.includes(".m3u8")) {
        try {
          const { default: Hls } = await import("hls.js");
          if (isCancelled() || videoRef.current !== media) return;
          if (Hls?.isSupported()) {
            detachHls();
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            if (isCancelled() || videoRef.current !== media) {
              hls.destroy();
              return;
            }
            hls.subtitleDisplay = false;
            hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
              if (isCancelled() || videoRef.current !== media) return;
              const tracks = Array.isArray(hls.subtitleTracks) ? hls.subtitleTracks : [];
              if (!tracks.length) return;
              const currentKey = activeSubtitleRef.current;
              if (!currentKey || currentKey === "off") {
                hls.subtitleTrack = -1;
                return;
              }
              const target = normalizeSubtitleKey(currentKey);
              const idx = tracks.findIndex(
                (t) =>
                  normalizeSubtitleKey(t.lang) === target ||
                  normalizeSubtitleKey(t.name) === target
              );
              hls.subtitleTrack = idx >= 0 ? idx : 0;
            });
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
              if (isCancelled() || videoRef.current !== media) return;
              const tracks = Array.isArray(data?.audioTracks)
                ? data.audioTracks
                : Array.isArray(hls.audioTracks)
                ? hls.audioTracks
                : [];
              const formatted = tracks.map((track, index) => ({
                index,
                id: track.id ?? index,
                name: track.name || track.lang || `Audio ${index + 1}`,
                lang: track.lang || "",
                label:
                  track.name && track.lang && track.name.toLowerCase() !== track.lang.toLowerCase()
                    ? `${track.name} (${track.lang})`
                    : track.name || (track.lang ? track.lang.toUpperCase() : `Audio ${index + 1}`),
              }));
              setAudioTracks(formatted);
              if (typeof hls.audioTrack === "number" && hls.audioTrack >= 0) {
                setActiveAudioTrack(hls.audioTrack);
              } else if (formatted.length) {
                const defaultIdx = tracks.findIndex((t) => t.default);
                setActiveAudioTrack(defaultIdx >= 0 ? defaultIdx : 0);
              } else {
                setActiveAudioTrack(-1);
              }
            });
            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
              if (isCancelled() || videoRef.current !== media) return;
              const nextIdx =
                typeof hls.audioTrack === "number" && hls.audioTrack >= 0
                  ? hls.audioTrack
                  : typeof data?.id === "number"
                  ? data.id
                  : -1;
              if (nextIdx >= 0) {
                setActiveAudioTrack(nextIdx);
              }
            });
            hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
              if (isCancelled() || videoRef.current !== media) return;
              const levels = Array.isArray(data?.levels) ? data.levels : [];
              const formatted = levels
                .map((lvl, index) => ({
                  index,
                  height: lvl.height || 0,
                  label: lvl.height ? `${lvl.height}p` : `Level ${index + 1}`,
                }))
                .sort((a, b) => b.height - a.height);
              setQualityLevels(formatted);
              setSelectedQuality(-1);
              if (pendingResumeRef.current) {
                const { time, shouldPlay } = pendingResumeRef.current;
                pendingResumeRef.current = null;
                if (typeof time === "number" && time > 0) {
                  try {
                    media.currentTime = time;
                  } catch {
                    // ignore seek error
                  }
                }
                if (shouldPlay) {
                  media.play().catch(() => undefined);
                }
              }
            });
            if (isCancelled() || videoRef.current !== media) {
              hls.destroy();
              return;
            }
            hls.loadSource(videoSrc);
            hls.attachMedia(media);
            hlsRef.current = hls;
            return;
          }
          if (media.canPlayType("application/vnd.apple.mpegurl")) {
            if (pendingResumeRef.current) {
              const applyPendingResume = () => {
                if (isCancelled() || videoRef.current !== media) return;
                const pending = pendingResumeRef.current;
                if (!pending) return;
                pendingResumeRef.current = null;
                const { time, shouldPlay } = pending;
                if (typeof time === "number" && time > 0) {
                  try {
                    media.currentTime = time;
                  } catch {
                    // ignore seek error
                  }
                }
                if (shouldPlay) {
                  media.play().catch(() => undefined);
                }
              };
              media.addEventListener("loadedmetadata", applyPendingResume, { once: true });
            }
            media.src = videoSrc;
            return;
          }
        } catch (error) {
          if (isCancelled()) return;
          console.warn("HLS.js failed to load, falling back to native playback", error);
        }
      }

      if (isCancelled() || videoRef.current !== media) return;
      media.src = videoSrc;
    },
    [detachHls, videoSrc]
  );

  useEffect(() => {
    let cancelled = false;
    attachSource(() => cancelled);
    return () => {
      cancelled = true;
      detachHls();
    };
  }, [attachSource, detachHls, isIOS, sessionNonce]);

  // Add subtitle and pseudo-fullscreen styles
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

        .pseudo-fullscreen {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          aspect-ratio: unset !important;
          transform: none !important;
          z-index: 99999 !important;
          background: #000 !important;
        }
        @media (orientation: portrait) {
          .pseudo-fullscreen {
            inset: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            transform: none !important;
            background: #000 !important;
          }
        }
      `;
      document.head.appendChild(style);
      subtitleStylesRef.current = style;
    }

    return () => {
      if (subtitleStylesRef.current) {
        subtitleStylesRef.current.remove();
        subtitleStylesRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const looksLikeMux = playbackId || (videoSrc && videoSrc.includes("stream.mux.com"));
    if (!looksLikeMux) {
      setMuxSubtitles([]);
      return;
    }
    const manifestUrl = videoSrc && /\.m3u8(\?|$)/i.test(videoSrc) ? videoSrc : playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : "";
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
    validatedSubtitleUrlsRef.current.clear();
  }, [playbackId, videoSrc]);

  useEffect(() => {
    if (!subtitleTracks.length) return;
    const tracksNeedingValidation = subtitleTracks.filter(
      (track) =>
        track.sourceUrl &&
        track.url &&
        track.url !== track.sourceUrl &&
        !validatedSubtitleUrlsRef.current.has(track.url)
    );
    if (!tracksNeedingValidation.length) return;

    let cancelled = false;
    Promise.all(
      tracksNeedingValidation.map(async (track) => {
        try {
          const response = await fetch(track.url, { method: "HEAD" });
          if (!response.ok) {
            throw new Error(`status ${response.status}`);
          }
          if (!cancelled) {
            validatedSubtitleUrlsRef.current.add(track.url);
          }
          return null;
        } catch (error) {
          if (!cancelled) {
            validatedSubtitleUrlsRef.current.add(track.url);
            console.warn("[VideoPlayer] Subtitle URL failed, falling back to original manifest URI", { attempted: track.url, fallback: track.sourceUrl, reason: error?.message });
          }
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
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSubtitleLines([]);
    resumeAppliedRef.current = "";
  }, [videoSrc]);

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

  const togglePlay = useCallback(() => {
    const media = videoRef.current;
    if (!media) return;
    showControlsTemporarily();
    if (media.paused) {
      const pausedDuration = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0;
      if (pausedDuration >= PAUSE_REFRESH_THRESHOLD_MS) {
        pendingResumeRef.current = { time: media.currentTime || 0, shouldPlay: true };
        pausedAtRef.current = null;
        setSessionNonce((n) => n + 1);
        return;
      }
      pausedAtRef.current = null;
      if (hlsRef.current && typeof hlsRef.current.startLoad === "function") {
        hlsRef.current.startLoad(media.currentTime || -1);
      }
      media.play().catch(() => undefined);
    } else {
      media.pause();
    }
  }, [showControlsTemporarily]);

  const toggleMute = useCallback(() => {
    const media = videoRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  }, []);

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

  const handleVolumeChange = useCallback(
    (event) => {
      const value = Number(event.target.value);
      const media = videoRef.current;
      if (!media || Number.isNaN(value)) return;
      media.volume = value;
      media.muted = value === 0;
      setVolume(value);
      setIsMuted(media.muted);
      showControlsTemporarily();
    },
    [showControlsTemporarily]
  );

  const requestFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    try {
      if (document.fullscreenElement) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }

        // Release orientation lock if we have one
        if (screen.orientation?.unlock) {
          try {
            screen.orientation.unlock();
          } catch (err) {
            console.warn("Failed to unlock orientation:", err);
          }
        }
      } else {
        // iOS Safari specific method - only if we really need native controls
        if (isIOS && video.webkitEnterFullscreen) {
          await video.webkitEnterFullscreen();
          return;
        }

        // Try native fullscreen first
        let fullscreenSuccess = false;
        try {
          if (container.requestFullscreen) {
            await container.requestFullscreen();
            fullscreenSuccess = true;
          } else if (container.webkitRequestFullscreen) {
            await container.webkitRequestFullscreen();
            fullscreenSuccess = true;
          } else if (container.mozRequestFullScreen) {
            await container.mozRequestFullScreen();
            fullscreenSuccess = true;
          } else if (container.msRequestFullscreen) {
            await container.msRequestFullscreen();
            fullscreenSuccess = true;
          }

          // If fullscreen succeeded and we're on mobile, try to force landscape
          if (fullscreenSuccess && typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH) {
            if (screen.orientation?.lock) {
              try {
                await screen.orientation.lock("landscape");
              } catch (err) {
                console.warn("Failed to lock orientation:", err);
              }
            }
          }
        } catch (err) {
          console.warn("Native fullscreen failed:", err);
          fullscreenSuccess = false;
        }

        // Fallback to pseudo-fullscreen if native fullscreen failed
        if (!fullscreenSuccess) {
          container.classList.add("pseudo-fullscreen");
          setIsFullscreen(true);
        }

        // Try to force landscape on supported devices
        if (window.innerWidth <= MOBILE_SCREEN_WIDTH) {
          if (screen.orientation?.lock) {
            try {
              await screen.orientation.lock("landscape");
            } catch (err) {
              console.warn("Failed to lock orientation:", err);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Fullscreen request failed:", err);
    }
    showControlsTemporarily();
  }, [isIOS, showControlsTemporarily]);

  const updateSubtitlePosition = useCallback(() => {
    if (isFullscreen) {
      // Fixed position when in fullscreen
      setSubtitleBottom(`${SUBTITLE_FULLSCREEN_OFFSET_PERCENT}%`);
      return;
    }

    const base = `${SUBTITLE_BASE_OFFSET_PERCENT}%`;
    if (!controlsVisible) {
      setSubtitleBottom(base);
      return;
    }

    const rect = controlBarRef.current?.getBoundingClientRect();
    const offset = rect && rect.height ? Math.round(rect.height + SUBTITLE_CONTROL_GAP_PX) : 0;

    // On mobile, use a higher base offset
    const mobileBase = typeof window !== "undefined" && window.innerWidth <= MOBILE_SCREEN_WIDTH ? `${SUBTITLE_BASE_OFFSET_PERCENT * 1.5}%` : base;

    if (!offset) {
      setSubtitleBottom(mobileBase);
      return;
    }

    setSubtitleBottom(`calc(${mobileBase} + ${offset}px)`);
  }, [controlsVisible, isFullscreen]);

  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls || !Array.isArray(hls.subtitleTracks) || !hls.subtitleTracks.length) return;
    hls.subtitleDisplay = false;
    if (!activeSubtitle || activeSubtitle === "off") {
      hls.subtitleTrack = -1;
      return;
    }
    const target = normalizeSubtitleKey(activeSubtitle);
    const idx = hls.subtitleTracks.findIndex(
      (t) =>
        normalizeSubtitleKey(t.lang) === target ||
        normalizeSubtitleKey(t.name) === target
    );
    hls.subtitleTrack = idx >= 0 ? idx : 0;
  }, [activeSubtitle, muxSubtitles, videoSrc]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media || !media.textTracks) return undefined;
    const syncTrackModes = () => {
      const tracks = Array.from(media.textTracks || []);
      if (!tracks.length) {
        setSubtitleLines([]);
        return;
      }
      const activeTrack = resolveActiveTextTrack();
      const activeHasCues = Boolean(activeTrack?.cues && activeTrack.cues.length > 0);
      const targetKeys = new Set(
        [activeSubtitle, activeSubtitleMeta?.lang, activeSubtitleMeta?.label]
          .map(normalizeSubtitleKey)
          .filter(Boolean)
      );
      tracks.forEach((track) => {
        if (track === activeTrack) {
          track.mode = "hidden";
          return;
        }
        // Keep matching sibling tracks hidden (never showing) while activeTrack has 0 cues so <track> elements still load
        if (!activeHasCues && activeSubtitle && activeSubtitle !== "off") {
          const keys = [track.language, track.label, track.id]
            .map(normalizeSubtitleKey)
            .filter(Boolean);
          const matchesTarget = keys.some(
            (k) =>
              targetKeys.has(k) ||
              Array.from(targetKeys).some((tk) => tk && (k.startsWith(tk) || tk.startsWith(k)))
          );
          if (matchesTarget) {
            track.mode = "hidden";
            return;
          }
        }
        track.mode = "disabled";
      });
      if (!activeTrack) {
        setSubtitleLines([]);
      }
    };
    syncTrackModes();
    const textTracks = media.textTracks;
    textTracks.addEventListener?.("addtrack", syncTrackModes);
    textTracks.addEventListener?.("change", syncTrackModes);
    textTracks.addEventListener?.("removetrack", syncTrackModes);
    media.addEventListener("load", syncTrackModes, true);
    return () => {
      textTracks.removeEventListener?.("addtrack", syncTrackModes);
      textTracks.removeEventListener?.("change", syncTrackModes);
      textTracks.removeEventListener?.("removetrack", syncTrackModes);
      media.removeEventListener("load", syncTrackModes, true);
    };
  }, [resolveActiveTextTrack, activeSubtitle, activeSubtitleMeta, subtitleTracks, isIOS, videoSrc]);

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

  const applyInitialResume = useCallback(() => {
    const media = videoRef.current;
    if (!media || !initialTime || initialTime <= 0) return;
    const resumeKey = `${videoSrc}::${initialTime}`;
    if (resumeAppliedRef.current === resumeKey) return;
    if (media.readyState < 1) return;

    const hasValidDuration = Number.isFinite(media.duration) && media.duration > 0;
    if (hasValidDuration && media.duration <= initialTime + 5) {
      resumeAppliedRef.current = resumeKey;
      return;
    }

    if (media.currentTime < 5) {
      try {
        media.currentTime = initialTime;
        setCurrentTime(initialTime);
      } catch {
        // Defer retry to durationchange/canplay if seek fails before stream settles
      }
    }

    if (
      (media.currentTime > 0 && Math.abs(media.currentTime - initialTime) <= 1) ||
      media.currentTime >= 5
    ) {
      resumeAppliedRef.current = resumeKey;
    }
  }, [initialTime, videoSrc]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;

    const handlePlay = () => {
      pausedAtRef.current = null;
      if (hlsRef.current && typeof hlsRef.current.startLoad === "function") {
        hlsRef.current.startLoad(-1);
      }
      setIsPlaying(true);
    };
    const handlePause = () => {
      pausedAtRef.current = Date.now();
      if (hlsRef.current && typeof hlsRef.current.stopLoad === "function") {
        hlsRef.current.stopLoad();
      }
      setIsPlaying(false);
    };
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
      setDuration(Number.isFinite(media.duration) ? media.duration : 0);
      applyInitialResume();
      setCurrentTime(media.currentTime || 0);
    };
    const handleDurationChange = () => {
      setDuration(Number.isFinite(media.duration) ? media.duration : 0);
      applyInitialResume();
    };
    const handleCanPlay = () => {
      applyInitialResume();
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
    media.addEventListener("durationchange", handleDurationChange);
    media.addEventListener("canplay", handleCanPlay);
    media.addEventListener("volumechange", handleVolumeUpdate);
    media.addEventListener("ended", handleEnded);

    return () => {
      media.removeEventListener("play", handlePlay);
      media.removeEventListener("pause", handlePause);
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeEventListener("durationchange", handleDurationChange);
      media.removeEventListener("canplay", handleCanPlay);
      media.removeEventListener("volumechange", handleVolumeUpdate);
      media.removeEventListener("ended", handleEnded);
    };
  }, [onEnded, onProgress, videoSrc, applyInitialResume]);

  useEffect(() => {
    applyInitialResume();
  }, [applyInitialResume]);

  // Track fullscreen state changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      const isInFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(isInFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape" && (isSettingsOpen || isEpisodePanelOpen)) {
        event.preventDefault();
        event.stopPropagation();
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isEpisodePanelOpen) setEpisodePanelOpen(false);
        return;
      }
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase?.();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return;
      const isInteractiveButtonOrSettings =
        tagName === "button" ||
        tagName === "a" ||
        Boolean(target?.closest?.('button, [role="button"], a, [data-settings-popover="true"]'));
      const media = videoRef.current;
      if (!media) return;
      switch (event.key.toLowerCase()) {
        case " ":
          if (isInteractiveButtonOrSettings) return;
          event.preventDefault();
          togglePlay();
          break;
        case "k":
          event.preventDefault();
          togglePlay();
          break;
        case "arrowright":
          event.preventDefault();
          media.currentTime = Math.min(media.duration || Infinity, media.currentTime + (event.shiftKey ? 30 : 10));
          showControlsTemporarily();
          break;
        case "arrowleft":
          event.preventDefault();
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
  }, [activeSubtitle, subtitleTracks, togglePlay, requestFullscreen, toggleMute, handleVolumeChange, volume, showControlsTemporarily, nextEpisode, handleNextEpisode, hasEpisodes, handleEpisodePanelToggle, isSettingsOpen, isEpisodePanelOpen]);

  useEffect(() => {
    if (!activeSubtitle || activeSubtitle === "off") {
      setSubtitleLines([]);
      return undefined;
    }
    const media = videoRef.current;
    if (!media) return undefined;

    let currentTrack = null;
    let rafId = null;

    const handleCueChange = () => {
      if (!currentTrack) {
        setSubtitleLines([]);
        return;
      }
      const cues = currentTrack.activeCues ? Array.from(currentTrack.activeCues) : [];
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

    const bindActiveTrack = () => {
      const nextTrack = resolveActiveTextTrack();
      if (currentTrack && currentTrack !== nextTrack) {
        currentTrack.removeEventListener("cuechange", handleCueChange);
      }
      currentTrack = nextTrack;
      if (!currentTrack) {
        setSubtitleLines([]);
        return;
      }
      if (currentTrack.mode === "disabled") {
        currentTrack.mode = "hidden";
      }
      currentTrack.removeEventListener("cuechange", handleCueChange);
      currentTrack.addEventListener("cuechange", handleCueChange);
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => handleCueChange());
      handleCueChange();
    };

    bindActiveTrack();
    const textTracks = media.textTracks;
    textTracks?.addEventListener?.("addtrack", bindActiveTrack);
    textTracks?.addEventListener?.("change", bindActiveTrack);
    textTracks?.addEventListener?.("removetrack", bindActiveTrack);
    media.addEventListener("load", bindActiveTrack, true);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (currentTrack) {
        currentTrack.removeEventListener("cuechange", handleCueChange);
      }
      textTracks?.removeEventListener?.("addtrack", bindActiveTrack);
      textTracks?.removeEventListener?.("change", bindActiveTrack);
      textTracks?.removeEventListener?.("removetrack", bindActiveTrack);
      media.removeEventListener("load", bindActiveTrack, true);
    };
  }, [resolveActiveTextTrack, activeSubtitle, subtitleTracks, isIOS, videoSrc]);

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
  const subtitleSizeScale = {
    small: 0.85,
    medium: 1,
    large: 1.25,
    xlarge: 1.5,
  }[subtitleSize || autoSubtitleSize] || 1;
  const overlayBackgroundClass = isFullscreen
    ? "bg-gradient-to-b from-black/75 via-transparent to-black/90"
    : "bg-gradient-to-b from-black/80 via-transparent to-black/95";
  const showOverlay = controlsVisible;
  const controlButtonClass =
    "inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 p-2 text-white/95 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.22)] transition duration-150 hover:scale-105 hover:border-white/35 hover:bg-white/20 hover:text-white active:scale-95 min-h-[40px] min-w-[40px] focus:outline-none focus:ring-2 focus:ring-white/40";
  useEffect(() => {
    setNextEpisodeDismissed(false);
    setQualityLevels([]);
    setSelectedQuality(-1);
    setAudioTracks([]);
    setActiveAudioTrack(-1);
  }, [videoSrc, currentEpisode?.id]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    media.playbackRate = playbackRate;
  }, [playbackRate, videoSrc]);

  const handleQualityChange = (event) => {
    const levelIndex = Number(event.target.value);
    setSelectedQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    showControlsTemporarily();
  };

  const handleAudioTrackChange = (trackIndex) => {
    const idx = Number(trackIndex);
    if (Number.isNaN(idx)) return;
    setActiveAudioTrack(idx);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = idx;
    }
    showControlsTemporarily();
  };

  const handlePlaybackRateChange = (event) => {
    const nextRate = Number(event.target.value) || 1;
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
    showControlsTemporarily();
  };

  const shouldShowBackdropGradient = !isFullscreen;
  const shouldRenderSubtitles = !isIOS && activeSubtitle !== "off" && subtitleLines.length > 0;
  const remainingSeconds = Math.max(0, (duration || 0) - (currentTime || 0));
  const showNextEpisodeCountdown =
    !isIOS &&
    Boolean(nextEpisode) &&
    !nextEpisodeDismissed &&
    duration > 20 &&
    remainingSeconds > 0 &&
    remainingSeconds <= 10;

  useEffect(() => {
    return () => {
      if (seekIndicatorTimerRef.current) {
        clearTimeout(seekIndicatorTimerRef.current);
        seekIndicatorTimerRef.current = null;
      }
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
    };
  }, []);

  const triggerSeekFeedback = (side) => {
    if (seekIndicatorTimerRef.current) {
      clearTimeout(seekIndicatorTimerRef.current);
    }
    setSeekIndicator({ side, key: Date.now() });
    seekIndicatorTimerRef.current = setTimeout(() => {
      setSeekIndicator(null);
    }, 650);
  };

  const handleContainerTap = (event) => {
    if (isIOS || isEpisodePanelOpen) return;
    if (controlBarRef.current?.contains(event.target)) return;
    if (event.target?.closest?.("button, a, input, select")) return;

    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      const relX = (event.clientX - rect.left) / rect.width;
      const side = relX < 0.35 ? "left" : relX > 0.65 ? "right" : "center";
      const now = Date.now();
      if (side !== "center" && lastTapRef.current.side === side && now - lastTapRef.current.time < 280) {
        seekBy(side === "left" ? -10 : 10);
        triggerSeekFeedback(side);
        lastTapRef.current = { time: 0, side: null };
        return;
      }
      lastTapRef.current = { time: now, side };
    }

    const wasControlsVisible = showControls;
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      if (wasControlsVisible) {
        if (controlsTimerRef.current) {
          clearTimeout(controlsTimerRef.current);
          controlsTimerRef.current = null;
        }
        setShowControls(false);
      } else {
        showControlsTemporarily();
      }
    }, 280);
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden w-full max-w-full"
      onClick={handleContainerTap}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => {
        if (!isEpisodePanelOpen) {
          setShowControls(false);
        }
      }}
      style={{
        aspectRatio: isFullscreen ? "auto" : isMobileViewport ? "16 / 9" : undefined,
        position: isFullscreen ? "fixed" : "relative",
        inset: isFullscreen ? 0 : "unset",
        width: "100%",
        height: isFullscreen ? "100vh" : isMobileViewport ? "auto" : "100dvh",
        maxHeight: "100dvh",
        zIndex: isFullscreen ? 50 : "auto",
      }}
    >
      {isIOS ? (
        // Native Safari iOS player
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          src={videoSrc || src || undefined}
          poster={poster || undefined}
          title={title}
          crossOrigin="anonymous"
          controls
          autoPlay={autoplay}
          playsInline
          webkit-playsinline="true"
          x-webkit-playsinline="true"
          x-webkit-airplay="allow"
          style={{
            width: "100%",
            height: "100%",
            maxHeight: viewportWidth <= MOBILE_SCREEN_WIDTH ? "100dvh" : undefined,
          }}
        >
          {subtitleTracks
            .filter((track) => Boolean(track?.url) && !/\.m3u8(\?|$)/i.test(track.url))
            .map((track) => (
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
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          poster={poster || undefined}
          title={title}
          crossOrigin="anonymous"
          muted={isMuted}
          playsInline
          x-webkit-airplay="allow"
          webkit-playsinline="true"
          x-webkit-playsinline="true"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
        >
          {subtitleTracks
            .filter((track) => Boolean(track?.url) && !/\.m3u8(\?|$)/i.test(track.url))
            .map((track) => (
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
          className="pointer-events-none absolute inset-x-0 flex w-full justify-center transition-all duration-200 ease-out"
          style={{
            bottom: isFullscreen ? "10%" : subtitleBottom,
            zIndex: 30,
            padding: "0 5%",
            boxSizing: "border-box",
          }}
        >
          <div className="flex w-full max-w-4xl flex-col items-center gap-2 text-center">
            {subtitleLines.map((line, index) => {
              const bgClass =
                subtitleBg === "solid"
                  ? "bg-black/80"
                  : subtitleBg === "soft"
                  ? "bg-black/45 backdrop-blur-sm"
                  : "bg-transparent";
              const edgeShadow =
                subtitleEdge === "outline"
                  ? "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 6px rgba(0,0,0,0.9)"
                  : subtitleEdge === "shadow"
                  ? "2px 2px 5px rgba(0,0,0,0.92)"
                  : "none";
              return (
                <span
                  key={`${index}-${line}`}
                  className={`font-bold px-3 py-1 rounded-lg ${subtitleSizeClass || ""} ${bgClass}`}
                  style={{
                    color: subtitleColor,
                    textShadow: edgeShadow,
                    fontSize: (() => {
                      const baseVw =
                        viewportWidth < 500
                          ? 4
                          : viewportWidth < 900
                          ? isFullscreen
                            ? 3
                            : 2.5
                          : viewportWidth < 1600
                          ? isFullscreen
                            ? 2
                            : 1.5
                          : isFullscreen
                          ? 1.5
                          : 1;
                      return `${+(baseVw * subtitleSizeScale).toFixed(2)}vw`;
                    })(),
                    lineHeight: 1.35,
                    maxWidth: "90%",
                    wordBreak: "break-word",
                  }}
                >
                  {line}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Putar"
            className="pointer-events-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl transition duration-200 hover:scale-110 hover:border-white/60 hover:bg-white/25 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-8 w-8 sm:h-10 sm:w-10 drop-shadow">
              <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
            </svg>
          </button>
        </div>
      )}

      {hasEpisodes && (
        <div
          className={`pointer-events-auto absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-white/15 bg-black/65 backdrop-blur-2xl shadow-[-12px_0_40px_rgba(0,0,0,0.65)] transition duration-300 ${
            isEpisodePanelOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
            <div>
              <span className="text-sm font-bold tracking-wide text-white">Daftar Episode</span>
              {title && <p className="text-xs text-white/60 truncate max-w-[220px]">{title}</p>}
            </div>
            <button
              type="button"
              onClick={() => setEpisodePanelOpen(false)}
              aria-label="Tutup daftar episode"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {episodeList.map((episode) => {
                const isActive = episode.id === currentEpisode?.id;
                return (
                  <button
                    key={episode.id}
                    type="button"
                    onClick={() => handleEpisodeSelection(episode)}
                    className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[#E50914]/60 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                        : "border-white/5 bg-white/[0.05] text-white/90 hover:border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {episode.thumbnail ? (
                      <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-black/60">
                        <img src={episode.thumbnail} alt={episode.title || ""} className="h-full w-full object-cover" />
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#E50914]" />
                          </div>
                        )}
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${isActive ? "text-[#E50914]" : "text-white/60"}`}>
                          {episode.number ? `E${episode.number}` : "Episode"}
                        </span>
                        {episode.duration ? (
                          <span className="text-[11px] font-medium tabular-nums text-white/50">{formatTime(episode.duration)}</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold text-white">{episode.title}</p>
                      {episode.overview && <p className="mt-1 text-xs leading-relaxed text-white/65 line-clamp-2">{episode.overview}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isIOS && backHref ? (
        <button
          type="button"
          onClick={handleBack}
          className="pointer-events-auto absolute left-3 top-3 z-20 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-xl transition duration-200 hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Kembali"
        >
          <BackIcon className="h-4 w-4" />
        </button>
      ) : null}

      <div className={`pointer-events-none absolute inset-0 flex flex-col justify-between ${overlayBackgroundClass} transition-opacity duration-300 ${showOverlay ? "opacity-100" : "opacity-0"}`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-5 text-white drop-shadow">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {backHref ? (
              <button
                type="button"
                onClick={handleBack}
                className={`pointer-events-auto inline-flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition duration-150 hover:scale-105 hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  isIOS || showOverlay ? "opacity-100" : "opacity-0"
                }`}
                aria-label="Kembali"
                title="Kembali"
              >
                <BackIcon className="h-5 w-5" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold tracking-tight sm:text-xl md:text-2xl drop-shadow">{title}</h3>
              {currentEpisode && (
                <p className="truncate text-xs font-medium text-white/75 sm:text-sm">
                  {currentEpisode.number ? `E${currentEpisode.number}: ` : ""}
                  {currentEpisode.title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Liquid Glass Control Dock + Settings Popover */}
        <div ref={controlBarRef} className="pointer-events-auto relative mx-3 mb-3 sm:mx-6 sm:mb-5">
          {isSettingsOpen && (
            <div
              data-settings-popover="true"
              className="absolute bottom-full right-0 mb-3 max-h-[70vh] w-[min(92vw,360px)] overflow-y-auto rounded-2xl border border-white/20 bg-black/70 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">Pengaturan Pemutaran</span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                  aria-label="Tutup pengaturan"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {qualityLevels.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-white/60">Kualitas Video</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQualityChange({ target: { value: -1 } })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        selectedQuality === -1
                          ? "bg-[#E50914] text-white shadow"
                          : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      Auto
                    </button>
                    {qualityLevels.map((lvl) => (
                      <button
                        key={lvl.index}
                        type="button"
                        onClick={() => handleQualityChange({ target: { value: lvl.index } })}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          selectedQuality === lvl.index
                            ? "bg-[#E50914] text-white shadow"
                            : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/60">Kecepatan Putar</p>
                <div className="flex flex-wrap gap-1.5">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handlePlaybackRateChange({ target: { value: rate } })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        playbackRate === rate
                          ? "bg-white text-black shadow"
                          : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {audioTracks.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-white/60">Audio / Dubbing</p>
                  <div className="flex flex-wrap gap-1.5">
                    {audioTracks.map((track) => {
                      const active = activeAudioTrack === track.index;
                      return (
                        <button
                          key={`${track.index}-${track.lang || track.name}`}
                          type="button"
                          onClick={() => handleAudioTrackChange(track.index)}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            active
                              ? "bg-[#E50914] text-white shadow"
                              : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                          }`}
                        >
                          {track.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {subtitleTracks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-white/60">Subtitle</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubtitle("off");
                        showControlsTemporarily();
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        activeSubtitle === "off"
                          ? "bg-white text-black shadow"
                          : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      Nonaktif
                    </button>
                    {subtitleTracks.map((track) => {
                      const trackVal = track.lang || track.label;
                      const active = activeSubtitle === trackVal;
                      return (
                        <button
                          key={`${track.lang}-${track.url}`}
                          type="button"
                          onClick={() => {
                            setActiveSubtitle(trackVal);
                            showControlsTemporarily();
                          }}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            active
                              ? "bg-[#E50914] text-white shadow"
                              : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                          }`}
                        >
                          {track.label || track.lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/60">Ukuran Teks Subtitle</p>
                <div className="flex flex-wrap gap-1.5">
                  {subtitleSizeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSubtitleSize(option.value);
                        showControlsTemporarily();
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        subtitleSize === option.value
                          ? "bg-white text-black shadow"
                          : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/60">Warna Teks Subtitle</p>
                <div className="flex flex-wrap items-center gap-2">
                  {subtitleColorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSubtitleColor(opt.value);
                        showControlsTemporarily();
                      }}
                      aria-label={`Warna ${opt.label}`}
                      title={opt.label}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                        subtitleColor === opt.value
                          ? "border-white bg-white/15 text-white shadow"
                          : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-white/30"
                        style={{ backgroundColor: opt.value }}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/60">Latar Belakang Subtitle</p>
                <div className="flex flex-wrap gap-1.5">
                  {subtitleBgOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSubtitleBg(opt.value);
                        showControlsTemporarily();
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        subtitleBg === opt.value
                          ? "bg-white text-black shadow"
                          : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/60">Gaya Pinggiran Teks</p>
                <div className="flex flex-wrap gap-1.5">
                  {subtitleEdgeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSubtitleEdge(opt.value);
                        showControlsTemporarily();
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        subtitleEdge === opt.value
                          ? "bg-white text-black shadow"
                          : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-center">
                <span
                  className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${
                    subtitleBg === "solid"
                      ? "bg-black/80"
                      : subtitleBg === "soft"
                      ? "bg-black/45"
                      : "bg-transparent"
                  }`}
                  style={{
                    color: subtitleColor,
                    textShadow:
                      subtitleEdge === "outline"
                        ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
                        : subtitleEdge === "shadow"
                        ? "1px 1px 4px rgba(0,0,0,0.9)"
                        : "none",
                  }}
                >
                  Contoh Tampilan Subtitle
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 px-1 sm:px-2 pb-1 text-xs md:text-sm">
            {/* Netflix Red Scrubber Bar */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block w-12 text-right tabular-nums text-xs font-medium text-white/80">
                {formatTime(currentTime)}
              </span>
              <div className="group/scrubber relative flex h-5 flex-1 items-center">
                <div className="relative h-1 w-full overflow-visible rounded-full bg-white/25 transition-all duration-150 group-hover/scrubber:h-1.5">
                  <div
                    className="h-full rounded-full bg-[#E50914] transition-[width] duration-75"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                  <div
                    className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.9)] transition-transform duration-150 group-hover/scrubber:scale-100"
                    style={{ left: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={progress}
                  onChange={handleProgressChange}
                  aria-label="Seek video"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
              <span className="tabular-nums text-xs font-medium text-white/85">
                -{formatTime(remainingSeconds)}
              </span>
            </div>

            {/* Clean Icon-Only Netflix Control Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className={controlButtonClass}
                  aria-label={isPlaying ? "Jeda" : "Putar"}
                  title={isPlaying ? "Jeda (Space)" : "Putar (Space)"}
                >
                  {icons[isPlaying ? "pause" : "play"]}
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  className={controlButtonClass}
                  aria-label="Mundur 10 detik"
                  title="Mundur 10 detik"
                >
                  {icons.back10}
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  className={controlButtonClass}
                  aria-label="Maju 10 detik"
                  title="Maju 10 detik"
                >
                  {icons.forward10}
                </button>
                <div className="group/vol flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={controlButtonClass}
                    aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                    title={isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
                  >
                    {icons[isMuted || volume === 0 ? "mute" : "sound"]}
                  </button>
                  <div className="hidden lg:flex w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/vol:w-24 group-hover/vol:opacity-100 focus-within:w-24 focus-within:opacity-100 items-center">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                      className="h-1 w-24 cursor-pointer accent-[#E50914]"
                    />
                  </div>
                </div>
                {currentEpisode && (
                  <span className="ml-2 hidden truncate max-w-[240px] text-xs font-medium text-white/75 xl:inline">
                    {title} · {currentEpisode.number ? `E${currentEpisode.number}` : ""} {currentEpisode.title}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                {subtitleTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const current = subtitleTracks.findIndex((track) => track.lang === activeSubtitle || track.label === activeSubtitle);
                      if (current === -1) {
                        setActiveSubtitle(subtitleTracks[0].lang || subtitleTracks[0].label);
                      } else {
                        setActiveSubtitle("off");
                      }
                      showControlsTemporarily();
                    }}
                    className={controlButtonClass}
                    aria-label={activeSubtitle === "off" ? "Nyalakan subtitle" : "Matikan subtitle"}
                    title={activeSubtitle === "off" ? "Subtitle: Nonaktif" : "Subtitle: Aktif"}
                  >
                    {icons[activeSubtitle === "off" ? "subsOff" : "subsOn"]}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen((prev) => !prev);
                    showControlsTemporarily();
                  }}
                  className={`${controlButtonClass} ${isSettingsOpen ? "bg-white/20 text-white" : ""}`}
                  aria-label="Pengaturan pemutaran"
                  title="Kualitas, Kecepatan & Subtitle"
                >
                  {icons.settings}
                </button>
                {hasEpisodes && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleEpisodePanelToggle();
                    }}
                    className={controlButtonClass}
                    aria-label="Daftar episode"
                    title="Daftar Episode"
                  >
                    {icons.episodes}
                  </button>
                )}
                {nextEpisode && (
                  <button
                    type="button"
                    onClick={handleNextEpisode}
                    className={controlButtonClass}
                    aria-label="Episode berikutnya"
                    title="Episode Berikutnya"
                  >
                    {icons.next}
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestFullscreen}
                  className={controlButtonClass}
                  aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
                  title={isFullscreen ? "Keluar Layar Penuh (F)" : "Layar Penuh (F)"}
                >
                  {icons[isFullscreen ? "exitFull" : "full"]}
                </button>
              </div>
            </div>
          </div>
        </div>
      {seekIndicator && (
        <div
          key={seekIndicator.key}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center rounded-full bg-black/65 px-5 py-3 text-white backdrop-blur-sm animate-pulse ${
            seekIndicator.side === "left" ? "left-8 sm:left-16" : "right-8 sm:right-16"
          }`}
        >
          <span className="text-sm sm:text-base font-bold">{seekIndicator.side === "left" ? "-10s" : "+10s"}</span>
        </div>
      )}

      {showNextEpisodeCountdown && (
        <div className="pointer-events-auto absolute bottom-24 right-4 sm:right-8 z-30 w-72 sm:w-80 rounded-md border border-white/15 bg-[#141414]/95 p-4 text-white shadow-2xl backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
            Episode berikutnya dalam {Math.ceil(remainingSeconds)} detik
          </p>
          <p className="mt-1 truncate text-sm font-bold text-white">
            {nextEpisode.number ? `E${nextEpisode.number}: ` : ""}
            {nextEpisode.title}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextEpisode}
              className="flex-1 rounded-[4px] bg-white px-3 py-1.5 text-xs font-bold text-black transition hover:bg-white/85"
            >
              Putar Sekarang
            </button>
            <button
              type="button"
              onClick={() => setNextEpisodeDismissed(true)}
              className="rounded-[4px] border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
