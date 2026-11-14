const buckets = new Map();
const MAX_BUCKETS = 5000;

function getClientIp(request) {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for") || "";
  if (vercelForwarded.trim()) {
    return vercelForwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip") || "";
  if (realIp.trim()) {
    return realIp.trim();
  }
  const forwarded = request.headers.get("x-forwarded-for") || "";
  if (forwarded.trim()) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }
  return "unknown";
}

function checkInMemory(bucketKey, limit, windowMs) {
  const now = Date.now();
  const existing = buckets.get(bucketKey);

  if (!existing || now >= existing.resetAt) {
    if (existing) buckets.delete(bucketKey);
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 2000) {
      for (const [k, v] of buckets.entries()) {
        if (now >= v.resetAt) buckets.delete(k);
      }
    }
    while (buckets.size > MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - existing.count), retryAfterSec: 0 };
}

export async function checkRateLimit(request, { key, namespace, limit = 20, windowMs = 60_000 } = {}) {
  const resolvedKey = key || namespace || "default";
  const ip = getClientIp(request);
  const bucketKey = `rl:${resolvedKey}:${ip}`;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
      const base = upstashUrl.replace(/\/+$/, "");
      const headers = {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      };
      const res = await fetch(`${base}/pipeline`, {
        method: "POST",
        headers,
        body: JSON.stringify([
          ["INCR", bucketKey],
          ["EXPIRE", bucketKey, windowSec, "NX"],
          ["TTL", bucketKey],
        ]),
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        const count = Number(data?.[0]?.result ?? 1);
        const rawTtl = Number(data?.[2]?.result ?? windowSec);
        if (rawTtl < 0) {
          fetch(`${base}/pipeline`, {
            method: "POST",
            headers,
            body: JSON.stringify([["EXPIRE", bucketKey, windowSec]]),
            cache: "no-store",
            signal: AbortSignal.timeout(2500),
          }).catch(() => {});
        }
        const ttl = rawTtl < 0 ? windowSec : Math.max(1, rawTtl);
        if (count > limit) {
          return { allowed: false, remaining: 0, retryAfterSec: ttl };
        }
        return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSec: 0 };
      }
    } catch {
      // Fallback ke in-memory jika Upstash gagal dijangkau
    }
  }

  return checkInMemory(bucketKey, limit, windowMs);
}
