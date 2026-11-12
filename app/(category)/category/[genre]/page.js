import CardPoster from "../../../../components/CardPoster";

let getVideosByGenre;

async function ensureFirestore() {
  if (!getVideosByGenre) {
    try {
      ({ getVideosByGenre } = await import("../../../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideosByGenre = async () => [];
    }
  }
}

export default async function GenrePage({ params }) {
  await ensureFirestore();
  const { genre: rawGenre } = await params;
  const genre = decodeURIComponent(rawGenre || "");
  const items = await getVideosByGenre(genre, 48).catch(() => []);

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold capitalize text-text-primary">Kategori: {genre}</h1>
        <p className="text-sm text-text-muted">Menampilkan film dan series dengan genre {genre}.</p>
      </div>
      {items.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <CardPoster key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-surface-100/60 p-10 text-center">
          <p className="text-sm text-text-muted">Belum ada konten untuk genre ini.</p>
        </div>
      )}
    </div>
  );
}
