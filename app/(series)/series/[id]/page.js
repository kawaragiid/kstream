import Image from "next/image";
import { notFound } from "next/navigation";
import EpisodeList from "../../../../components/EpisodeList";
import FavoriteButton from "../../../../components/FavoriteButton";

let getVideoById;
let getSeriesEpisodes;

async function ensureFirestore() {
  if (!getVideoById || !getSeriesEpisodes) {
    try {
      ({ getVideoById, getSeriesEpisodes } = await import("../../../../lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideoById = async () => null;
      getSeriesEpisodes = async () => [];
    }
  }
}

export default async function SeriesDetailPage({ params }) {
  await ensureFirestore();
  const series = await getVideoById(params.id);

  if (!series || series.type !== "series") {
    notFound();
  }

  const episodes = await getSeriesEpisodes(series.id);
  const slugId = encodeURIComponent(series.slug || series.id);
  const baseHref = `/series/${slugId}`;
  const releaseYear = series.releaseDate ? new Date(series.releaseDate).getFullYear() : null;

  const metadataPills = [releaseYear, series.category, series.isPremium ? "Premium" : "Free"].filter(Boolean);

  return (
    <div className="space-y-16 pb-16">
      <section className="relative mx-auto w-full max-w-[120rem] min-h-[55vh] overflow-hidden rounded-3xl bg-black text-white">
        {series.backdropUrl && <Image src={series.backdropUrl} alt={series.title} fill className="object-cover" sizes="100vw" priority />}
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative z-10 flex flex-col justify-end gap-6 px-6 pb-12 pt-20 md:px-12 lg:min-h-[55vh] lg:max-w-4xl">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">{series.title}</h1>
            {metadataPills.length > 0 && (
              <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wider text-white/70">
                {metadataPills.map((pill) => (
                  <span key={pill} className="rounded-full border border-white/20 px-3 py-1">
                    {pill}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-white/80 md:text-base">{series.overview}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <FavoriteButton video={{ ...series, href: baseHref, watchHref: series.watchHref }} />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[120rem] space-y-6 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-text-primary">Episode</h2>
          {episodes.length > 0 && <span className="text-xs uppercase tracking-widest text-text-muted">{episodes.length} episode</span>}
        </div>
        <EpisodeList
          episodes={episodes}
          baseHref={(ep) =>
            `/player?id=${encodeURIComponent(series.slug || series.id)}&type=series&ep=${encodeURIComponent(ep.id)}&autoplay=1`
          }
        />
      </section>
    </div>
  );
}
