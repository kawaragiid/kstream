import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodeList from "@/components/EpisodeList";
import FavoriteButton from "@/components/FavoriteButton";
import SliderRow from "@/components/SliderRow";

let getVideoById;
let getSeriesEpisodes;
let getVideosByGenre;

async function ensureFirestore() {
  if (!getVideoById || !getSeriesEpisodes || !getVideosByGenre) {
    try {
      ({ getVideoById, getSeriesEpisodes, getVideosByGenre } = await import("@/lib/firestoreServer"));
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      getVideoById = async () => null;
      getSeriesEpisodes = async () => [];
      getVideosByGenre = async () => [];
    }
  }
}

export async function generateMetadata({ params }) {
  await ensureFirestore();
  const video = await getVideoById(params.id);
  if (!video) return { title: "Detail" };
  return {
    title: `${video.title} - Kstream`,
    description: video.overview,
  };
}

export default async function MovieDetailPage({ params }) {
  await ensureFirestore();
  const video = await getVideoById(params.id);

  if (!video) {
    notFound();
  }

  const episodes = video.type === "series" ? await getSeriesEpisodes(video.id) : [];
  const similarGenre = video.genres?.[0] || video.category;
  const recommendations = similarGenre ? await getVideosByGenre(similarGenre, 18, { excludeId: video.id }) : [];

  const releaseYear = video.releaseDate ? new Date(video.releaseDate).getFullYear() : null;
  const slugId = encodeURIComponent(video.slug || video.id);
  const baseHref = `/${video.type === "series" ? "series" : "movies"}/${slugId}`;
  const primaryEpisode = episodes?.[0];
  const watchHref =
    video.watchHref ||
    (video.type === "series"
      ? primaryEpisode?.id
        ? `/player?id=${encodeURIComponent(video.slug || video.id)}&type=series&ep=${encodeURIComponent(primaryEpisode.id)}`
        : `/player?id=${encodeURIComponent(video.slug || video.id)}&type=series`
      : `/player?id=${encodeURIComponent(video.slug || video.id)}&type=movie`);

  const metadataPills = [releaseYear, video.category, video.isPremium ? "Premium" : "Free"].filter(Boolean);

  return (
    <div className="space-y-16 pb-16">
      <section className="relative mx-auto w-full max-w-[120rem] min-h-[60vh] overflow-hidden rounded-3xl bg-black text-white">
        {video.backdropUrl && <Image src={video.backdropUrl} alt={video.title} fill className="object-cover" sizes="100vw" priority />}
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative z-10 flex flex-col justify-end gap-6 px-6 pb-12 pt-20 md:px-12 lg:min-h-[60vh] lg:max-w-4xl">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">{video.title}</h1>
            {metadataPills.length > 0 && (
              <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wider text-white/70">
                {metadataPills.map((pill) => (
                  <span key={pill} className="rounded-full border border-white/20 px-3 py-1">
                    {pill}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-white/80 md:text-base">{video.overview}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href={watchHref} className="inline-flex items-center gap-2 rounded bg-white px-6 py-2 font-semibold text-black shadow-poster hover:bg-white/90 transition">
              Play Now
            </Link>
            <FavoriteButton video={{ ...video, href: baseHref, watchHref }} />
            {video.trailerUrl && (
              <a href={video.trailerUrl} className="inline-flex items-center gap-2 rounded border border-white/20 px-6 py-2 text-sm font-semibold text-white hover:bg-white/10 transition" target="_blank" rel="noreferrer">
                Trailer
              </a>
            )}
          </div>
        </div>
      </section>

      {video.type === "series" && (
        <section className="mx-auto w-full max-w-[120rem] space-y-6 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-text-primary">Daftar Episode</h2>
            {episodes.length > 0 && <span className="text-xs uppercase tracking-widest text-text-muted">{episodes.length} episode</span>}
          </div>
          <EpisodeList
            episodes={episodes}
            baseHref={(ep) =>
              `/player?id=${encodeURIComponent(video.slug || video.id)}&type=series&ep=${encodeURIComponent(ep.id)}&autoplay=1`
            }
          />
        </section>
      )}

      {recommendations.length > 0 && (
        <section className="mx-auto w-full max-w-[120rem] px-4">
          <SliderRow title="Rekomendasi untukmu" items={recommendations} actionHref={similarGenre ? `/category/${encodeURIComponent(similarGenre.toLowerCase())}` : ""} actionLabel={similarGenre ? `Genre ${similarGenre}` : "Lihat semua"} />
        </section>
      )}
    </div>
  );
}
