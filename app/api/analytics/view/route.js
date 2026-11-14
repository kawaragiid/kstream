import { NextResponse } from "next/server";
import { ensureNeonSchema, getSql, isNeonConfigured } from "@/lib/neonDb";
import { checkRateLimit } from "@/lib/rateLimit";

function buildDefaultSummary() {
  return {
    totals: { views: 0, watchTime: 0, subscribers: 0, revenue: 0 },
    growth: { views: 0, watchTime: 0, subscribers: 0, revenue: 0 },
    trend: [],
    trending: [],
    topContent: [],
    activeUsers: { daily: 0, weekly: 0, monthly: 0 },
    avgWatchDuration: { perUser: 0, perSession: 0 },
    audienceSplit: { free: 0, premium: 0 },
  };
}

export async function POST(request) {
  try {
    const rl = checkRateLimit(request, { key: "analytics-view", limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ ok: true, rateLimited: true });
    }
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const slug = String(body?.slug || id).trim();
    const type = body?.type === "series" ? "series" : "movie";
    const isNewView = Boolean(body?.isNewView);
    const watchSeconds = Math.max(0, Math.min(3600, Number(body?.watchSeconds) || 0));
    const watchMinutesDelta = watchSeconds / 60;

    if (!id && !slug) {
      return NextResponse.json({ error: "id or slug required" }, { status: 400 });
    }
    if (!isNeonConfigured()) {
      return NextResponse.json({ ok: true, skipped: "neon_not_configured" });
    }

    await ensureNeonSchema();
    const sql = getSql();

    if (isNewView) {
      if (type === "series") {
        await sql`
          UPDATE series
          SET views = COALESCE(views, 0) + 1, updated_at = NOW()
          WHERE id = ${id} OR slug = ${slug}
        `;
      } else {
        await sql`
          UPDATE movies
          SET views = COALESCE(views, 0) + 1, updated_at = NOW()
          WHERE id = ${id} OR slug = ${slug}
        `;
      }
    }

    if (isNewView || watchMinutesDelta > 0) {
      const existingRows = await sql`SELECT data FROM analytics_snapshots WHERE id = 'summary' LIMIT 1`;
      const prev = existingRows[0]?.data || {};
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

      const [topMovies, topSeries, userStats] = await Promise.all([
        sql`SELECT id, title, views, duration FROM movies ORDER BY views DESC NULLS LAST LIMIT 10`,
        sql`SELECT id, title, views FROM series ORDER BY views DESC NULLS LAST LIMIT 10`,
        sql`
          SELECT
            COUNT(*)::int AS total_users,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(plan, 'free')) = 'premium')::int AS premium_users
          FROM users
        `,
      ]);

      const combinedTop = [
        ...topMovies.map((m) => ({
          id: m.id,
          title: m.title,
          type: "movie",
          views: Number(m.views || 0),
          watchTime: Math.round(Number(m.views || 0) * Math.max(1, Math.round((Number(m.duration || 0) || 1800) / 60) * 0.6)),
          ctr: 0,
        })),
        ...topSeries.map((s) => ({
          id: s.id,
          title: s.title,
          type: "series",
          views: Number(s.views || 0),
          watchTime: Math.round(Number(s.views || 0) * 18),
          ctr: 0,
        })),
      ]
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      const totalUsers = Number(userStats[0]?.total_users || 0);
      const premiumUsers = Number(userStats[0]?.premium_users || 0);
      const freeUsers = Math.max(0, totalUsers - premiumUsers);

      const prevTotals = prev.totals || base.totals;
      const nextViews = Number(prevTotals.views || 0) + (isNewView ? 1 : 0);
      const nextWatchTime = Math.round((Number(prevTotals.watchTime || 0) + watchMinutesDelta) * 10) / 10;

      const updatedSummary = {
        ...base,
        ...prev,
        totals: {
          ...prevTotals,
          views: nextViews,
          watchTime: nextWatchTime,
          subscribers: premiumUsers,
        },
        trend: trimmedTrend,
        topContent: combinedTop,
        trending: combinedTop.filter((c) => c.type === "series").slice(0, 10),
        audienceSplit: {
          free: freeUsers,
          premium: premiumUsers,
        },
        avgWatchDuration: {
          perUser: totalUsers > 0 ? Math.round((nextWatchTime / totalUsers) * 10) / 10 : 0,
          perSession: nextViews > 0 ? Math.round((nextWatchTime / nextViews) * 10) / 10 : 0,
        },
      };

      await sql`
        INSERT INTO analytics_snapshots (id, data, updated_at)
        VALUES ('summary', ${JSON.stringify(updatedSummary)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[api/analytics/view] POST error:", error?.message || error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
