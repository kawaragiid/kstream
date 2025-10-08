import { getDb } from './firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

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
    title: video.title,
    type: video.type,
    slug: video.slug || video.id,
    posterUrl: video.posterUrl || FALLBACK_POSTER,
    overview: video.overview || '',
    href: detailHref,
    watchHref,
    addedAt: nowMillis(),
    duration: video.duration || 0,
    orientation: video.orientation,
    category: video.category || '',
  };
}

function serializeHistory(video, { progress = 0, position = 0, duration = 0 } = {}) {
  const favorite = serializeFavorite(video);
  return {
    ...favorite,
    progress,
    position,
    duration: duration || favorite.duration || 0,
    updatedAt: nowMillis(),
  };
}

async function readUserDoc(uid) {
  const db = getDb();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return { ref, snap, data: snap.data() || {} };
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
  const { ref, snap, data } = await readUserDoc(uid);
  const favorites = Array.isArray(data.favorites) ? [...data.favorites] : [];
  const index = favorites.findIndex((fav) => fav.id === video.id);
  if (index >= 0) {
    favorites.splice(index, 1);
    await setDoc(ref, { favorites, updatedAt: serverTimestamp() }, { merge: true });
    return { isFavorite: false };
  }
  favorites.unshift(serializeFavorite(video));
  await setDoc(ref, { favorites, updatedAt: serverTimestamp() }, { merge: true });
  return { isFavorite: true };
}

export async function saveHistoryProgress(uid, video, progressInfo = 0) {
  if (!uid || !video?.id) return;
  const { ref, data } = await readUserDoc(uid);
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
    history[index] = {
      ...existing,
      ...serialized,
      addedAt: existing.addedAt || serialized.addedAt,
    };
  } else {
    history.unshift(serialized);
  }
  await setDoc(ref, { history, updatedAt: serverTimestamp() }, { merge: true });
}

export async function isFavorite(uid, videoId) {
  if (!uid || !videoId) return false;
  const { data } = await readUserDoc(uid);
  const favorites = Array.isArray(data.favorites) ? data.favorites : [];
  return favorites.some((fav) => fav.id === videoId);
}

export async function updateUserProfileDoc(uid, data) {
  if (!uid || !data) return;
  const db = getDb();
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
