import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { ensureNeonSchema, getSql, isNeonConfigured } from "@/lib/neonDb";

let firestoreModule = null;

async function ensureFirestore() {
  if (!firestoreModule) {
    try {
      firestoreModule = await import("../../../../lib/firestoreServer");
    } catch (error) {
      console.warn("Firestore admin belum siap:", error?.message || error);
      return {
        getVideoById: async () => null,
      };
    }
  }
  return firestoreModule;
}

async function resolvePlaybackAuthorization(request, isPremiumContent) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { hasAuthHeader: false, authorized: false };
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token, true);
    if (!decoded?.uid) {
      return { hasAuthHeader: true, authorized: false };
    }
    if (!isPremiumContent) {
      return { hasAuthHeader: true, authorized: true };
    }
    if (!isNeonConfigured()) {
      return { hasAuthHeader: true, authorized: false };
    }
    await ensureNeonSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT role, plan, is_active, expires_at, data
      FROM users
      WHERE uid = ${decoded.uid}
      LIMIT 1
    `;
    if (!rows.length) {
      return { hasAuthHeader: true, authorized: false };
    }
    const row = rows[0];
    if (row.is_active === false || row.data?.status === "suspend") {
      return { hasAuthHeader: true, authorized: false };
    }
    const role = String(row.role || row.data?.role || "").toLowerCase();
    if (["super-admin", "admin", "editor"].includes(role)) {
      return { hasAuthHeader: true, authorized: true };
    }
    const plan = row.plan || row.data?.plan || "free";
    if (plan !== "premium") {
      return { hasAuthHeader: true, authorized: false };
    }
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : Date.parse(row.data?.expiresAt || "");
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return { hasAuthHeader: true, authorized: false };
    }
    return { hasAuthHeader: true, authorized: true };
  } catch {
    return { hasAuthHeader: true, authorized: false };
  }
}

function stripStreamUrls(video) {
  const episodes = Array.isArray(video.episodes)
    ? video.episodes.map(
        ({
          streamUrl: _epStream,
          playbackId: _epPlaybackId,
          mux_playback_id: _epMuxPlaybackId,
          mux_video_id: _epMuxVideoId,
          trailerUrl: _epTrailerUrl,
          previewAnimation: _epPreviewAnimation,
          ...epRest
        }) => epRest
      )
    : [];
  const {
    streamUrl: _stream,
    playbackId: _playbackId,
    mux_playback_id: _muxPlaybackId,
    mux_video_id: _muxVideoId,
    trailerUrl: _trailerUrl,
    previewAnimation: _previewAnimation,
    ...rest
  } = video;
  return {
    ...rest,
    episodes,
  };
}

export async function GET(request, context) {
  const rl = await checkRateLimit(request, { key: "media", limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { getVideoById } = await ensureFirestore();
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

  const { searchParams } = new URL(request.url);
  const preferredType = searchParams.get("type") || undefined;

  const video = await getVideoById(idOrSlug, preferredType).catch(() => null);

  if (!video) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const episodes = video.type === "series" && Array.isArray(video.episodes) ? video.episodes : [];
  const { hasAuthHeader, authorized } = await resolvePlaybackAuthorization(
    request,
    Boolean(video.isPremium)
  );

  const mediaPayload = authorized
    ? { ...video, episodes }
    : stripStreamUrls({ ...video, episodes });

  const cacheControl =
    authorized || hasAuthHeader
      ? "private, no-store"
      : "public, s-maxage=120, stale-while-revalidate=300";

  return NextResponse.json(
    { media: mediaPayload },
    {
      headers: {
        "Cache-Control": cacheControl,
        Vary: "Authorization",
      },
    }
  );
}
