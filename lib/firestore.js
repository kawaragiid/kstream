import { getFirebaseAuth } from './firebase';

const FALLBACK_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="28" font-family="Arial, sans-serif">Poster</text></svg>';

async function getAuthHeaders() {
  try {
    const auth = getFirebaseAuth();
    const token = await auth?.currentUser?.getIdToken?.();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}

function nowMillis() {
  return Date.now();
}

const mutationQueues = new Map();

function enqueueMutation(uid, task) {
  const prev = mutationQueues.get(uid) || Promise.resolve();
  const next = prev.catch(() => {}).then(task);
  const tracked = next.finally(() => {
    if (mutationQueues.get(uid) === tracked) {
      mutationQueues.delete(uid);
    }
  });
  mutationQueues.set(uid, tracked);
  return next;
}

function sanitizeStoredPoster(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:image/svg+xml')) return '';
  return trimmed;
}

function serializeFavorite(video) {
  const slug = encodeURIComponent(video.slug || video.id);
  const detailHref = video.href || `/${video.type === 'series' ? 'series' : 'movies'}/${slug}`;
  const watchHref =
    video.watchHref ||
    `/player?id=${slug}&type=${video.type === 'series' ? 'series' : 'movie'}`;
  return {
    id: video.id,
    title: video.title || 'Untitled',
    type: video.type || 'movie',
    slug: video.slug || video.id,
    posterUrl: sanitizeStoredPoster(video.posterUrl),
    overview: typeof video.overview === 'string' ? video.overview.slice(0, 240) : '',
    href: detailHref,
    watchHref,
    addedAt: nowMillis(),
    duration: video.duration || 0,
    orientation: video.orientation || 'landscape',
    category: video.category || '',
  };
}

function serializeHistory(video, { progress = 0, position = 0, duration = 0 } = {}) {
  const favorite = serializeFavorite(video);
  return {
    ...favorite,
    progress: progress ?? 0,
    position: position ?? 0,
    duration: duration || favorite.duration || 0,
    updatedAt: nowMillis(),
  };
}

export async function readUserDoc(uid) {
  if (!uid) return { data: {} };
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/user?uid=${encodeURIComponent(uid)}`, {
    cache: 'no-store',
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to read user doc (${res.status})`);
  }
  const json = await res.json();
  return { data: json?.data || {} };
}

