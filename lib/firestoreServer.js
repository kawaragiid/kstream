import { ensureNeonSchema, getSql, isNeonConfigured } from './neonDb';
import { inferOrientationFromUrl } from './helpers';
import {
  buildMuxAnimatedUrl,
  buildMuxStreamUrl,
  buildMuxThumbnailUrl,
  isMuxSigningConfigured,
  resolveMuxImageUrl,
} from './muxServer';

const DEFAULT_POSTER_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="32" font-family="Arial, sans-serif">Poster</text></svg>';
const DEFAULT_BACKDROP_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="48" font-family="Arial, sans-serif">Kstream</text></svg>';

function buildMuxThumbnail(playbackId, { width = 300, height = 450, time = 2, fit = 'preserve' } = {}) {
  return buildMuxThumbnailUrl(playbackId, { width, height, time, fit });
}

function buildMuxAnimated(playbackId, { width = 320, height = 320, start = 2, end = 7, fps = 12 } = {}) {
  return buildMuxAnimatedUrl(playbackId, { width, height, start, end, fps });
}

function resolveMuxStreamUrl(rawUrl, playbackId) {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (isMuxSigningConfigured()) {
    if (playbackId && (!trimmed || /stream\.mux\.com/i.test(trimmed))) {
      return buildMuxStreamUrl(playbackId);
    }
    if (trimmed && /stream\.mux\.com/i.test(trimmed)) {
      return buildMuxStreamUrl(trimmed);
    }
  }
  return trimmed || '';
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
    maturityRating: data.maturityRating || null,
    releaseYear: data.releaseYear ? Number(data.releaseYear) : null,
    status: data.status || null,
    cast: Array.isArray(data.cast) ? data.cast.filter(Boolean) : [],
    director: data.director || null,
    country: data.country || null,
    language: data.language || null,
    totalSeasons: data.totalSeasons ? Number(data.totalSeasons) : 1,
    duration: data.duration ? Number(data.duration) : 0,
    views: Number(data.views || data.viewCount || 0),
    featured: Boolean(data.featured || data.isTrending || data.trending),
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
  const playbackId = data.mux_playback_id || data.muxPlaybackId || data.mux_video_id || data.muxVideoId || data.playbackId || '';
  const posterUrl =
    resolveMuxImageUrl(data.posterUrl || data.thumbnail, playbackId, { width: 342, height: 513 }) ||
    DEFAULT_POSTER_PLACEHOLDER;
  const backdropUrl =
    resolveMuxImageUrl(data.backdropUrl || data.heroImage, playbackId, { width: 1280, height: 720 }) ||
    DEFAULT_BACKDROP_PLACEHOLDER;
  const trailerFallback = buildMuxAnimated(playbackId);
  const rawTrailer = data.trailer || data.trailerUrl || '';
  const trailerUrl = rawTrailer
    ? (/stream\.mux\.com/i.test(rawTrailer)
      ? resolveMuxStreamUrl(rawTrailer, playbackId)
      : /image\.mux\.com/i.test(rawTrailer)
      ? resolveMuxImageUrl(rawTrailer, playbackId)
      : rawTrailer)
    : trailerFallback;
  return buildBaseItem(doc, { ...data, posterUrl, backdropUrl }, {
    type: 'movie',
    playbackId,
    streamUrl: resolveMuxStreamUrl(data.movieUrl || data.streamUrl || '', playbackId),
    trailerUrl,
    duration: data.duration || 0,
    previewAnimation: trailerFallback,
  });
}

