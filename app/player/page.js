import { notFound } from "next/navigation";
import WatchPlayer from "@/components/WatchPlayer";

let getVideoById;
let getSeriesEpisodes;
let getSeriesEpisode;

async function ensureFirestore() {
  if (!getVideoById || !getSeriesEpisodes || !getSeriesEpisode) {
    try {
      ({ getVideoById, getSeriesEpisodes, getSeriesEpisode } = await import("../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideoById = async () => null;
      getSeriesEpisodes = async () => [];
      getSeriesEpisode = async () => null;
    }
  }
}

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

function PlayerChrome({ children }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-start md:justify-center bg-black text-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="w-full max-w-[120rem] px-0 sm:px-4">{children}</div>
    </div>
  );
}

export default async function PlayerPage(props) {
  const searchParams = props?.searchParams ?? {};
  await ensureFirestore();

  const rawId = extractParam(searchParams, "id");
  const rawType = extractParam(searchParams, "type");
  const rawEpisode = extractParam(searchParams, "ep");
  const rawAutoplay = extractParam(searchParams, "autoplay");

  const resolvedId = decodeParam(rawId);
  if (!resolvedId) notFound();

  const normalizedType = (rawType || "").toString().toLowerCase();
  const isSeriesRequest = normalizedType === "series";

  const video = await getVideoById(resolvedId);
  if (!video) notFound();

  const slugOrId = video.slug || video.id;
  const autoplayEnabled = rawAutoplay === "1" || (rawAutoplay || "").toLowerCase() === "true";

  if (isSeriesRequest || video.type === "series") {
    const episodes = await getSeriesEpisodes(video.id);
    if (!episodes?.length) notFound();

    const episodeId = decodeParam(rawEpisode);
    let currentEpisode = null;

    if (episodeId) {
      currentEpisode = await getSeriesEpisode(video.id, episodeId);
    }
    if (!currentEpisode) {
      currentEpisode = episodes[0];
    }
    if (!currentEpisode) notFound();

    const currentEpisodeId = currentEpisode.id;
    const seriesHref = `/series/${encodeURIComponent(slugOrId)}`;
    const watchHref = `/player?id=${encodeURIComponent(slugOrId)}&type=series&ep=${encodeURIComponent(currentEpisodeId)}`;
    const trackerVideo = {
      id: `${video.id}-${currentEpisodeId}`,
      title: `${video.title} \u2022 Episode ${currentEpisode.number}`,
      type: "series",
      slug: slugOrId,
      overview: currentEpisode.overview || video.overview,
      posterUrl: video.posterUrl,
      duration: currentEpisode.duration || video.duration || 0,
      href: seriesHref,
      watchHref,
      category: video.category,
      subtitles: currentEpisode.subtitles?.length ? currentEpisode.subtitles : video.subtitles || [],
    };

    return (
      <PlayerChrome>
        <div className="w-full max-w-[120rem]">
          <WatchPlayer
            video={trackerVideo}
            backHref={seriesHref}
            playbackId={currentEpisode.playbackId || video.playbackId}
            src={currentEpisode.streamUrl || video.streamUrl}
            poster={currentEpisode.thumbnail || video.backdropUrl || video.posterUrl}
            title={`${video.title} \u2022 Episode ${currentEpisode.number}`}
            subtitles={trackerVideo.subtitles}
            episodes={episodes}
            currentEpisode={currentEpisode}
            series={video}
            autoplay={autoplayEnabled}
          />
        </div>
      </PlayerChrome>
    );
  }

  const trackerMovie = {
    ...video,
    href: `/movies/${encodeURIComponent(slugOrId)}`,
    watchHref: `/player?id=${encodeURIComponent(slugOrId)}&type=movie`,
  };

  return (
    <PlayerChrome>
      <div className="w-full max-w-[120rem]">
        <WatchPlayer
          video={trackerMovie}
          backHref={trackerMovie.href}
          playbackId={video.playbackId}
          src={video.streamUrl}
          poster={video.backdropUrl || video.posterUrl}
          title={video.title}
          subtitles={video.subtitles}
          autoplay={autoplayEnabled}
        />
      </div>
    </PlayerChrome>
  );
}





