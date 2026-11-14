import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodeList from "../../../../components/EpisodeList";
import FavoriteButton from "../../../../components/FavoriteButton";

let firestoreModule = null;

async function ensureFirestore() {
  if (!firestoreModule) {
    try {
      firestoreModule = await import("../../../../lib/firestoreServer");
    } catch (error) {
      console.warn("Firestore admin belum siap:", error.message);
      return {
        getVideoById: async () => null,
        getSeriesEpisodes: async () => [],
      };
    }
  }
  return firestoreModule;
}

export default async function SeriesDetailPage({ params }) {
  const { getVideoById, getSeriesEpisodes } = await ensureFirestore();
  const { id: rawId } = await params;
  let id = rawId || "";
  try {
    id = decodeURIComponent(rawId || "");
  } catch {
    id = rawId || "";
  }
  const series = await getVideoById(id, "series").catch(() => null);

  if (!series || series.type !== "series") {
    notFound();
  }

  const episodes = await getSeriesEpisodes(series.id);
  const slugId = encodeURIComponent(series.slug || series.id);
  const baseHref = `/series/${slugId}`;
  const releaseYear = series.releaseYear || (series.releaseDate ? new Date(series.releaseDate).getFullYear() : null);
  const seasonCount = Math.max(
    Number(series.totalSeasons || 1),
    ...(episodes.length ? episodes.map((ep) => Number(ep.seasonNumber || 1)) : [1])
  );
  const primaryEpisode = episodes?.[0];
  const watchHref = primaryEpisode?.id
    ? `/player?id=${slugId}&type=series&ep=${encodeURIComponent(primaryEpisode.id)}&autoplay=1`
    : series.watchHref || `/player?id=${slugId}&type=series`;

  const genrePills = Array.isArray(series.genres) && series.genres.length > 0
    ? series.genres
    : [series.category].filter(Boolean);
  const originInfo = [series.country, series.language].filter(Boolean).join(" • ");

  return (
    <div className="space-y-10 sm:space-y-16 pb-12 sm:pb-16">
      <div className="w-full px-0 sm:px-4 md:px-6 lg:px-8">
        <section className="relative mx-auto w-full max-w-[120rem] min-h-[460px] sm:min-h-[55vh] overflow-hidden rounded-none sm:rounded-3xl bg-black text-white">
          {(series.backdropUrl || series.posterUrl) && (
            <Image
              src={series.backdropUrl || series.posterUrl}
              alt={series.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          )}
          <div className="absolute inset-0 bg-hero-overlay" />
          <div className="relative z-10 flex flex-col justify-end gap-4 sm:gap-6 px-4 pb-8 pt-16 sm:px-6 sm:pb-12 sm:pt-20 md:px-12 lg:min-h-[55vh] lg:max-w-4xl">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight break-words">{series.title}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-semibold tracking-wider text-white/85">
                {releaseYear && <span>{releaseYear}</span>}
                {series.maturityRating && (
                  <span className="rounded border border-white/40 bg-white/10 px-2 py-0.5 text-[11px] uppercase">
                    {series.maturityRating}
                  </span>
                )}
                <span>{seasonCount} Season</span>
                {series.status && (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] uppercase text-emerald-300 border border-emerald-400/30">
                    {series.status}
                  </span>
                )}
                {genrePills.map((genre) => (
                  <span key={genre} className="rounded-full border border-white/20 px-2.5 sm:px-3 py-0.5 text-[11px] uppercase text-white/75">
                    {genre}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-white/85 md:text-base break-words">{series.overview}</p>
              {(series.cast?.length > 0 || series.director || originInfo) && (
                <div className="grid gap-1.5 pt-1 text-xs text-white/70 sm:text-sm">
                  {series.cast?.length > 0 && (
                    <p className="break-words">
                      <span className="text-white/45">Pemeran: </span>
                      {series.cast.join(", ")}
                    </p>
                  )}
                  {series.director && (
                    <p className="break-words">
                      <span className="text-white/45">Sutradara / Kreator: </span>
                      {series.director}
                    </p>
                  )}
                  {originInfo && (
                    <p className="break-words">
                      <span className="text-white/45">Negara &amp; Bahasa: </span>
                      {originInfo}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {episodes.length > 0 && (
                <Link
                  href={watchHref}
                  className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-3 sm:py-2.5 font-semibold text-black shadow-poster hover:bg-white/90 active:scale-95 transition text-sm sm:text-base"
                >
                  ▶ Tonton {primaryEpisode?.number ? `S${String(primaryEpisode.seasonNumber || 1).padStart(2, "0")}E${String(primaryEpisode.number).padStart(2, "0")}` : "Episode 1"}
                </Link>
              )}
              <FavoriteButton
                video={{ ...series, href: baseHref, watchHref }}
                className="w-full sm:w-auto min-h-[44px] justify-center"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-[120rem] space-y-6 px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-text-primary">Episode</h2>
          {episodes.length > 0 && (
            <span className="text-xs uppercase tracking-widest text-text-muted">{episodes.length} episode</span>
          )}
        </div>
        <EpisodeList
          episodes={episodes}
          baseHref={`/player?id=${slugId}&type=series`}
        />
      </section>
    </div>
  );
}
