import CardPoster from "../../../../components/CardPoster";

export const revalidate = 60;
export const metadata = { title: "Trending - Kstream" };

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
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">Sedang Trending</h1>
        <p className="text-sm text-text-muted">Konten paling populer di Kstream minggu ini.</p>
      </div>
      {trending.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {trending.map((item) => (
            <CardPoster key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-surface-100/60 p-10 text-center">
          <p className="text-sm text-text-muted">Belum ada konten trending saat ini.</p>
        </div>
      )}
    </div>
  );
}
