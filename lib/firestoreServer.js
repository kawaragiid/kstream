import { cache } from 'react';
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

function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildMuxThumbnail(playbackId, { width = 300, height = 450, time = 2, fit = 'preserve' } = {}) {
  return buildMuxThumbnailUrl(playbackId, { width, height, time, fit }) || '';
}

function buildMuxAnimated(playbackId, { width = 320, height = 320, start = 2, end = 7, fps = 12 } = {}) {
  return buildMuxAnimatedUrl(playbackId, { width, height, start, end, fps }) || '';
}

function resolveMuxStreamUrl(rawUrl, playbackId) {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  const allowPublic = process.env.MUX_PLAYBACK_POLICY === 'public';
  if (isMuxSigningConfigured()) {
    if (playbackId && (!trimmed || /stream\.mux\.com/i.test(trimmed))) {
      return buildMuxStreamUrl(playbackId) || '';
    }
    if (trimmed && /stream\.mux\.com/i.test(trimmed)) {
      return buildMuxStreamUrl(trimmed) || '';
    }
  }
  if (trimmed) {
    if (/stream\.mux\.com/i.test(trimmed) && !allowPublic) {
      let hasToken = false;
      try {
        hasToken = new URL(trimmed).searchParams.has('token');
      } catch {}
      if (!hasToken) {
        console.warn('[firestoreServer] Mux signing not configured; refusing unsigned stream.mux.com URL.');
        return '';
      }
    }
    return trimmed;
  }
  if (playbackId) {
    const built = buildMuxStreamUrl(playbackId);
    if (!built) {
      console.warn('[firestoreServer] Mux signing not configured; cannot build stream URL for playbackId:', playbackId);
      return '';
    }
    return built;
  }
  return '';
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
    synopsis: data.description || data.synopsis || data.overview || '',
    description: data.description || data.overview || data.synopsis || '',
    category: data.category || '',
    genres,
    tags: data.tags || [],
    posterUrl,
    backdropUrl,
    orientation: data.orientation || data.posterOrientation || inferOrientationFromUrl(posterUrl || data.thumbnail || ''),
    rating: toNullableNumber(data.rating),
    maturityRating: data.maturityRating || null,
    releaseYear: toNullableNumber(data.releaseYear),
    status: data.status || null,
    cast: Array.isArray(data.cast) ? data.cast.filter(Boolean) : [],
    director: data.director || null,
    country: data.country || null,
    language: data.language || null,
    totalSeasons: Math.max(1, Math.floor(toFiniteNumber(data.totalSeasons, 1))),
    duration: Math.max(0, toFiniteNumber(data.duration, 0)),
    views: Math.max(0, toFiniteNumber(data.views ?? data.viewCount, 0)),
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
      ? resolveMuxStreamUrl(rawTrailer, '')
      : /image\.mux\.com/i.test(rawTrailer)
      ? resolveMuxImageUrl(rawTrailer, playbackId)
      : rawTrailer)
    : trailerFallback;
  return buildBaseItem(doc, { ...data, posterUrl, backdropUrl }, {
    type: 'movie',
    playbackId,
    streamUrl: resolveMuxStreamUrl(data.movieUrl || data.streamUrl || '', playbackId),
    trailerUrl,
    duration: toFiniteNumber(data.duration, 0),
    previewAnimation: trailerFallback,
  });
}

function mapEpisodeData(raw = {}, seriesId) {
  const seasonNumber = Math.max(1, Math.floor(toFiniteNumber(raw.seasonNumber ?? raw.season_number, 1)));
  const epNumber = toFiniteNumber(raw.epNumber ?? raw.episodeNumber ?? raw.number, 0);
  const id = raw.episodeId || raw.id || `${seriesId}-s${seasonNumber}-e${epNumber}`;
  const playbackId = raw.mux_playback_id || raw.muxPlaybackId || raw.mux_video_id || raw.muxVideoId || raw.playbackId || '';
  const thumbFallback = buildMuxThumbnail(playbackId, { width: 214, height: 121 });
  const rawStreamUrl = raw.streamUrl || raw.videoUrl || raw.fileUrl || raw.m3u8Url || '';
  return {
    id,
    ...(raw.slug ? { slug: raw.slug } : {}),
    seasonNumber,
    number: epNumber,
    title: raw.title || `Episode ${epNumber || ''}`.trim(),
    overview: raw.description || raw.overview || raw.synopsis || '',
    playbackId,
    streamUrl: resolveMuxStreamUrl(rawStreamUrl, playbackId),
    duration: toFiniteNumber(raw.duration, 0),
    releaseDate: toIsoString(raw.releaseDate),
    subtitles: parseSubtitles(raw.subtitles),
    thumbnail: resolveMuxImageUrl(raw.thumbnail, playbackId, { width: 214, height: 121 }) || thumbFallback,
    previewAnimation: resolveMuxImageUrl(raw.previewAnimation, playbackId) || buildMuxAnimated(playbackId),
    createdAt: toIsoString(raw.createdAt),
  };
}

