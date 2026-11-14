import { notFound, redirect } from "next/navigation";

let getVideoById;
let getSeriesEpisode;

async function ensureFirestore() {
  if (!getVideoById || !getSeriesEpisode) {
    try {
      ({ getVideoById, getSeriesEpisode } = await import("@/lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideoById = async () => null;
      getSeriesEpisode = async () => null;
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
  const series = await getVideoById(decodedId);
  if (!series || series.type !== "series") {
    notFound();
  }

  const targetEpisodeId = safeDecode(params.ep);
  if (targetEpisodeId) {
    const episode = await getSeriesEpisode(series.id, targetEpisodeId);
    if (!episode) {
      notFound();
    }
  }

  const slugOrId = series.slug || series.id;
  const searchParams = new URLSearchParams({ id: slugOrId, type: "series" });
  if (targetEpisodeId) {
    searchParams.set("ep", targetEpisodeId);
  }

  redirect(`/player?${searchParams.toString()}`);
}
