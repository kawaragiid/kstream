import SliderRow from '../../../../components/SliderRow';

let getTrending;

async function loadTrending() {
  if (!getTrending) {
    try {
      ({ getTrending } = await import('../../../../lib/firestoreServer'));
    } catch (error) {
      console.warn('Firestore admin belum siap:', error.message);
      getTrending = async () => [];
    }
  }
  return getTrending(24).catch(() => []);
}

export const metadata = { title: 'Trending' };

export default async function TrendingPage() {
  const trending = await loadTrending();

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Trending</h1>
        <p className="text-gray-600">Konten paling populer di Kstream minggu ini.</p>
      </div>
      <SliderRow title="" items={trending} />
    </div>
  );
}

