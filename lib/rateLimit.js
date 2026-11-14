const buckets = new Map();

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(request, { key = "default", limit = 20, windowMs = 60_000 } = {}) {
  const ip = getClientIp(request);
  const bucketKey = `${key}:${ip}`;
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
