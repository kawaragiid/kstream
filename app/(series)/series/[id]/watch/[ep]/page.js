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

export default async function SeriesWatchRedirect(props) {
  const params = await props.params;
  await ensureFirestore();

  const series = await getVideoById(params.id);
  if (!series || series.type !== "series") {
    notFound();
  }

  const targetEpisodeId = params.ep;
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
