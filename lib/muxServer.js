import crypto from 'node:crypto';

const RESERVED_JWT_CLAIMS = new Set([
  'sub',
  'aud',
  'exp',
  'iat',
  'nbf',
  'jti',
  'token',
  'playback_restriction_id',
]);

let cachedSigningConfig = null;
let cachedSigningEnvSignature = '';

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function resolveSigningConfig() {
  const keyId = (process.env.MUX_SIGNING_KEY_ID || '').trim();
  const rawKey = (process.env.MUX_SIGNING_KEY || '').trim();
  const restrictionId = (process.env.MUX_PLAYBACK_RESTRICTION_ID || '').trim();
  if (!keyId || !rawKey) return null;

  const envSig = `${keyId}:${rawKey}:${restrictionId}`;
  if (cachedSigningEnvSignature === envSig) {
    return cachedSigningConfig;
  }

  let pem = rawKey.replace(/\\n/g, '\n').trim();
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1).replace(/\\n/g, '\n').trim();
  }
  if (!pem.includes('-----BEGIN')) {
    try {
      pem = Buffer.from(pem, 'base64').toString('utf8').replace(/\\n/g, '\n').trim();
    } catch {
      cachedSigningEnvSignature = envSig;
      cachedSigningConfig = null;
      return null;
    }
  }
  if (!pem.includes('-----BEGIN')) {
    cachedSigningEnvSignature = envSig;
    cachedSigningConfig = null;
    return null;
  }

  try {
    const privateKey = crypto.createPrivateKey(pem);
    cachedSigningConfig = { keyId, privateKey, restrictionId };
    cachedSigningEnvSignature = envSig;
    return cachedSigningConfig;
  } catch (error) {
    console.warn('[muxServer] Invalid MUX_SIGNING_KEY PEM:', error?.message || error);
    cachedSigningEnvSignature = envSig;
    cachedSigningConfig = null;
    return null;
  }
}

export function isMuxSigningConfigured() {
  return Boolean(resolveSigningConfig());
}

export function cleanMuxPlaybackId(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (host === 'stream.mux.com') {
        const match = parsed.pathname.match(/^\/([A-Za-z0-9]+)(?:\.m3u8)?$/i);
        return match ? match[1] : '';
      }
      if (host === 'image.mux.com') {
        const match = parsed.pathname.match(/^\/([A-Za-z0-9]+)(?:\/[^/?#]+)?$/i);
        return match ? match[1] : '';
      }
      return '';
    } catch {
      return '';
    }
  }

  const candidate = trimmed.split('#')[0].split('?')[0].replace(/\.m3u8$/i, '').trim();
  return /^[A-Za-z0-9]+$/.test(candidate) ? candidate : '';
}

function sanitizeTokenParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const clean = {};
  for (const [key, val] of Object.entries(params)) {
    if (RESERVED_JWT_CLAIMS.has(key)) continue;
    if (val === undefined || val === null) continue;
    clean[key] = val;
  }
  return clean;
}

export function signMuxPlaybackToken(
  playbackId,
  { audience = 'v', ttlSeconds = 14400, params = {} } = {}
) {
  const cleanId = cleanMuxPlaybackId(playbackId);
  const cfg = resolveSigningConfig();
  if (!cleanId || !cfg) return null;

  try {
    const header = base64UrlEncode(
      JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
        kid: cfg.keyId,
      })
    );

    const safeParams = sanitizeTokenParams(params);
    const payloadObj = {
      ...safeParams,
      sub: cleanId,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      ...(cfg.restrictionId ? { playback_restriction_id: cfg.restrictionId } : {}),
    };

    const payload = base64UrlEncode(JSON.stringify(payloadObj));
    const signingInput = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(cfg.privateKey, 'base64url');
    return `${signingInput}.${signature}`;
  } catch (error) {
    console.warn('[muxServer] Failed to sign Mux playback token:', error?.message || error);
    return null;
  }
}

