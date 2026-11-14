import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodeList from "@/components/EpisodeList";
import FavoriteButton from "@/components/FavoriteButton";
import SliderRow from "@/components/SliderRow";

let firestoreModule = null;

async function ensureFirestore() {
  if (!firestoreModule) {
    try {
      firestoreModule = await import("@/lib/firestoreServer");
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      return {
        getVideoById: async () => null,
        getSeriesEpisodes: async () => [],
        getVideosByGenre: async () => [],
      };
    }
  }
  return firestoreModule;
}

export async function generateMetadata({ params }) {
  const { getVideoById } = await ensureFirestore();
  const { id: rawId } = await params;
  let id = rawId || "";
  try {
    id = decodeURIComponent(rawId || "");
  } catch {
    id = rawId || "";
  }
  const video = await getVideoById(id, "movie").catch(() => null);
  if (!video) return { title: "Detail - Kstream" };
  return {
    title: `${video.title} - Kstream`,
    description: video.overview,
  };
}

export default async function MovieDetailPage({ params }) {
  const { getVideoById, getSeriesEpisodes, getVideosByGenre } = await ensureFirestore();
  const { id: rawId } = await params;
  let id = rawId || "";
  try {
    id = decodeURIComponent(rawId || "");
  } catch {
    id = rawId || "";
  }
  const video = await getVideoById(id, "movie").catch(() => null);

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
        ? `/player?id=${slugId}&type=series&ep=${encodeURIComponent(primaryEpisode.id)}`
        : `/player?id=${slugId}&type=series`
      : `/player?id=${slugId}&type=movie`);

  const metadataPills = [releaseYear, video.maturityRating, video.category].filter(Boolean);

  return (
    <div className="space-y-10 sm:space-y-16 pb-12 sm:pb-16">
      <div className="w-full px-0 sm:px-4 md:px-6 lg:px-8">
        <section className="relative mx-auto w-full max-w-[120rem] min-h-[460px] sm:min-h-[60vh] overflow-hidden rounded-none sm:rounded-3xl bg-black text-white">
          {(video.backdropUrl || video.posterUrl) && (
            <Image
              src={video.backdropUrl || video.posterUrl}
              alt={video.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          )}
          <div className="absolute inset-0 bg-hero-overlay" />
          <div className="relative z-10 flex flex-col justify-end gap-4 sm:gap-6 px-4 pb-8 pt-16 sm:px-6 sm:pb-12 sm:pt-20 md:px-12 lg:min-h-[60vh] lg:max-w-4xl">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight break-words">{video.title}</h1>
              {metadataPills.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:gap-3 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/70">
                  {metadataPills.map((pill) => (
                    <span
                      key={pill}
                      className={
                        pill === video.maturityRating
                          ? "rounded border border-white/40 bg-white/10 px-2 py-0.5 text-[11px] uppercase text-white/90"
                          : "rounded-full border border-white/20 px-2.5 sm:px-3 py-0.5 sm:py-1"
                      }
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed text-white/80 md:text-base break-words">{video.overview}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Link
                href={watchHref}
                className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-3 sm:py-2.5 font-semibold text-black shadow-poster hover:bg-white/90 active:scale-95 transition text-sm sm:text-base"
              >
                ▶ Tonton Sekarang
              </Link>
              <FavoriteButton
                video={{ ...video, href: baseHref, watchHref }}
                className="w-full sm:w-auto min-h-[44px] justify-center"
              />
              {video.trailerUrl && (
                <a
                  href={video.trailerUrl}
                  className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-white/10 active:scale-95 transition"
                  target="_blank"
                  rel="noreferrer"
                >
                  Trailer
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      {video.type === "series" && (
        <section className="mx-auto w-full max-w-[120rem] space-y-6 px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-text-primary">Daftar Episode</h2>
            {episodes.length > 0 && (
              <span className="text-xs uppercase tracking-widest text-text-muted">{episodes.length} episode</span>
            )}
          </div>
          <EpisodeList
            episodes={episodes}
            baseHref={`/player?id=${slugId}&type=series`}
          />
        </section>
      )}

      {recommendations.length > 0 && (
        <div className="mx-auto w-full max-w-[120rem] px-4 sm:px-6 md:px-8">
          <SliderRow
            title="Rekomendasi Serupa"
            items={recommendations}
            actionHref={similarGenre ? `/category/${encodeURIComponent(similarGenre.toLowerCase())}` : ""}
          />
        </div>
      )}
    </div>
  );
}
