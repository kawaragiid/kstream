import CardPoster from "../../../../components/CardPoster";

let getVideosByGenre;

async function ensureFirestore() {
  if (!getVideosByGenre) {
    try {
      ({ getVideosByGenre } = await import("../../../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      return async () => [];
    }
  }
  return getVideosByGenre;
}

export async function generateMetadata({ params }) {
  const { genre: rawGenre } = await params;
  let genre = rawGenre || "";
  try {
    genre = decodeURIComponent(rawGenre || "");
  } catch {
    genre = rawGenre || "";
  }
  return {
    title: `Kategori: ${genre} - Kstream`,
  };
}

export default async function GenrePage({ params }) {
  const fetchByGenre = await ensureFirestore();
  const { genre: rawGenre } = await params;
  let genre = rawGenre || "";
  try {
    genre = decodeURIComponent(rawGenre || "");
  } catch {
    genre = rawGenre || "";
  }
  const items = await fetchByGenre(genre, 48).catch(() => []);

  return (
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div className="space-y-1.5 border-b border-white/10 pb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold capitalize text-white">Kategori: {genre}</h1>
          <p className="text-sm text-white/60">Menampilkan film dan series dengan genre {genre}.</p>
        </div>
        {items.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item) => (
              <CardPoster key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <p className="text-sm text-white/65">Belum ada konten untuk genre ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
