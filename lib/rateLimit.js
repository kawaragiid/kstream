const buckets = new Map();

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function checkInMemory(bucketKey, limit, windowMs) {
  const now = Date.now();
  const existing = buckets.get(bucketKey);

  if (!existing || now >= existing.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 2000) {
      for (const [k, v] of buckets.entries()) {
        if (now >= v.resetAt) buckets.delete(k);
      }
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

export async function checkRateLimit(request, { key = "default", limit = 20, windowMs = 60_000 } = {}) {
  const ip = getClientIp(request);
  const bucketKey = `rl:${key}:${ip}`;
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
      });
      if (res.ok) {
        const data = await res.json();
        const count = Number(data?.[0]?.result ?? 1);
        const ttl = Math.max(1, Number(data?.[2]?.result ?? windowSec));
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