export function buildMuxStreamUrl(playbackId, { defaultLang = '', ttlSeconds = 14400 } = {}) {
  const cleanId = cleanMuxPlaybackId(playbackId);
  if (!cleanId) {
    if (typeof playbackId !== 'string') return '';
    const trimmed = playbackId.trim();
    if (!/^https?:\/\//i.test(trimmed)) return '';
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
      const host = parsed.hostname.toLowerCase();
      if (host === 'stream.mux.com' || host === 'image.mux.com') return '';
      return parsed.toString();
    } catch {
      return '';
    }
  }

  const token = signMuxPlaybackToken(cleanId, { audience: 'v', ttlSeconds });
  if (!token && process.env.MUX_PLAYBACK_POLICY !== 'public') {
    return null;
  }
  const params = new URLSearchParams();
  if (token) {
    params.set('token', token);
  }
  if (defaultLang) {
    params.set('default_subtitles_lang', defaultLang);
  }
  const qs = params.toString();
  return `https://stream.mux.com/${cleanId}.m3u8${qs ? `?${qs}` : ''}`;
}

export function buildMuxThumbnailUrl(
  playbackId,
  { width = 300, height = 450, time = 2, fit = 'preserve', ttlSeconds = 14400 } = {}
) {
  const cleanId = cleanMuxPlaybackId(playbackId);
  if (!cleanId) return '';

  const token = signMuxPlaybackToken(cleanId, {
    audience: 't',
    ttlSeconds,
    params: {
      width,
      height,
      time,
      fit_mode: fit,
    },
  });

  if (token) {
    return `https://image.mux.com/${cleanId}/thumbnail.png?token=${token}`;
  }
  if (process.env.MUX_PLAYBACK_POLICY !== 'public') {
    return null;
  }
  return `https://image.mux.com/${cleanId}/thumbnail.png?width=${width}&height=${height}&time=${time}&fit_mode=${fit}`;
}

export function buildMuxAnimatedUrl(
  playbackId,
  { width = 320, height = 320, start = 2, end = 7, fps = 12, ttlSeconds = 14400 } = {}
) {
  const cleanId = cleanMuxPlaybackId(playbackId);
  if (!cleanId) return '';

  const token = signMuxPlaybackToken(cleanId, {
    audience: 'g',
    ttlSeconds,
    params: {
      width,
      height,
      start,
      end,
      fps,
    },
  });

  if (token) {
    return `https://image.mux.com/${cleanId}/animated.gif?token=${token}`;
  }
  if (process.env.MUX_PLAYBACK_POLICY !== 'public') {
    return null;
  }
  return `https://image.mux.com/${cleanId}/animated.gif?width=${width}&height=${height}&start=${start}&end=${end}&fps=${fps}`;
}

export function resolveMuxImageUrl(rawUrl, fallbackPlaybackId = '', fallbackOpts = {}) {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) {
    return fallbackPlaybackId ? buildMuxThumbnailUrl(fallbackPlaybackId, fallbackOpts) : '';
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (!/^(?:image\.mux\.com)$/i.test(parsed.hostname)) {
    return trimmed;
  }

  const match = parsed.pathname.match(/^\/([A-Za-z0-9]+)\/([^/?#]+)$/);
  if (!match) return trimmed;

  const [, pid, file] = match;
  if (!isMuxSigningConfigured()) {
    return trimmed;
  }

  const params = {};
  for (const [key, val] of parsed.searchParams.entries()) {
    if (RESERVED_JWT_CLAIMS.has(key)) continue;
    const trimmedVal = val.trim();
    const num = Number(trimmedVal);
    params[key] = trimmedVal !== '' && Number.isFinite(num) ? num : val;
  }

  const audience = file.startsWith('animated') ? 'g' : file.startsWith('storyboard') ? 's' : 't';
  const token = signMuxPlaybackToken(pid, { audience, params });
  if (!token) return trimmed;
  return `https://image.mux.com/${pid}/${file}?token=${token}`;
}
