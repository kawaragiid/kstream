import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

let searchVideos;

async function ensureFirestore() {
  if (!searchVideos) {
    try {
      ({ searchVideos } = await import('../../../lib/firestoreServer'));
    } catch (error) {
      console.warn('Firestore admin belum siap:', error.message);
      searchVideos = async () => [];
    }
  }
}

export async function GET(request) {
  const rl = await checkRateLimit(request, { key: 'search', limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan pencarian. Coba lagi sebentar atau masuk ke akun.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().slice(0, 100);

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  await ensureFirestore();
  const items = await searchVideos(q, 20).catch(() => []);

  return NextResponse.json(
    { items },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    }
  );
}

