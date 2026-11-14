import { NextResponse } from "next/server";
import { ensureNeonSchema, getSql, isNeonConfigured } from "@/lib/neonDb";
import { checkRateLimit } from "@/lib/rateLimit";

const SNAPSHOT_REBUILD_INTERVAL_MS = 60_000;
let lastSnapshotRebuildAt = 0;

function buildDefaultSummary() {
  return {
    totals: { views: 0, watchTime: 0, totalUsers: 0 },
    growth: { views: 0, watchTime: 0 },
    trend: [],
    trending: [],
    topContent: [],
    activeUsers: { daily: 0, weekly: 0, monthly: 0 },
    avgWatchDuration: { perUser: 0, perSession: 0 },
  };
}

export async function POST(request) {
  try {
    const rl = await checkRateLimit(request, { key: "analytics-view", limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim().slice(0, 128);
    const slug = String(body?.slug || id).trim().slice(0, 200);
    const type = body?.type === "series" ? "series" : "movie";
    const isNewView = Boolean(body?.isNewView);
    const rawWatchSeconds = Number(body?.watchSeconds);
    const watchSeconds = Number.isFinite(rawWatchSeconds)
      ? Math.max(0, Math.min(300, rawWatchSeconds))
      : 0;
    const watchMinutesDelta = watchSeconds / 60;

    if (!id && !slug) {
      return NextResponse.json({ error: "id or slug required" }, { status: 400 });
    }
    if (!isNeonConfigured()) {
      return NextResponse.json({ ok: true, skipped: "neon_not_configured" });
    }

    await ensureNeonSchema();
    const sql = getSql();

    // Verify content exists before updating views or global analytics totals
    const matchedRows =
      type === "series"
        ? await sql`
            SELECT id FROM series
            WHERE (${id} <> '' AND id = ${id}) OR (${slug} <> '' AND slug = ${slug})
            ORDER BY (${id} <> '' AND id = ${id}) DESC, updated_at DESC
            LIMIT 1
          `
        : await sql`
            SELECT id FROM movies
            WHERE (${id} <> '' AND id = ${id}) OR (${slug} <> '' AND slug = ${slug})
            ORDER BY (${id} <> '' AND id = ${id}) DESC, updated_at DESC
            LIMIT 1
          `;

    const resolvedContentId = matchedRows[0]?.id;
    if (!resolvedContentId) {
      return NextResponse.json({ ok: false, error: "Content not found" }, { status: 404 });
    }

    if (isNewView) {
      if (type === "series") {
        await sql`
          UPDATE series
          SET views = COALESCE(views, 0) + 1
          WHERE id = ${resolvedContentId}
        `;
      } else {
        await sql`
          UPDATE movies
          SET views = COALESCE(views, 0) + 1
          WHERE id = ${resolvedContentId}
        `;
      }
    }

    if (isNewView || watchMinutesDelta > 0) {
      const now = Date.now();
      const shouldRebuildHeavy = now - lastSnapshotRebuildAt >= SNAPSHOT_REBUILD_INTERVAL_MS;

      await sql.transaction(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(72819402)`;
        const existingRows = await tx`SELECT data FROM analytics_snapshots WHERE id = 'summary' LIMIT 1`;
        const prev = existingRows[0]?.data || {};
        const hasSummary = Boolean(existingRows.length > 0 && existingRows[0]?.data && prev.totals);
        const base = buildDefaultSummary();
        const todayKey = new Date().toISOString().slice(0, 10);

        const prevTrend = Array.isArray(prev.trend) ? [...prev.trend] : [];
        const todayIdx = prevTrend.findIndex((item) => item?.date === todayKey);
        if (todayIdx >= 0) {
          prevTrend[todayIdx] = {
            ...prevTrend[todayIdx],
            views: Number(prevTrend[todayIdx].views || 0) + (isNewView ? 1 : 0),
            watchTime: Math.round((Number(prevTrend[todayIdx].watchTime || 0) + watchMinutesDelta) * 10) / 10,
          };
        } else {
          prevTrend.push({
            date: todayKey,
            views: isNewView ? 1 : 0,
            watchTime: Math.round(watchMinutesDelta * 10) / 10,
          });
        }
        const trimmedTrend = prevTrend.slice(-14);

        const prevTotals = prev.totals || base.totals;
        const nextViews = Number(prevTotals.views || 0) + (isNewView ? 1 : 0);
        const nextWatchTime = Math.round((Number(prevTotals.watchTime || 0) + watchMinutesDelta) * 10) / 10;

        const prevTopMap = new Map(
          (Array.isArray(prev.topContent) ? prev.topContent : [])
            .filter((item) => item?.id)
            .map((item) => [`${item.type || "movie"}:${item.id}`, item])
        );

        let combinedTop = Array.isArray(prev.topContent) ? [...prev.topContent] : [];
        let trending = Array.isArray(prev.trending) ? [...prev.trending] : [];
        let totalUsers = Number(prevTotals.totalUsers || 0);

        if (!hasSummary || shouldRebuildHeavy) {
          const [topMovies, topSeries, userStats] = await Promise.all([
            tx`SELECT id, title, views, duration FROM movies ORDER BY views DESC NULLS LAST LIMIT 10`,
            tx`SELECT id, title, views FROM series ORDER BY views DESC NULLS LAST LIMIT 10`,
            tx`SELECT COUNT(*)::int AS total_users FROM users`,
          ]);

          combinedTop = [
            ...topMovies.map((m) => {
              const prevEntry = prevTopMap.get(`movie:${m.id}`);
              const baseWatch = Number(prevEntry?.watchTime || 0);
              const delta = m.id === resolvedContentId && type === "movie" ? watchMinutesDelta : 0;
              return {
                id: m.id,
                title: m.title,
                type: "movie",
                views: Number(m.views || 0),
                watchTime: Math.round((baseWatch + delta) * 10) / 10,
                ctr: Number(prevEntry?.ctr || 0),
              };
            }),
            ...topSeries.map((s) => {
              const prevEntry = prevTopMap.get(`series:${s.id}`);
              const baseWatch = Number(prevEntry?.watchTime || 0);
              const delta = s.id === resolvedContentId && type === "series" ? watchMinutesDelta : 0;
              return {
                id: s.id,
                title: s.title,
                type: "series",
                views: Number(s.views || 0),
                watchTime: Math.round((baseWatch + delta) * 10) / 10,
                ctr: Number(prevEntry?.ctr || 0),
              };
            }),
          ]
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

          trending = combinedTop.slice(0, 10);
          totalUsers = Number(userStats[0]?.total_users || 0);
          lastSnapshotRebuildAt = Date.now();
        } else {
          combinedTop = combinedTop.map((item) => {
            if (item?.id === resolvedContentId && item?.type === type) {
              return {
                ...item,
                views: Number(item.views || 0) + (isNewView ? 1 : 0),
                watchTime: Math.round((Number(item.watchTime || 0) + watchMinutesDelta) * 10) / 10,
              };
            }
            return item;
          });
          trending = combinedTop.slice(0, 10);
        }

        const updatedSummary = {
          ...base,
          ...prev,
          totals: {
            ...prevTotals,
            views: nextViews,
            watchTime: nextWatchTime,
            totalUsers,
          },
          trend: trimmedTrend,
          topContent: combinedTop,
          trending,
          avgWatchDuration: {
            perUser: totalUsers > 0 ? Math.round((nextWatchTime / totalUsers) * 10) / 10 : 0,
            perSession: nextViews > 0 ? Math.round((nextWatchTime / nextViews) * 10) / 10 : 0,
          },
        };

        await tx`
          INSERT INTO analytics_snapshots (id, data, updated_at)
          VALUES ('summary', ${JSON.stringify(updatedSummary)}::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `;
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[api/analytics/view] POST error:", error?.message || error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