function mapSeriesDoc(doc) {
  const data = doc.data() || {};
  const episodes = (Array.isArray(data.episodes) ? data.episodes.map((ep) => mapEpisodeData(ep, doc.id)) : [])
    .sort((a, b) => (a.seasonNumber - b.seasonNumber) || (a.number - b.number));
  const fallbackEpisode = episodes.find((ep) => ep.playbackId) || {};
  const playbackId =
    data.mux_playback_id ||
    data.muxPlaybackId ||
    data.mux_video_id ||
    data.muxVideoId ||
    data.playbackId ||
    fallbackEpisode.playbackId ||
    '';
  const posterUrl =
    resolveMuxImageUrl(data.posterUrl || data.thumbnail, playbackId, { width: 342, height: 513 }) ||
    fallbackEpisode.thumbnail ||
    DEFAULT_POSTER_PLACEHOLDER;
  const backdropUrl =
    resolveMuxImageUrl(data.backdropUrl || data.heroImage, playbackId, { width: 1280, height: 720 }) ||
    DEFAULT_BACKDROP_PLACEHOLDER;
  const previewAnimation = buildMuxAnimated(playbackId);
  const rawTrailer = data.trailer || data.trailerUrl || '';
  const trailerUrl = rawTrailer
    ? (/stream\.mux\.com/i.test(rawTrailer)
      ? resolveMuxStreamUrl(rawTrailer, '')
      : /image\.mux\.com/i.test(rawTrailer)
      ? resolveMuxImageUrl(rawTrailer, playbackId)
      : rawTrailer)
    : previewAnimation;
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
    trailerUrl,
    previewAnimation,
    episodes,
    watchHref,
    duration: data.duration || fallbackEpisode.duration || 0,
  });
}

function hasMeaningfulSqlValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function rowToDoc(row) {
  if (!row) return null;
  const rawData = row.data && typeof row.data === 'object' ? row.data : null;
  const merged = rawData ? { ...rawData } : {};
  for (const [key, val] of Object.entries(row)) {
    if (key === 'data') continue;
    if (hasMeaningfulSqlValue(val) || merged[key] === undefined) {
      merged[key] = val;
    }
  }
  const movieUrl = row.movie_url || row.movieUrl || rawData?.movieUrl || rawData?.movie_url || '';
  const streamUrl = row.stream_url || row.streamUrl || rawData?.streamUrl || rawData?.stream_url || movieUrl || '';
  const data = {
    ...merged,
    id: row.id || merged.id,
    slug: row.slug || merged.slug || row.id,
    backdropUrl: row.backdrop_url || row.backdropUrl || rawData?.backdropUrl || rawData?.backdrop_url || '',
    movieUrl,
    streamUrl,
    mux_playback_id: row.mux_playback_id || rawData?.mux_playback_id || rawData?.muxPlaybackId || '',
    mux_video_id: row.mux_video_id || rawData?.mux_video_id || rawData?.muxVideoId || '',
    releaseYear: row.release_year ?? row.releaseYear ?? rawData?.releaseYear ?? null,
    releaseDate: row.release_date ?? row.releaseDate ?? rawData?.releaseDate ?? null,
    maturityRating: row.maturity_rating || row.maturityRating || rawData?.maturityRating || '',
    totalSeasons: row.total_seasons ?? row.totalSeasons ?? rawData?.totalSeasons ?? 1,
    cast: hasMeaningfulSqlValue(row.cast_members)
      ? row.cast_members
      : hasMeaningfulSqlValue(row.cast)
        ? row.cast
        : Array.isArray(rawData?.cast)
          ? rawData.cast
          : [],
    views: row.views ?? rawData?.views ?? 0,
    isPremium:
      (row.is_premium ?? row.isPremium ?? rawData?.isPremium ?? false) ||
      (row.plan || rawData?.plan) === 'premium',
    plan: row.plan || rawData?.plan || 'free',
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
      ? await sql`
          SELECT id, type, title, slug, description, category,
                 mux_playback_id, mux_video_id, movie_url, stream_url,
                 thumbnail, backdrop_url, trailer, duration, release_year, release_date,
                 maturity_rating, status, total_seasons, genres, cast_members,
                 director, country, language, tags, subtitles, episodes,
                 views, featured, is_premium, plan, rating, orientation,
                 data, created_at, updated_at
          FROM series
          ORDER BY updated_at DESC
        `
      : await sql`
          SELECT id, type, title, slug, description, category,
                 mux_playback_id, mux_video_id, movie_url, stream_url,
                 thumbnail, backdrop_url, trailer, duration, release_year, release_date,
                 maturity_rating, genres, cast_members,
                 director, country, language, subtitles, tags,
                 views, featured, is_premium, plan, rating, orientation,
                 data, created_at, updated_at
          FROM movies
          ORDER BY updated_at DESC
        `;
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

export function invalidateContentCache() {
  contentCache = null;
  contentCacheExpiresAt = 0;
  settingsCache = null;
  settingsCacheExpiresAt = 0;
}

const getAllContentUncached = async () => {
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
      if (contentCache) {
        contentCacheExpiresAt = Date.now() + ERROR_BACKOFF_MS;
        return contentCache;
      }
      return { ...EMPTY_CONTENT, degraded: true };
    } finally {
      inflightContentPromise = null;
    }
  })();

  return inflightContentPromise;
};

