import { getAdminDb } from './firebaseAdmin';
import { inferOrientationFromUrl } from './helpers';

const DEFAULT_POSTER_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="32" font-family="Arial, sans-serif">Poster</text></svg>';
const DEFAULT_BACKDROP_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="48" font-family="Arial, sans-serif">Kstream</text></svg>';

function buildMuxThumbnail(playbackId, { width = 300, height = 450, time = 2, fit = 'preserve' } = {}) {
  if (!playbackId) return '';
  return `https://image.mux.com/${playbackId}/thumbnail.png?width=${width}&height=${height}&time=${time}&fit_mode=${fit}`;
}

function buildMuxAnimated(playbackId, { width = 320, height = 320, start = 2, end = 7, fps = 12 } = {}) {
  if (!playbackId) return '';
  return `https://image.mux.com/${playbackId}/animated.gif?width=${width}&height=${height}&start=${start}&end=${end}&fps=${fps}`;
}

function ensureDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoString(value) {
  const date = ensureDate(value);
  return date ? date.toISOString() : null;
}

function parseSubtitles(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      lang: item.lang || item.language || 'id',
      label: item.label || item.title || (item.lang || item.language || '').toUpperCase(),
      url: item.url || item.src || '',
    }))
    .filter((item) => item.url);
}

function buildBaseItem(doc, data, overrides = {}) {
  const createdAt = ensureDate(data.createdAt || data.created_at);
  const updatedAt = ensureDate(data.updatedAt || data.updated_at || createdAt);
  const posterUrl = data.posterUrl || data.thumbnail || data.artworkUrl || '';
  const backdropUrl = data.backdropUrl || data.heroImage || data.backgroundUrl || posterUrl;
  const genres = Array.isArray(data.genres) && data.genres.length
    ? data.genres
    : data.category
      ? [data.category]
      : [];
  const type = overrides.type || data.type || 'movie';
  const slug = data.slug || doc.id;
  const encodedSlug = encodeURIComponent(slug);
  const detailHref = overrides.href || `/${type === 'series' ? 'series' : 'movies'}/${encodedSlug}`;
  const defaultWatchHref =
    overrides.watchHref ||
    `/player?id=${encodedSlug}&type=${type === 'series' ? 'series' : 'movie'}`;

  return {
    id: doc.id,
    slug,
    type,
    title: data.title || 'Untitled',
    overview: data.overview || data.synopsis || data.description || '',
    synopsis: data.description || data.overview || '',
    category: data.category || '',
    genres,
    tags: data.tags || [],
    posterUrl,
    backdropUrl,
    orientation: data.orientation || data.posterOrientation || inferOrientationFromUrl(posterUrl || data.thumbnail || ''),
    rating: data.rating || null,
    releaseDate: toIsoString(data.releaseDate || data.releasedAt || data.release_at || data.publishedAt),
    createdAt: toIsoString(createdAt),
    updatedAt: toIsoString(updatedAt),
    isPremium: data.isPremium || data.plan === 'premium' || false,
    subtitles: parseSubtitles(data.subtitles),
    href: detailHref,
    watchHref: defaultWatchHref,
    ...overrides,
  };
}

function mapMovieDoc(doc) {
  const data = doc.data() || {};
  const playbackId = data.mux_playback_id || data.mux_video_id || data.playbackId || '';
  const posterUrl = data.posterUrl || data.thumbnail || buildMuxThumbnail(playbackId, { width: 342, height: 513 }) || DEFAULT_POSTER_PLACEHOLDER;
  const backdropUrl = data.backdropUrl || data.heroImage || buildMuxThumbnail(playbackId, { width: 1280, height: 720 }) || DEFAULT_BACKDROP_PLACEHOLDER;
  const trailerFallback = buildMuxAnimated(playbackId);
  return buildBaseItem(doc, { ...data, posterUrl, backdropUrl }, {
    type: 'movie',
    playbackId,
    streamUrl: data.movieUrl || data.streamUrl || '',
    trailerUrl: data.trailer || data.trailerUrl || trailerFallback,
    duration: data.duration || 0,
    previewAnimation: trailerFallback,
  });
}

function mapEpisodeData(raw = {}, seriesId) {
  const id = raw.episodeId || raw.id || `${seriesId}-${raw.epNumber || raw.number || 0}`;
  const playbackId = raw.mux_playback_id || raw.mux_video_id || raw.playbackId || '';
  const thumbFallback = buildMuxThumbnail(playbackId, { width: 214, height: 121 });
  return {
    id,
    number: raw.epNumber ?? raw.number ?? 0,
    title: raw.title || `Episode ${raw.epNumber ?? raw.number ?? ''}`.trim(),
    overview: raw.description || raw.overview || '',
    playbackId,
    streamUrl: raw.streamUrl || raw.videoUrl || raw.fileUrl || raw.m3u8Url || '',
    duration: raw.duration || 0,
    subtitles: parseSubtitles(raw.subtitles),
    thumbnail: raw.thumbnail || thumbFallback,
    previewAnimation: raw.previewAnimation || buildMuxAnimated(playbackId),
    createdAt: toIsoString(raw.createdAt),
  };
}