function mapEpisodeData(raw = {}, seriesId) {
  const epNumber = raw.epNumber ?? raw.episodeNumber ?? raw.number ?? 0;
  const id = raw.episodeId || raw.id || `${seriesId}-${epNumber}`;
  const playbackId = raw.mux_playback_id || raw.muxPlaybackId || raw.mux_video_id || raw.muxVideoId || raw.playbackId || '';
  const thumbFallback = buildMuxThumbnail(playbackId, { width: 214, height: 121 });
  const rawStreamUrl = raw.streamUrl || raw.videoUrl || raw.fileUrl || raw.m3u8Url || '';
  return {
    id,
    seasonNumber: Number(raw.seasonNumber ?? raw.season_number ?? 1),
    number: Number(epNumber) || 0,
    title: raw.title || `Episode ${epNumber || ''}`.trim(),
    overview: raw.description || raw.overview || '',
    playbackId,
    streamUrl: resolveMuxStreamUrl(rawStreamUrl, playbackId),
    duration: raw.duration || 0,
    releaseDate: toIsoString(raw.releaseDate),
    subtitles: parseSubtitles(raw.subtitles),
    thumbnail: resolveMuxImageUrl(raw.thumbnail, playbackId, { width: 214, height: 121 }) || thumbFallback,
    previewAnimation: resolveMuxImageUrl(raw.previewAnimation, playbackId) || buildMuxAnimated(playbackId),
    createdAt: toIsoString(raw.createdAt),
  };
}

function mapSeriesDoc(doc) {
  const data = doc.data() || {};
  const episodes = Array.isArray(data.episodes) ? data.episodes.map((ep) => mapEpisodeData(ep, doc.id)) : [];
  const fallbackEpisode = episodes.find((ep) => ep.playbackId) || {};
  const playbackId = data.mux_playback_id || data.muxPlaybackId || data.playbackId || fallbackEpisode.playbackId || '';
  const posterUrl =
    resolveMuxImageUrl(data.posterUrl || data.thumbnail, playbackId, { width: 342, height: 513 }) ||
    fallbackEpisode.thumbnail ||
    DEFAULT_POSTER_PLACEHOLDER;
  const backdropUrl =
    resolveMuxImageUrl(data.backdropUrl || data.heroImage, playbackId, { width: 1280, height: 720 }) ||
    DEFAULT_BACKDROP_PLACEHOLDER;
  const previewAnimation = buildMuxAnimated(playbackId);
  const slug = data.slug || doc.id;
  const encodedSlug = encodeURIComponent(slug || doc.id);
  const primaryEpisode = episodes[0];
  const watchHref = primaryEpisode
    ? `/player?id=${encodedSlug}&type=series&ep=${encodeURIComponent(primaryEpisode.id)}`
    : `/player?id=${encodedSlug}&type=series`;
  return buildBaseItem(doc, { ...data, posterUrl, backdropUrl }, {
    type: 'series',
    playbackId,
    streamUrl: resolveMuxStreamUrl(data.streamUrl || '', playbackId),
    previewAnimation,
    episodes,
    watchHref,
    duration: data.duration || fallbackEpisode.duration || 0,
  });
}

function rowToDoc(row) {
  if (!row) return null;
  const rawData = row.data && typeof row.data === 'object' ? row.data : null;
  const movieUrl = row.movie_url || row.movieUrl || rawData?.movieUrl || '';
  const streamUrl = row.stream_url || row.streamUrl || rawData?.streamUrl || movieUrl || '';
  const data = {
    ...(rawData || {}),
    ...row,
    backdropUrl: row.backdrop_url || row.backdropUrl || rawData?.backdropUrl || '',
    movieUrl,
    streamUrl,
    releaseYear: row.release_year ?? row.releaseYear ?? rawData?.releaseYear ?? null,
    maturityRating: row.maturity_rating || row.maturityRating || rawData?.maturityRating || '',
    totalSeasons: row.total_seasons ?? row.totalSeasons ?? rawData?.totalSeasons ?? 1,
    cast: Array.isArray(row.cast_members)
      ? row.cast_members
      : Array.isArray(row.cast)
        ? row.cast
        : Array.isArray(rawData?.cast)
          ? rawData.cast
          : [],
    createdAt: row.created_at || row.createdAt || rawData?.createdAt,
    updatedAt: row.updated_at || row.updatedAt || rawData?.updatedAt,
  };
  return {
    id: row.id,
    data: () => data,
  };
}