const getAllContent = cache(getAllContentUncached);

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
      if (settingsCache) {
        settingsCacheExpiresAt = Date.now() + ERROR_BACKOFF_MS;
        return settingsCache;
      }
      return DEFAULT_SETTINGS;
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

function upsertContentCacheItem(item) {
  if (!item || !contentCache) return;
  const bucketKey = item.type === 'series' ? 'series' : 'movies';
  const nextBucket = contentCache[bucketKey].filter((entry) => entry.id !== item.id);
  nextBucket.unshift(item);
  const nextCombined = contentCache.combined.filter(
    (entry) => !(entry.id === item.id && entry.type === item.type)
  );
  nextCombined.unshift(item);
  contentCache = {
    ...contentCache,
    [bucketKey]: nextBucket,
    combined: nextCombined,
  };
}

export async function getVideoById(idOrSlug, preferredType) {
  if (!idOrSlug || typeof idOrSlug !== 'string') return null;
  const trimmed = idOrSlug.trim();
  if (!trimmed) return null;
  const normalizedType = typeof preferredType === 'string' ? preferredType.toLowerCase() : '';
  const preferSeries = normalizedType === 'series';

  // Bypass React per-request cache() if module-level contentCache was invalidated
  const { movies, series } = contentCache ? await getAllContent() : await getAllContentUncached();
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
      sql`
        SELECT * FROM movies
        WHERE id = ${trimmed} OR slug = ${trimmed}
        ORDER BY (id = ${trimmed}) DESC, updated_at DESC
        LIMIT 1
      `,
      sql`
        SELECT * FROM series
        WHERE id = ${trimmed} OR slug = ${trimmed}
        ORDER BY (id = ${trimmed}) DESC, updated_at DESC
        LIMIT 1
      `,
    ]);

    let resolved = null;
    if (preferSeries) {
      if (seriesRows.length) resolved = mapSeriesDoc(rowToDoc(seriesRows[0]));
      else if (movieRows.length) resolved = mapMovieDoc(rowToDoc(movieRows[0]));
    } else {
      if (movieRows.length) resolved = mapMovieDoc(rowToDoc(movieRows[0]));
      else if (seriesRows.length) resolved = mapSeriesDoc(rowToDoc(seriesRows[0]));
    }
    if (resolved) {
      upsertContentCacheItem(resolved);
      return resolved;
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
  const target = String(episodeId).trim();
  const episodes = await getSeriesEpisodes(seriesId);
  const byId = episodes.find((episode) => episode.id === target);
  if (byId) return byId;
  const bySlug = episodes.find((episode) => episode.slug && episode.slug === target);
  if (bySlug) return bySlug;
  const targetNum = Number(target);
  if (Number.isFinite(targetNum) && target !== '') {
    return (
      episodes.find(
        (episode) =>
          episode.number === targetNum ||
          episode.epNumber === targetNum ||
          episode.episodeNumber === targetNum
      ) || null
    );
  }
  return null;
}
