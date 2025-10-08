import SliderRow from '../../../../components/SliderRow';

let getVideosByGenre;

async function ensureFirestore() {
  if (!getVideosByGenre) {
    try {
      ({ getVideosByGenre } = await import('../../../../lib/firestoreServer'));
    } catch (error) {
      console.warn('Firestore admin belum siap:', error.message);
      getVideosByGenre = async () => [];
    }
  }
}

export default async function GenrePage({ params }) {
  await ensureFirestore();
  const genre = decodeURIComponent(params.genre);
  const items = await getVideosByGenre(genre, 24).catch(() => []);

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold capitalize">Kategori: {genre}</h1>
        <p className="text-gray-600">Menampilkan film dan series dengan genre {genre}.</p>
      </div>
      {items.length ? (
        <SliderRow title="" items={items} />
      ) : (
        <p className="text-gray-500">Belum ada konten untuk genre ini.</p>
      )}
    </div>
  );
}
