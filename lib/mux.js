// Placeholder Mux integration helpers (server-side only)
// Wire these to your Mux account via env vars in .env.local

export function getMuxEnv() {
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

// Example stub to generate a signed playback URL
export function getSignedPlaybackUrl(playbackId, defaultLang = 'en') {
  if (!playbackId) return null;
  const lang = defaultLang ? encodeURIComponent(defaultLang) : '';
  const query = lang ? `?default_subtitles_lang=${lang}` : '';
  return `https://stream.mux.com/${playbackId}.m3u8${query}`;
}
