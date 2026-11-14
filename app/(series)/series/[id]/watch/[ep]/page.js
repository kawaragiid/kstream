import { notFound, redirect } from "next/navigation";

let getVideoById;
let getSeriesEpisode;
let getSeriesEpisodes;

async function ensureFirestore() {
  if (!getVideoById || !getSeriesEpisode || !getSeriesEpisodes) {
    try {
      ({ getVideoById, getSeriesEpisode, getSeriesEpisodes } = await import("@/lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideoById = async () => null;
      getSeriesEpisode = async () => null;
      getSeriesEpisodes = async () => [];
    }
  }
}

function safeDecode(value) {
  if (typeof value !== "string") return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function SeriesWatchRedirect(props) {
  const params = await props.params;
  await ensureFirestore();

  const decodedId = safeDecode(params.id);
  const series = await getVideoById(decodedId, "series");
  if (!series || series.type !== "series") {
    notFound();
  }

  const targetEpisodeId = safeDecode(params.ep);
  let resolvedEpisodeId = targetEpisodeId;
  if (targetEpisodeId) {
    let episode = await getSeriesEpisode(series.id, targetEpisodeId);
    if (!episode) {
      const episodes = await getSeriesEpisodes(series.id).catch(() => []);
      episode = episodes.find(
        (ep) =>
          ep.id === targetEpisodeId ||
          ep.slug === targetEpisodeId ||
          String(ep.episodeNumber || ep.number) === String(targetEpisodeId)
      );
    }
    if (!episode) {
      notFound();
    }
    resolvedEpisodeId = episode.id || targetEpisodeId;
  }

  const slugOrId = series.slug || series.id;
  const searchParams = new URLSearchParams({ id: slugOrId, type: "series" });
  if (resolvedEpisodeId) {
    searchParams.set("ep", resolvedEpisodeId);
  }

  redirect(`/player?${searchParams.toString()}`);
}
