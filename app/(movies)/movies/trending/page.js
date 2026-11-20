import Link from "next/link";
import CardPoster from "../../../../components/CardPoster";

export const revalidate = 300;
export const metadata = { title: "Trending" };

let getTrending;

async function loadTrending() {
  if (!getTrending) {
    try {
      ({ getTrending } = await import("../../../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      return [];
    }
  }
  return getTrending(48).catch(() => []);
}

export default async function TrendingPage() {
  const trending = await loadTrending();

  return (
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div className="space-y-1.5 border-b border-white/10 pb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Sedang Trending</h1>
          <p className="text-sm text-white/60">Film dan serial paling populer di Kstream minggu ini.</p>
        </div>
        {trending.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {trending.map((item) => (
              <CardPoster key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <p className="text-sm text-white/65">Belum ada konten trending saat ini.</p>
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
