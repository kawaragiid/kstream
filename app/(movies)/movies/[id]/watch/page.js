
import { notFound, redirect } from "next/navigation";

let getVideoById;
let getSeriesEpisodes;

async function ensureFirestore() {
  if (!getVideoById || !getSeriesEpisodes) {
    try {
      ({ getVideoById, getSeriesEpisodes } = await import("@/lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideoById = async () => null;
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

export default async function MovieWatchRedirect(props) {
  const params = await props.params;
  await ensureFirestore();
  const decodedId = safeDecode(params.id);
  const video = await getVideoById(decodedId, "movie");

  if (!video) {
    notFound();
  }

  const slugOrId = video.slug || video.id;
  const type = video.type === "series" ? "series" : "movie";
  const searchParams = new URLSearchParams({ id: slugOrId, type });

  if (type === "series") {
    const episodes = await getSeriesEpisodes(video.id).catch(() => []);
    const primaryEpisode =
      episodes.find((ep) => ep?.playbackId || ep?.streamUrl) || episodes[0];
    if (primaryEpisode?.id) {
      searchParams.set("ep", primaryEpisode.id);
    }
  }

  redirect(`/player?${searchParams.toString()}`);
}