async function fetchCollection(name) {
  if (!isNeonConfigured()) return [];
  await ensureNeonSchema();
  const sql = getSql();
  const rows =
    name === 'series'
      ? await sql`SELECT * FROM series ORDER BY updated_at DESC LIMIT 500`
      : await sql`SELECT * FROM movies ORDER BY updated_at DESC LIMIT 500`;
  return rows.map(rowToDoc);
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

const CACHE_TTL_MS = 5 * 60_000;
const ERROR_BACKOFF_MS = 10_000;
const EMPTY_CONTENT = { movies: [], series: [], combined: [] };
const DEFAULT_SETTINGS = { hero: null, theme: { mode: 'dark' }, categories: [] };

let contentCache = null;
let contentCacheExpiresAt = 0;
let inflightContentPromise = null;

let settingsCache = null;
let settingsCacheExpiresAt = 0;
let inflightSettingsPromise = null;

async function getAllContent() {
  const now = Date.now();
  if (contentCache && now < contentCacheExpiresAt) {
    return contentCache;
  }
  if (inflightContentPromise) {
    return inflightContentPromise;
  }

  inflightContentPromise = (async () => {
    try {
      const [movieDocs, seriesDocs] = await Promise.all([
        fetchCollection('movies'),
        fetchCollection('series'),
      ]);
      const movies = movieDocs.map(mapMovieDoc);
      const series = seriesDocs.map(mapSeriesDoc);
      const result = { movies, series, combined: [...movies, ...series] };
      contentCache = result;
      contentCacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return result;
    } catch (error) {
      console.warn('[firestoreServer] Gagal memuat katalog (fallback ke cache):', error?.message || error);
      if (!contentCache) contentCache = EMPTY_CONTENT;
      contentCacheExpiresAt = Date.now() + ERROR_BACKOFF_MS;
      return contentCache;
    } finally {
      inflightContentPromise = null;
    }
  })();

  return inflightContentPromise;
}

export async function getPlatformSettings() {
  const now = Date.now();
  if (settingsCache && now < settingsCacheExpiresAt) {
    return settingsCache;
  }
  if (inflightSettingsPromise) {
    return inflightSettingsPromise;
  }

  inflightSettingsPromise = (async () => {
    try {
      if (!isNeonConfigured()) {
        settingsCache = DEFAULT_SETTINGS;
        settingsCacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return DEFAULT_SETTINGS;
      }
      await ensureNeonSchema();
      const sql = getSql();
      const rows = await sql`SELECT data FROM platform_settings WHERE id = 'platform' LIMIT 1`;
      if (!rows.length) {
        settingsCache = DEFAULT_SETTINGS;
        settingsCacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return DEFAULT_SETTINGS;
      }
      const data = rows[0].data || {};
      const resolved = {
        hero: data.hero || null,
        theme: data.theme || { mode: 'dark' },
        categories: data.categories || [],
      };
      settingsCache = resolved;
      settingsCacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return resolved;
    } catch (error) {
      console.warn('[firestoreServer] Gagal memuat settings (fallback ke cache):', error?.message || error);
      if (!settingsCache) settingsCache = DEFAULT_SETTINGS;
      settingsCacheExpiresAt = Date.now() + ERROR_BACKOFF_MS;
      return settingsCache;
    } finally {
      inflightSettingsPromise = null;
    }
  })();

  return inflightSettingsPromise;
}

function computeTrendingScore(item) {
  const views = Number(item.views || 0);
  const featuredBonus = item.featured ? 1000 : 0;
  const ratingBonus = Number(item.rating || 0) * 50;
  const episodeBonus = Array.isArray(item.episodes) ? item.episodes.length * 10 : 0;
  return featuredBonus + views + ratingBonus + episodeBonus;
}

export async function getTrending(limitCount = 12) {
  const { combined } = await getAllContent();
  return combined
    .slice()
    .sort((a, b) => {
      const scoreDiff = computeTrendingScore(b) - computeTrendingScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      const dateA = ensureDate(a.updatedAt || a.createdAt) || new Date(0);
      const dateB = ensureDate(b.updatedAt || b.createdAt) || new Date(0);
      return dateB - dateA;
    })
    .slice(0, limitCount);
}

export async function getNewReleases(limitCount = 12) {
  const { combined } = await getAllContent();
  return combined
    .slice()
    .sort((a, b) => {
      const dateA = ensureDate(a.createdAt || a.releaseDate || a.updatedAt) || new Date(0);
      const dateB = ensureDate(b.createdAt || b.releaseDate || b.updatedAt) || new Date(0);
      return dateB - dateA;
    })
    .slice(0, limitCount);
}

function toSearchString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return String(value.name ?? value.label ?? value.title ?? '');
  }
  return String(value);
}

