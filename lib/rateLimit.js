import net from "node:net";

const buckets = new Map();
const MAX_BUCKETS = 5000;
let warnedNoUpstash = false;

function hashString(input) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(36)}-${h2.toString(36)}`;
}

function isPlausibleIp(value) {
  return Boolean(value && value.length <= 64 && net.isIP(value) !== 0);
}

function getClientIp(request) {
  // Only trust Vercel-injected headers when actually running on Vercel.
  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    const realIp = (request.headers.get("x-real-ip") || "").trim();
    if (isPlausibleIp(realIp)) {
      return realIp;
    }
    const vercelForwarded = request.headers.get("x-vercel-forwarded-for") || "";
    const firstVercelIp = vercelForwarded.split(",")[0]?.trim();
    if (isPlausibleIp(firstVercelIp)) {
      return firstVercelIp;
    }
  }

  if (typeof request.ip === "string" && isPlausibleIp(request.ip.trim())) {
    return request.ip.trim();
  }

  const realIpFallback = (request.headers.get("x-real-ip") || "").trim();
  if (isPlausibleIp(realIpFallback)) {
    return realIpFallback;
  }

  const forwarded = request.headers.get("x-forwarded-for") || "";
  if (forwarded.trim()) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(isPlausibleIp);
    if (parts.length > 0) {
      // Rightmost IP is appended by the nearest trusted proxy.
      return parts[parts.length - 1];
    }
  }

  const ua = request.headers.get("user-agent") || "";
  const acceptLang = request.headers.get("accept-language") || "";
  return `anon:${hashString(`${ua}|${acceptLang}`)}`;
}

function evictOneBucket(now) {
  for (const [k, v] of buckets.entries()) {
    if (now >= v.resetAt) buckets.delete(k);
  }
  if (buckets.size < MAX_BUCKETS) return;

  // Prefer evicting least-recently-used low-count entries so active/blocked attackers cannot
  // evict their own blocked bucket by flooding 5000 spoofed IPs.
  let candidateKey;
  for (const [k, v] of buckets.entries()) {
    if (v.count <= 1) {
      candidateKey = k;
      break;
    }
    if (candidateKey === undefined) candidateKey = k;
  }
  if (candidateKey !== undefined) {
    buckets.delete(candidateKey);
  }
}

function checkInMemory(bucketKey, limit, windowMs) {
  const now = Date.now();
  const existing = buckets.get(bucketKey);

  if (!existing || now >= existing.resetAt) {
    if (existing) buckets.delete(bucketKey);
    if (buckets.size >= MAX_BUCKETS) {
      evictOneBucket(now);
    }
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSec: 0 };
  }

  // Refresh LRU position in Map on every hit.
  buckets.delete(bucketKey);
  buckets.set(bucketKey, existing);

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
          await fetch(`${base}/pipeline`, {
            method: "POST",
            headers,
            body: JSON.stringify([["EXPIRE", bucketKey, windowSec]]),
            cache: "no-store",
            signal: AbortSignal.timeout(2500),
          }).catch((expireErr) => {
            console.warn("[rateLimit] Failed to set fallback EXPIRE:", expireErr?.message || expireErr);
          });
        }
        const ttl = rawTtl < 0 ? windowSec : Math.max(1, rawTtl);
        if (count > limit) {
          return { allowed: false, remaining: 0, retryAfterSec: ttl };
        }
        return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSec: 0 };
      }
      console.warn(`[rateLimit] Upstash Redis returned HTTP ${res.status}; falling back to in-memory.`);
    } catch (error) {
      console.warn("[rateLimit] Upstash Redis error; falling back to in-memory:", error?.message || error);
    }
  } else if (process.env.NODE_ENV === "production" && !warnedNoUpstash) {
    warnedNoUpstash = true;
    console.warn("[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set; using per-instance in-memory rate limit.");
  }

  return checkInMemory(bucketKey, limit, windowMs);
}