async function writeUserDocPatch(uid, patch) {
  if (!uid || !patch) return;
  const headers = await getAuthHeaders();
  const res = await fetch('/api/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ uid, patch }),
  });
  if (!res.ok) {
    let message = `Failed to update user (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = `${res.status}: ${body.error}`;
    } catch {}
    throw new Error(message);
  }
}

function toMillis(val) {
  if (!val) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (val instanceof Date) {
    const ms = val.getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val._seconds === 'number') return val._seconds * 1000;
    if (typeof val.seconds === 'number') return val.seconds * 1000;
  }
  return 0;
}

export async function getUserHistory(uid, limitCount = 12) {
  if (!uid) return [];
  try {
    const { data } = await readUserDoc(uid);
    const items = Array.isArray(data.history) ? data.history : [];
    return [...items]
      .sort((a, b) => toMillis(b?.updatedAt) - toMillis(a?.updatedAt))
      .slice(0, limitCount)
      .map((item) => ({
        ...item,
        posterUrl: item.posterUrl || FALLBACK_POSTER,
      }));
  } catch {
    return [];
  }
}

export async function getUserFavorites(uid, limitCount = 50) {
  if (!uid) return [];
  try {
    const { data } = await readUserDoc(uid);
    const items = Array.isArray(data.favorites) ? data.favorites : [];
    return [...items]
      .sort((a, b) => toMillis(b?.addedAt) - toMillis(a?.addedAt))
      .slice(0, limitCount)
      .map((item) => ({
        ...item,
        posterUrl: item.posterUrl || FALLBACK_POSTER,
      }));
  } catch {
    return [];
  }
}

export async function toggleFavorite(uid, video) {
  if (!uid || !video?.id) return { isFavorite: false };
  return enqueueMutation(uid, async () => {
    const { data } = await readUserDoc(uid);
    const favorites = Array.isArray(data.favorites)
      ? data.favorites.map((fav) => ({ ...fav, posterUrl: sanitizeStoredPoster(fav?.posterUrl) }))
      : [];
    const index = favorites.findIndex((fav) => fav.id === video.id);
    if (index >= 0) {
      favorites.splice(index, 1);
      await writeUserDocPatch(uid, { favorites: favorites.slice(0, 100) });
      return { isFavorite: false };
    }
    favorites.unshift(serializeFavorite(video));
    await writeUserDocPatch(uid, { favorites: favorites.slice(0, 100) });
    return { isFavorite: true };
  });
}

export async function saveHistoryProgress(uid, video, progressInfo = 0, { preserveExisting = false } = {}) {
  if (!uid || !video?.id) return;
  return enqueueMutation(uid, async () => {
    const { data } = await readUserDoc(uid);
    let history = Array.isArray(data.history) ? [...data.history] : [];
    const index = history.findIndex((item) => item.id === video.id);
    const existing = index >= 0 ? history[index] || {} : {};
    const normalized =
      typeof progressInfo === 'object'
        ? {
            progress: progressInfo.progress ?? 0,
            position: progressInfo.position ?? 0,
            duration: progressInfo.duration ?? video.duration ?? 0,
          }
        : { progress: progressInfo, position: 0, duration: video.duration ?? 0 };
    const serialized = {
      ...serializeHistory(video, normalized),
      ...(video.seriesId ? { seriesId: video.seriesId } : {}),
    };

    if (video.type === 'series') {
      const seriesKey = video.seriesId || '';
      history = history.filter((item) => {
        if (item.id === video.id) return false;
        if (item.type !== 'series') return true;
        if (seriesKey && item.seriesId === seriesKey) {
          return false;
        }
        if (video.slug && item.slug === video.slug) {
          return false;
        }
        return true;
      });
    } else if (index >= 0) {
      history.splice(index, 1);
    }

    const keepProgress = preserveExisting && typeof existing.progress === 'number' && existing.progress > 0;
    const updatedItem = {
      ...existing,
      ...serialized,
      ...(keepProgress
        ? {
            progress: existing.progress,
            position: existing.position ?? 0,
            duration: existing.duration || serialized.duration,
          }
        : {}),
      addedAt: existing.addedAt || serialized.addedAt,
    };
    history.unshift(updatedItem);
    const compactHistory = history.slice(0, 50).map((item) => ({
      ...item,
      posterUrl: sanitizeStoredPoster(item?.posterUrl),
      overview: typeof item?.overview === 'string' ? item.overview.slice(0, 240) : '',
    }));
    await writeUserDocPatch(uid, { history: compactHistory });
  });
}

export async function isFavorite(uid, videoId) {
  if (!uid || !videoId) return false;
  try {
    const { data } = await readUserDoc(uid);
    const favorites = Array.isArray(data.favorites) ? data.favorites : [];
    return favorites.some((fav) => fav.id === videoId);
  } catch {
    return false;
  }
}

export async function updateUserProfileDoc(uid, data) {
  if (!uid || !data) return;
  return enqueueMutation(uid, () => writeUserDocPatch(uid, data));
}

export async function clearUserHistory(uid) {
  if (!uid) return;
  return enqueueMutation(uid, () => writeUserDocPatch(uid, { history: [] }));
}

export async function removeHistoryItem(uid, itemId) {
  if (!uid || !itemId) return;
  return enqueueMutation(uid, async () => {
    const { data } = await readUserDoc(uid);
    const history = Array.isArray(data.history) ? data.history.filter((item) => item.id !== itemId) : [];
    await writeUserDocPatch(uid, { history });
  });
}
