import { NextResponse } from "next/server";

let getVideoById;
let getSeriesEpisodes;

async function ensureFirestore() {
  if (!getVideoById) {
    try {
      const firestore = await import("../../../../lib/firestoreServer");
      getVideoById = firestore.getVideoById;
      getSeriesEpisodes = firestore.getSeriesEpisodes;
    } catch (error) {
      console.warn("Firestore admin belum siap:", error?.message || error);
      getVideoById = async () => null;
      getSeriesEpisodes = async () => [];
    }
  }
}

export async function GET(_request, context) {
  await ensureFirestore();
  const awaitedParams = await context?.params;
  const idOrSlug = decodeURIComponent(awaitedParams?.id || "");

  if (!idOrSlug) {
    return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  }

  const video = await getVideoById(idOrSlug).catch(() => null);

  if (!video) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  let episodes = [];
  if (video.type === "series") {
    episodes = await getSeriesEpisodes(video.id).catch(() => []);
  }

  return NextResponse.json({
    media: {
      ...video,
      episodes,
    },
  });
}
