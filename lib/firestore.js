const FALLBACK_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="28" font-family="Arial, sans-serif">Poster</text></svg>';

function nowMillis() {
  return Date.now();
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
    posterUrl: video.posterUrl || FALLBACK_POSTER,
    overview: video.overview || '',
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
  try {
    const res = await fetch(`/api/user?uid=${encodeURIComponent(uid)}`, { cache: 'no-store' });
    if (!res.ok) return { data: {} };
    const json = await res.json();
    return { data: json?.data || {} };
  } catch {
    return { data: {} };
  }
}

async function writeUserDocPatch(uid, patch) {
  if (!uid || !patch) return;
  await fetch('/api/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, patch }),
  });
}

export async function getUserHistory(uid, limitCount = 12) {
  if (!uid) return [];
  const { data } = await readUserDoc(uid);
  const items = Array.isArray(data.history) ? data.history : [];
  return items
    .sort((a, b) => {
      const timeA = typeof a.updatedAt === 'number' ? a.updatedAt : a.updatedAt?._seconds || 0;
      const timeB = typeof b.updatedAt === 'number' ? b.updatedAt : b.updatedAt?._seconds || 0;
      return timeB - timeA;
    })
    .slice(0, limitCount)
    .map((item) => ({
      ...item,
      posterUrl: item.posterUrl || FALLBACK_POSTER,
    }));
}

export async function getUserFavorites(uid, limitCount = 50) {
  if (!uid) return [];
  const { data } = await readUserDoc(uid);
  const items = Array.isArray(data.favorites) ? data.favorites : [];
  return items
    .sort((a, b) => {
      const timeA = typeof a.addedAt === 'number' ? a.addedAt : a.addedAt?._seconds || 0;
      const timeB = typeof b.addedAt === 'number' ? b.addedAt : b.addedAt?._seconds || 0;
      return timeB - timeA;
    })
    .slice(0, limitCount)
    .map((item) => ({
      ...item,
      posterUrl: item.posterUrl || FALLBACK_POSTER,
    }));
}

export async function toggleFavorite(uid, video) {
  if (!uid || !video?.id) return { isFavorite: false };
  const { data } = await readUserDoc(uid);
  const favorites = Array.isArray(data.favorites) ? [...data.favorites] : [];
  const index = favorites.findIndex((fav) => fav.id === video.id);
  if (index >= 0) {
    favorites.splice(index, 1);
    await writeUserDocPatch(uid, { favorites });
    return { isFavorite: false };
  }
  favorites.unshift(serializeFavorite(video));
  await writeUserDocPatch(uid, { favorites });
  return { isFavorite: true };
}

export async function saveHistoryProgress(uid, video, progressInfo = 0, { preserveExisting = false } = {}) {
  if (!uid || !video?.id) return;
  const { data } = await readUserDoc(uid);
  const history = Array.isArray(data.history) ? [...data.history] : [];
  const index = history.findIndex((item) => item.id === video.id);
  const normalized =
    typeof progressInfo === 'object'
      ? {
          progress: progressInfo.progress ?? 0,
          position: progressInfo.position ?? 0,
          duration: progressInfo.duration ?? video.duration ?? 0,
        }
      : { progress: progressInfo, position: 0, duration: video.duration ?? 0 };
  const serialized = serializeHistory(video, normalized);
  if (index >= 0) {
    const existing = history[index] || {};
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
    history.splice(index, 1);
    history.unshift(updatedItem);
  } else {
    history.unshift(serialized);
  }
  await writeUserDocPatch(uid, { history: history.slice(0, 50) });
}

export async function isFavorite(uid, videoId) {
  if (!uid || !videoId) return false;
  const { data } = await readUserDoc(uid);
  const favorites = Array.isArray(data.favorites) ? data.favorites : [];
  return favorites.some((fav) => fav.id === videoId);
}

export async function updateUserProfileDoc(uid, data) {
  if (!uid || !data) return;
  await writeUserDocPatch(uid, data);
}
