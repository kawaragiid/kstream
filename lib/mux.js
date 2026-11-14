// Client-safe Mux playback URL helpers.
// Server-side RS256 signing lives in lib/muxServer.js.

/**
 * Build a Mux HLS playback URL from a playbackId or existing stream URL.
 * Preserves existing query parameters (including signed `token`) and `#fragment`.
 * Note: Cryptographic signing must happen server-side via `buildMuxStreamUrl` in `lib/muxServer.js`.
 */
export function getSignedPlaybackUrl(playbackId, defaultLang = 'en') {
  if (!playbackId || typeof playbackId !== 'string') return null;
  const trimmed = playbackId.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (defaultLang && !parsed.searchParams.has('default_subtitles_lang')) {
        parsed.searchParams.set('default_subtitles_lang', defaultLang);
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  const [beforeHash, hashPart = ''] = trimmed.split('#', 2);
  const [rawId, rawQuery = ''] = beforeHash.split('?', 2);
  const cleanId = rawId.replace(/\.m3u8$/i, '').trim();
  if (!cleanId || !/^[A-Za-z0-9_-]+$/.test(cleanId)) return null;

  const existing = rawQuery ? new URLSearchParams(rawQuery) : new URLSearchParams();
  const isPublicPolicy =
    process.env.NEXT_PUBLIC_MUX_PLAYBACK_POLICY === 'public' ||
    process.env.MUX_PLAYBACK_POLICY === 'public';
  if (!existing.has('token') && !isPublicPolicy) {
    return '';
  }

  const url = new URL(`https://stream.mux.com/${cleanId}.m3u8`);
  for (const [k, v] of existing.entries()) {
    url.searchParams.set(k, v);
  }
  if (defaultLang && !url.searchParams.has('default_subtitles_lang')) {
    url.searchParams.set('default_subtitles_lang', defaultLang);
  }
  if (hashPart) {
    url.hash = hashPart;
  }
  return url.toString();
}
