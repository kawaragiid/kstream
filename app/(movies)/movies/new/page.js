import CardPoster from "../../../../components/CardPoster";

let getNewReleases;

async function loadNew() {
  if (!getNewReleases) {
    try {
      ({ getNewReleases } = await import("../../../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getNewReleases = async () => [];
    }
  }
  return getNewReleases(48).catch(() => []);
}

export const metadata = { title: "Baru Rilis - Kstream" };

export default async function NewMoviesPage() {
  const releases = await loadNew();

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">Baru Rilis</h1>
        <p className="text-sm text-text-muted">Konten terbaru yang baru saja tayang di Kstream.</p>
      </div>
      {releases.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {releases.map((item) => (
            <CardPoster key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-surface-100/60 p-10 text-center">
          <p className="text-sm text-text-muted">Belum ada konten terbaru saat ini.</p>
        </div>
      )}
    </div>
  );
}