export async function getVideosByGenre(genre, limitCount = 12, { excludeId } = {}) {
  const genreLower = toSearchString(genre).trim().toLowerCase();
  if (!genreLower) return [];
  const { combined } = await getAllContent();
  const filtered = combined.filter((item) => {
    const genres = Array.isArray(item.genres) ? item.genres : [];
    const haystack = [item.category, ...genres]
      .map((value) => toSearchString(value).trim().toLowerCase())
      .filter(Boolean);
    return haystack.includes(genreLower);
  });
  const sorted = sortByRecency(filtered);
  const result = excludeId ? sorted.filter((item) => item.id !== excludeId) : sorted;
  return limitCount ? result.slice(0, limitCount) : result;
}

export async function searchVideos(query, limitCount = 20) {
  const queryLower = toSearchString(query).trim().toLowerCase();
  if (!queryLower) return [];
  const { combined } = await getAllContent();
  const matched = combined.filter((item) => {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const fields = [item.title, item.overview, item.category, ...tags];
    return fields.some((field) => toSearchString(field).toLowerCase().includes(queryLower));
  });
  return sortByRecency(matched).slice(0, limitCount);
}

export async function getVideoById(idOrSlug, preferredType) {
  if (!idOrSlug || typeof idOrSlug !== 'string') return null;
  const trimmed = idOrSlug.trim();
  if (!trimmed) return null;
  const normalizedType = typeof preferredType === 'string' ? preferredType.toLowerCase() : '';
  const preferSeries = normalizedType === 'series';

  // Use cached catalog first to save Firestore reads and survive quota limits
  const { movies, series } = await getAllContent();
  const matchItem = (item) => item.id === trimmed || item.slug === trimmed;
  if (preferSeries) {
    const matchedSeries = series.find(matchItem);
    if (matchedSeries) return matchedSeries;
    const matchedMovie = movies.find(matchItem);
    if (matchedMovie) return matchedMovie;
  } else {
    const matchedMovie = movies.find(matchItem);
    if (matchedMovie) return matchedMovie;
    const matchedSeries = series.find(matchItem);
    if (matchedSeries) return matchedSeries;
  }

  try {
    if (!isNeonConfigured()) return null;
    await ensureNeonSchema();
    const sql = getSql();

    const [movieRows, seriesRows] = await Promise.all([
      sql`SELECT * FROM movies WHERE id = ${trimmed} OR slug = ${trimmed} LIMIT 1`,
      sql`SELECT * FROM series WHERE id = ${trimmed} OR slug = ${trimmed} LIMIT 1`,
    ]);

    if (preferSeries) {
      if (seriesRows.length) return mapSeriesDoc(rowToDoc(seriesRows[0]));
      if (movieRows.length) return mapMovieDoc(rowToDoc(movieRows[0]));
    } else {
      if (movieRows.length) return mapMovieDoc(rowToDoc(movieRows[0]));
      if (seriesRows.length) return mapSeriesDoc(rowToDoc(seriesRows[0]));
    }
  } catch (error) {
    console.warn('[firestoreServer] getVideoById fallback:', error?.message || error);
  }

  return null;
}

export async function getSeriesEpisodes(seriesId) {
  const series = await getVideoById(seriesId, 'series');
  if (!series || series.type !== 'series') return [];
  return series.episodes || [];
}

export async function getSeriesEpisode(seriesId, episodeId) {
  if (!seriesId || !episodeId) return null;
  const episodes = await getSeriesEpisodes(seriesId);
  return episodes.find((episode) => episode.id === episodeId) || null;
}
