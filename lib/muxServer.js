import crypto from 'node:crypto';

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

  let pem = rawKey.replace(/\\n/g, '\n');
  if (!pem.includes('-----BEGIN')) {
    try {
      pem = Buffer.from(pem, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  if (!pem.includes('-----BEGIN')) return null;

  return { keyId, pem, restrictionId };
}

export function isMuxSigningConfigured() {
  return Boolean(resolveSigningConfig());
}

export function cleanMuxPlaybackId(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    const match = trimmed.match(/stream\.mux\.com\/([A-Za-z0-9]+)/i);
    return match ? match[1] : '';
  }
  return trimmed.replace(/\?.*$/, '').replace(/\.m3u8$/i, '');
}

export function signMuxPlaybackToken(
  playbackId,
  { audience = 'v', ttlSeconds = 14400, params = {} } = {}
) {
  const cleanId = cleanMuxPlaybackId(playbackId);
  const cfg = resolveSigningConfig();
  if (!cleanId || !cfg) return null;

  const header = base64UrlEncode(
    JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
      kid: cfg.keyId,
    })
  );

  const payloadObj = {
    sub: cleanId,
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    ...(cfg.restrictionId ? { playback_restriction_id: cfg.restrictionId } : {}),
    ...params,
  };

  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(cfg.pem, 'base64url');
  return `${signingInput}.${signature}`;
}

export function buildMuxStreamUrl(playbackId, { defaultLang = '', ttlSeconds = 14400 } = {}) {
  const cleanId = cleanMuxPlaybackId(playbackId);
  if (!cleanId) {
    return typeof playbackId === 'string' && /^https?:\/\//i.test(playbackId.trim())
      ? playbackId.trim()
      : '';
  }

  const token = signMuxPlaybackToken(cleanId, { audience: 'v', ttlSeconds });
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
  if (parsed.searchParams.has('token')) {
    return trimmed;
  }

  const params = {};
  for (const [key, val] of parsed.searchParams.entries()) {
    const num = Number(val);
    params[key] = val !== '' && Number.isFinite(num) ? num : val;
  }

  const audience = file.startsWith('animated') ? 'g' : file.startsWith('storyboard') ? 's' : 't';
  const token = signMuxPlaybackToken(pid, { audience, params });
  if (!token) return trimmed;
  return `https://image.mux.com/${pid}/${file}?token=${token}`;
}
