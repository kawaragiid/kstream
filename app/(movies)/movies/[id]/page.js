import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodeList from "@/components/EpisodeList";
import FavoriteButton from "@/components/FavoriteButton";
import SliderRow from "@/components/SliderRow";

let dataModule = null;

async function ensureDataModule() {
  if (!dataModule) {
    try {
      dataModule = await import("@/lib/firestoreServer");
    } catch (error) {
      console.warn("Data server belum siap:", error.message);
      return {
        getVideoById: async () => null,
        getSeriesEpisodes: async () => [],
        getVideosByGenre: async () => [],
      };
    }
  }
  return dataModule;
}

export async function generateMetadata({ params }) {
  const { getVideoById } = await ensureDataModule();
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
  const { getVideoById, getSeriesEpisodes, getVideosByGenre } = await ensureDataModule();
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
    <div className="space-y-10 sm:space-y-14 pb-12 sm:pb-16">
      <div className="w-full">
        <section className="relative -mt-16 sm:-mt-20 w-full min-h-[70vh] sm:min-h-[78vh] overflow-hidden bg-black text-white">
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/35 to-black/40" />
          <div className="relative z-10 mx-auto flex min-h-[70vh] sm:min-h-[78vh] w-full max-w-[120rem] flex-col justify-end gap-4 sm:gap-6 px-4 pb-10 pt-28 sm:px-8 sm:pb-14 lg:px-12">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight break-words drop-shadow-lg">{video.title}</h1>
              {metadataPills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold tracking-wider text-white/85">
                  {metadataPills.map((pill) => (
                    <span
                      key={pill}
                      className={
                        pill === video.maturityRating
                          ? "rounded-sm border border-white/40 bg-white/10 px-2 py-0.5 text-[11px] uppercase text-white"
                          : "text-white/80"
                      }
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed text-white/85 md:text-base break-words line-clamp-4">{video.overview}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5">
              <Link
                href={watchHref}
                className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2 rounded-[4px] bg-white px-7 py-2.5 font-bold text-black shadow-lg hover:bg-white/85 active:scale-95 transition text-sm sm:text-base"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
                </svg>
                Putar
              </Link>
              <FavoriteButton
                video={{ ...video, href: baseHref, watchHref }}
                className="w-full sm:w-auto min-h-[44px] justify-center rounded-[4px] bg-white/15 hover:bg-white/25 border-white/25"
              />
              {video.trailerUrl && (
                <a
                  href={video.trailerUrl}
                  className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2 rounded-[4px] border border-white/25 bg-[#6d6d6e]/60 px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#6d6d6e]/85 active:scale-95 transition"
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
