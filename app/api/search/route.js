import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

let cachedSearchVideos = null;

async function getSearchFn() {
  if (cachedSearchVideos) return cachedSearchVideos;
  const mod = await import('../../../lib/firestoreServer');
  if (typeof mod?.searchVideos === 'function') {
    cachedSearchVideos = mod.searchVideos;
  }
  return cachedSearchVideos;
}

function toSearchCardItem(item) {
  if (!item || typeof item !== 'object') return item;
  const {
    streamUrl: _streamUrl,
    episodes: _episodes,
    playbackId: _playbackId,
    subtitles: _subtitles,
    ...metadata
  } = item;
  return metadata;
}

export async function GET(request) {
  const rl = await checkRateLimit(request, { key: 'search', limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan pencarian. Coba lagi sebentar atau masuk ke akun.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec), 'Cache-Control': 'no-store' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().slice(0, 100);

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  try {
    const searchVideos = await getSearchFn();
    if (!searchVideos) {
      return NextResponse.json(
        { error: 'Search service unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const rawItems = await searchVideos(q, 20);
    const items = Array.isArray(rawItems) ? rawItems.map(toSearchCardItem) : [];

    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.warn('[api/search] GET error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to search catalog' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