function mapSeriesDoc(doc) {
  const data = doc.data() || {};
  const episodes = Array.isArray(data.episodes) ? data.episodes.map((ep) => mapEpisodeData(ep, doc.id)) : [];
  const fallbackEpisode = episodes.find((ep) => ep.playbackId) || {};
  const playbackId = data.mux_playback_id || data.playbackId || fallbackEpisode.playbackId || '';
  const posterUrl = data.posterUrl || data.thumbnail || fallbackEpisode.thumbnail || buildMuxThumbnail(playbackId, { width: 342, height: 513 }) || DEFAULT_POSTER_PLACEHOLDER;
  const backdropUrl = data.backdropUrl || data.heroImage || buildMuxThumbnail(playbackId, { width: 1280, height: 720 }) || DEFAULT_BACKDROP_PLACEHOLDER;
  const previewAnimation = buildMuxAnimated(playbackId);
  const encodedSlug = encodeURIComponent(doc.id);
  const primaryEpisode = episodes[0];
  const watchHref = primaryEpisode
    ? `/player?id=${encodedSlug}&type=series&ep=${encodeURIComponent(primaryEpisode.id)}`
    : `/player?id=${encodedSlug}&type=series`;
  return buildBaseItem(doc, { ...data, posterUrl, backdropUrl }, {
    type: 'series',
    playbackId,
    streamUrl: data.streamUrl || '',
    previewAnimation,
    episodes,
    watchHref,
    duration: data.duration || fallbackEpisode.duration || 0,
  });
}

async function fetchCollection(name) {
  const db = getAdminDb();
  const snapshot = await db.collection(name).get();
  return snapshot.docs;
}

function sortByRecency(items) {
  return items
    .slice()
    .sort((a, b) => {
      const dateA = ensureDate(a.updatedAt || a.createdAt) || new Date(0);
      const dateB = ensureDate(b.updatedAt || b.createdAt) || new Date(0);
      return dateB - dateA;
    });
}

async function getAllContent() {
  const [movieDocs, seriesDocs] = await Promise.all([
    fetchCollection('movies'),
    fetchCollection('series'),
  ]);
  const movies = movieDocs.map(mapMovieDoc);
  const series = seriesDocs.map(mapSeriesDoc);
  return { movies, series, combined: [...movies, ...series] };
}

export async function getPlatformSettings() {
  const db = getAdminDb();
  const doc = await db.collection('kstream-settings').doc('platform').get();
  if (!doc.exists) {
    return {
      hero: null,
      theme: { mode: 'dark' },
      categories: [],
    };
  }
  const data = doc.data() || {};
  return {
    hero: data.hero || null,
    theme: data.theme || { mode: 'dark' },
    categories: data.categories || [],
  };
}

export async function getTrending(limitCount = 12) {
  const { combined } = await getAllContent();
  return sortByRecency(combined).slice(0, limitCount);
}

export async function getNewReleases(limitCount = 12) {
  const { combined } = await getAllContent();
  return sortByRecency(combined).slice(0, limitCount);
}

export async function getVideosByGenre(genre, limitCount = 12, { excludeId } = {}) {
  if (!genre) return [];
  const genreLower = genre.toLowerCase();
  const { combined } = await getAllContent();
  const filtered = combined.filter((item) => {
    const haystack = [item.category, ...(item.genres || [])]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    return haystack.includes(genreLower);
  });
  const sorted = sortByRecency(filtered);
  const result = excludeId ? sorted.filter((item) => item.id !== excludeId) : sorted;
  return limitCount ? result.slice(0, limitCount) : result;
}

export async function searchVideos(query, limitCount = 20) {
  if (!query) return [];
  const queryLower = query.toLowerCase();
  const { combined } = await getAllContent();
  const matched = combined.filter((item) => {
    const fields = [item.title, item.overview, item.category, ...(item.tags || [])];
    return fields.filter(Boolean).some((field) => field.toLowerCase().includes(queryLower));
  });
  return sortByRecency(matched).slice(0, limitCount);
}

export async function getVideoById(idOrSlug) {
  if (!idOrSlug) return null;
  const db = getAdminDb();

  const [movieDoc, seriesDoc] = await Promise.all([
    db.collection('movies').doc(idOrSlug).get(),
    db.collection('series').doc(idOrSlug).get(),
  ]);

  if (movieDoc.exists) return mapMovieDoc(movieDoc);
  if (seriesDoc.exists) return mapSeriesDoc(seriesDoc);

  // Try slug lookup
  const movieSlug = await db.collection('movies').where('slug', '==', idOrSlug).limit(1).get();
  if (!movieSlug.empty) return mapMovieDoc(movieSlug.docs[0]);

  const seriesSlug = await db.collection('series').where('slug', '==', idOrSlug).limit(1).get();
  if (!seriesSlug.empty) return mapSeriesDoc(seriesSlug.docs[0]);

  return null;
}

export async function getSeriesEpisodes(seriesId) {
  const series = await getVideoById(seriesId);
  if (!series || series.type !== 'series') return [];
  return series.episodes || [];
}

export async function getSeriesEpisode(seriesId, episodeId) {
  if (!seriesId || !episodeId) return null;
  const episodes = await getSeriesEpisodes(seriesId);
  return episodes.find((episode) => episode.id === episodeId) || null;
}
