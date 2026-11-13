// Mux integration helpers
// Wire these to your Mux account via env vars in .env.local

export function getMuxEnv() {
  if (typeof process === 'undefined' || !process.env) {
    return {};
  }
  return {
    MUX_TOKEN_ID: process.env.MUX_TOKEN_ID,
    MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET,
    MUX_SIGNING_KEY: process.env.MUX_SIGNING_KEY,
    MUX_SIGNING_KEY_ID: process.env.MUX_SIGNING_KEY_ID,
  };
}

// Example stub to create an Upload URL (replace with real Mux SDK or API call)
export async function createUploadUrl() {
  throw new Error('Mux not configured. Implement createUploadUrl with Mux SDK or API.');
}

// Generate a playback URL from a Mux playbackId or URL
export function getSignedPlaybackUrl(playbackId, defaultLang = 'en') {
  if (!playbackId || typeof playbackId !== 'string') return null;
  const trimmed = playbackId.trim();
  if (!trimmed) return null;
  const lang = defaultLang ? encodeURIComponent(defaultLang) : '';
  if (/^https?:\/\//i.test(trimmed)) {
    if (!lang || /[?&]default_subtitles_lang=/i.test(trimmed)) return trimmed;
    return `${trimmed}${trimmed.includes('?') ? '&' : '?'}default_subtitles_lang=${lang}`;
  }
  const cleanId = trimmed.replace(/\.m3u8(\?.*)?$/i, '');
  const existingQueryMatch = trimmed.match(/\?(.*)$/);
  const params = new URLSearchParams(existingQueryMatch ? existingQueryMatch[1] : '');
  if (lang && !params.has('default_subtitles_lang')) {
    params.set('default_subtitles_lang', defaultLang);
  }
  const queryString = params.toString();
  return `https://stream.mux.com/${cleanId}.m3u8${queryString ? `?${queryString}` : ''}`;
}
