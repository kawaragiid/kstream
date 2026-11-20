import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import WatchPlayer from "@/components/WatchPlayer";

let firestoreModule = null;

async function ensureFirestore() {
  if (!firestoreModule) {
    try {
      firestoreModule = await import("../../lib/firestoreServer");
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      return {
        getVideoById: async () => null,
        getSeriesEpisodes: async () => [],
        getSeriesEpisode: async () => null,
      };
    }
  }
  return firestoreModule;
}

const getCachedVideoById = cache(async (id, preferredType) => {
  const { getVideoById } = await ensureFirestore();
  return getVideoById(id, preferredType).catch(() => null);
});

const getCachedSeriesEpisodes = cache(async (seriesId) => {
  const { getSeriesEpisodes } = await ensureFirestore();
  return getSeriesEpisodes(seriesId).catch(() => []);
});

const getCachedSeriesEpisode = cache(async (seriesId, episodeId) => {
  const { getSeriesEpisode } = await ensureFirestore();
  return getSeriesEpisode(seriesId, episodeId).catch(() => null);
});

function decodeParam(value) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function extractParam(searchParams, key) {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function hasPlayableSource(item) {
  return Boolean(item?.playbackId || item?.streamUrl);
}

function formatEpisodeLabel(ep) {
  if (ep?.number !== undefined && ep?.number !== null && ep.number !== "") {
    return `Episode ${ep.number}`;
  }
  return ep?.title || "Episode";
}

function PlayerChrome({ children }) {
  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-black text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="flex h-full w-full items-center justify-center">{children}</div>
    </div>
  );
}

function UnavailablePlayerState({ title, message, backHref }) {
  return (
    <PlayerChrome>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-sm text-white/65">{message}</p>
        <Link
          href={backHref}
          className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 motion-reduce:transition-none"
        >
          Kembali
        </Link>
      </div>
    </PlayerChrome>
  );
}

export async function generateMetadata(props) {
  const searchParams = (await props?.searchParams) ?? {};
  const rawId = extractParam(searchParams, "id");
  const rawType = extractParam(searchParams, "type");
  const rawEpisode = extractParam(searchParams, "ep");
  const resolvedId = decodeParam(rawId);
  if (!resolvedId) return { title: "Pemutar" };
  const normalizedType = (rawType || "").toString().toLowerCase();
  const preferredType = normalizedType === "series" ? "series" : normalizedType === "movie" ? "movie" : undefined;
  const video = await getCachedVideoById(resolvedId, preferredType);
  let title = video?.title || "Pemutar";
  let description = video?.overview;

  if (video && (normalizedType === "series" || video.type === "series")) {
    const episodeId = decodeParam(rawEpisode);
    let currentEpisode = null;
    if (episodeId) {
      currentEpisode = await getCachedSeriesEpisode(video.id, episodeId);
    }
    if (!currentEpisode) {
      const episodes = await getCachedSeriesEpisodes(video.id);
      currentEpisode = episodes?.find(hasPlayableSource) || episodes?.[0] || null;
    }
    if (currentEpisode) {
      const epLabel =
        currentEpisode.number !== undefined && currentEpisode.number !== null && currentEpisode.number !== ""
          ? `Ep ${currentEpisode.number}`
          : currentEpisode.title || "";
      if (epLabel) {
        title = `${video.title} \u2022 ${epLabel}`;
      }
      if (currentEpisode.overview) {
        description = currentEpisode.overview;
      }
    }
  }

  return {
    title,
    description,
  };
}

