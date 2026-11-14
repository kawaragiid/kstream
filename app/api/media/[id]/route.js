import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

let firestoreModule = null;

async function ensureFirestore() {
  if (!firestoreModule) {
    try {
      firestoreModule = await import("../../../../lib/firestoreServer");
    } catch (error) {
      console.warn("Firestore admin belum siap:", error?.message || error);
      return {
        getVideoById: async () => null,
        getSeriesEpisodes: async () => [],
      };
    }
  }
  return firestoreModule;
}

export async function GET(request, context) {
  const rl = checkRateLimit(request, { key: "media", limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { getVideoById, getSeriesEpisodes } = await ensureFirestore();
  const awaitedParams = await context?.params;
  const rawId = awaitedParams?.id || "";
  let idOrSlug = rawId;
  try {
    idOrSlug = decodeURIComponent(rawId);
  } catch {
    return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  }

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

  return NextResponse.json(
    {
      media: {
        ...video,
        episodes,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    }
  );
}
