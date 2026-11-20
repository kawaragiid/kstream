import Link from "next/link";
import { notFound } from "next/navigation";
import CardPoster from "../../../../components/CardPoster";

export const revalidate = 300;

let getVideosByGenre;
let getPlatformSettings;

async function ensureFirestore() {
  if (!getVideosByGenre || !getPlatformSettings) {
    try {
      ({ getVideosByGenre, getPlatformSettings } = await import("../../../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      return {
        getVideosByGenre: async () => [],
        getPlatformSettings: async () => ({ categories: [] }),
      };
    }
  }
  return { getVideosByGenre, getPlatformSettings };
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
    title: `Kategori: ${genre}`,
  };
}

export default async function GenrePage({ params }) {
  const { getVideosByGenre: fetchByGenre, getPlatformSettings: fetchSettings } = await ensureFirestore();
  const { genre: rawGenre } = await params;
  let genre = rawGenre || "";
  try {
    genre = decodeURIComponent(rawGenre || "");
  } catch {
    genre = rawGenre || "";
  }
  const normalizedGenre = genre.trim();
  if (!normalizedGenre) {
    notFound();
  }

  const [items, settings] = await Promise.all([
    fetchByGenre(normalizedGenre, 48).catch(() => []),
    fetchSettings().catch(() => ({ categories: [] })),
  ]);

  const knownCategories = (settings?.categories || []).map((c) => String(c).toLowerCase());
  const isKnownCategory = knownCategories.includes(normalizedGenre.toLowerCase());

  if (items.length === 0 && !isKnownCategory) {
    notFound();
  }

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
          <div className="flex flex-col items-center gap-4 rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <p className="text-sm text-white/65">Belum ada konten untuk genre ini.</p>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 motion-reduce:transition-none"
            >
              Jelajahi Katalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