export default async function PlayerPage(props) {
  const searchParams = (await props?.searchParams) ?? {};

  const rawId = extractParam(searchParams, "id");
  const rawType = extractParam(searchParams, "type");
  const rawEpisode = extractParam(searchParams, "ep");
  const rawAutoplay = extractParam(searchParams, "autoplay");

  const resolvedId = decodeParam(rawId);
  if (!resolvedId) notFound();

  const normalizedType = (rawType || "").toString().toLowerCase();
  const isSeriesRequest = normalizedType === "series";
  const preferredType = isSeriesRequest ? "series" : normalizedType === "movie" ? "movie" : undefined;

  const video = await getCachedVideoById(resolvedId, preferredType);
  if (!video) notFound();

  const slugOrId = video.slug || video.id;
  const autoplayEnabled = rawAutoplay === "1" || (rawAutoplay || "").toLowerCase() === "true";

  if (isSeriesRequest || video.type === "series") {
    const episodes = await getCachedSeriesEpisodes(video.id);
    if (!episodes?.length) notFound();

    const seriesHref = `/series/${encodeURIComponent(slugOrId)}`;
    const playableEpisodes = episodes.filter(hasPlayableSource);
    if (!playableEpisodes.length) {
      return (
        <UnavailablePlayerState
          title="Video Belum Tersedia"
          message="Belum ada episode yang siap diputar untuk serial ini."
          backHref={seriesHref}
        />
      );
    }

    const episodeId = decodeParam(rawEpisode);
    let currentEpisode = null;

    if (episodeId) {
      currentEpisode = await getCachedSeriesEpisode(video.id, episodeId);
      if (!currentEpisode) notFound();
    } else {
      currentEpisode = playableEpisodes[0];
    }

    if (!hasPlayableSource(currentEpisode)) {
      return (
        <UnavailablePlayerState
          title="Episode Belum Tersedia"
          message={`${formatEpisodeLabel(currentEpisode)} belum memiliki sumber video yang siap diputar.`}
          backHref={seriesHref}
        />
      );
    }

    const currentEpisodeId = currentEpisode.id;
    const epLabel = formatEpisodeLabel(currentEpisode);
    const fullTitle = `${video.title} \u2022 ${epLabel}`;
    const watchHref = `/player?id=${encodeURIComponent(slugOrId)}&type=series&ep=${encodeURIComponent(currentEpisodeId)}`;
    const trackerVideo = {
      id: `${video.id}-${currentEpisodeId}`,
      seriesId: video.id,
      title: fullTitle,
      type: "series",
      slug: slugOrId,
      overview: currentEpisode.overview || video.overview || "",
      posterUrl: video.posterUrl || "",
      duration: currentEpisode.duration || video.duration || 0,
      orientation: video.orientation || "landscape",
      href: seriesHref,
      watchHref,
      category: video.category || "",
      subtitles: currentEpisode.subtitles?.length ? currentEpisode.subtitles : video.subtitles || [],
    };

    const sanitizedEpisodes = video.isPremium
      ? episodes.map(({ streamUrl: _streamUrl, ...epRest }) => epRest)
      : episodes;
    const sanitizedCurrentEpisode = video.isPremium && currentEpisode
      ? (({ streamUrl: _streamUrl, ...epRest }) => epRest)(currentEpisode)
      : currentEpisode;

    return (
      <PlayerChrome>
        <div className="w-full max-w-[120rem]">
          <WatchPlayer
            key={currentEpisode?.id || video.id}
            video={{ ...trackerVideo, isPremium: Boolean(video.isPremium) }}
            backHref={seriesHref}
            playbackId={currentEpisode.playbackId || ""}
            src={video.isPremium ? "" : (currentEpisode.streamUrl || "")}
            isPremium={Boolean(video.isPremium)}
            poster={currentEpisode.thumbnail || video.backdropUrl || video.posterUrl}
            title={fullTitle}
            subtitles={trackerVideo.subtitles}
            episodes={sanitizedEpisodes}
            currentEpisode={sanitizedCurrentEpisode}
            series={{ id: video.id, title: video.title, slug: slugOrId }}
            autoplay={autoplayEnabled}
          />
        </div>
      </PlayerChrome>
    );
  }

  const movieHref = `/movies/${encodeURIComponent(slugOrId)}`;
  if (!hasPlayableSource(video)) {
    return (
      <UnavailablePlayerState
        title="Video Belum Tersedia"
        message="Video ini belum memiliki sumber streaming yang siap diputar."
        backHref={movieHref}
      />
    );
  }

  const trackerMovie = {
    id: video.id,
    title: video.title || "Untitled",
    type: video.type || "movie",
    slug: slugOrId,
    overview: video.overview || "",
    posterUrl: video.posterUrl || "",
    backdropUrl: video.backdropUrl || "",
    duration: video.duration || 0,
    orientation: video.orientation || "landscape",
    category: video.category || "",
    subtitles: video.subtitles || [],
    href: movieHref,
    watchHref: `/player?id=${encodeURIComponent(slugOrId)}&type=movie`,
  };

  return (
    <PlayerChrome>
      <div className="w-full max-w-[120rem]">
        <WatchPlayer
          key={video.id}
          video={{ ...trackerMovie, isPremium: Boolean(video.isPremium) }}
          backHref={trackerMovie.href}
          playbackId={video.playbackId || ""}
          src={video.isPremium ? "" : (video.streamUrl || "")}
          isPremium={Boolean(video.isPremium)}
          poster={video.backdropUrl || video.posterUrl}
          title={video.title}
          subtitles={video.subtitles}
          autoplay={autoplayEnabled}
        />
      </div>
    </PlayerChrome>
  );
}





