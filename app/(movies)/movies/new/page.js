import CardPoster from "../../../../components/CardPoster";

export const revalidate = 300;
export const metadata = { title: "Baru Rilis" };

let getNewReleases;

async function loadNew() {
  if (!getNewReleases) {
    try {
      ({ getNewReleases } = await import("../../../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      return [];
    }
  }
  return getNewReleases(48).catch(() => []);
}

export default async function NewMoviesPage() {
  const releases = await loadNew();

  return (
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div className="space-y-1.5 border-b border-white/10 pb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Baru Rilis</h1>
          <p className="text-sm text-white/60">Film dan serial terbaru yang baru saja tayang di Kstream.</p>
        </div>
        {releases.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {releases.map((item) => (
              <CardPoster key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <p className="text-sm text-white/65">Belum ada konten terbaru saat ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
