import { NextResponse } from 'next/server';

let searchVideos;

async function ensureFirestore() {
  if (!searchVideos) {
    ({ searchVideos } = await import('../../../lib/firestoreServer').catch((error) => {
      console.warn('Firestore admin belum siap:', error.message);
      searchVideos = async () => [];
    }));
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  await ensureFirestore();
  const items = await searchVideos(q, 20).catch(() => []);

  return NextResponse.json({ items });
}

