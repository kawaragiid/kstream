import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodeList from "../../../../components/EpisodeList";
import FavoriteButton from "../../../../components/FavoriteButton";
import SliderRow from "../../../../components/SliderRow";

let dataModule = null;

async function ensureDataModule() {
  if (!dataModule) {
    try {
      dataModule = await import("../../../../lib/firestoreServer");
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
  const series = await getVideoById(id, "series").catch(() => null);
  if (!series) return { title: "Detail Series - Kstream" };
  return {
    title: `${series.title} - Kstream`,
    description: series.overview,
  };
}

export default async function SeriesDetailPage({ params }) {
  const { getVideoById, getSeriesEpisodes, getVideosByGenre } = await ensureDataModule();
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
  const similarGenre = series.genres?.[0] || series.category;
  const recommendations = similarGenre
    ? await getVideosByGenre(similarGenre, 18, { excludeId: series.id }).catch(() => [])
    : [];
  const slugId = encodeURIComponent(series.slug || series.id);
  const baseHref = `/series/${slugId}`;
  const releaseYear = series.releaseYear || (series.releaseDate ? new Date(series.releaseDate).getFullYear() : null);
  const seasonCount = Math.max(
    Number(series.totalSeasons || 1),
    ...(episodes.length ? episodes.map((ep) => Number(ep.seasonNumber || 1)) : [1])
  );
  const primaryEpisode = episodes.find((ep) => ep.playbackId || ep.streamUrl) || episodes?.[0];
  const watchHref = primaryEpisode?.id
    ? `/player?id=${slugId}&type=series&ep=${encodeURIComponent(primaryEpisode.id)}&autoplay=1`
    : series.watchHref || `/player?id=${slugId}&type=series`;

  const genrePills = Array.isArray(series.genres) && series.genres.length > 0
    ? series.genres
    : [series.category].filter(Boolean);
  const originInfo = [series.country, series.language].filter(Boolean).join(" • ");

  return (
    <div className="space-y-10 sm:space-y-14 pb-12 sm:pb-16">
      <div className="w-full">
        <section className="relative -mt-16 sm:-mt-20 w-full min-h-[70vh] sm:min-h-[78vh] overflow-hidden bg-black text-white">
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/35 to-black/40" />
          <div className="relative z-10 mx-auto flex min-h-[70vh] sm:min-h-[78vh] w-full max-w-[120rem] flex-col justify-end gap-4 sm:gap-6 px-4 pb-10 pt-28 sm:px-8 sm:pb-14 lg:px-12">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight break-words drop-shadow-lg">{series.title}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-semibold tracking-wider text-white/85">
                {releaseYear && <span>{releaseYear}</span>}
                {series.maturityRating && (
                  <span className="rounded-sm border border-white/40 bg-white/10 px-2 py-0.5 text-[11px] uppercase">
                    {series.maturityRating}
                  </span>
                )}
                <span>{seasonCount} Season</span>
                {series.status && (
                  <span className="rounded-sm bg-emerald-500/20 px-2 py-0.5 text-[11px] uppercase text-emerald-300 border border-emerald-400/30">
                    {series.status}
                  </span>
                )}
                {genrePills.map((genre) => (
                  <span key={genre} className="text-white/75">
                    • {genre}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-white/85 md:text-base break-words line-clamp-4">{series.overview}</p>
              {(series.cast?.length > 0 || series.director || originInfo) && (
                <div className="grid gap-1 pt-1 text-xs text-white/70 sm:text-sm">
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

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5">
              {episodes.length > 0 && (
                <Link
                  href={watchHref}
                  className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-2 rounded-[4px] bg-white px-7 py-2.5 font-bold text-black shadow-lg hover:bg-white/85 active:scale-95 transition text-sm sm:text-base"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
                  </svg>
                  Putar {primaryEpisode?.number ? `S${String(primaryEpisode.seasonNumber || 1).padStart(2, "0")}E${String(primaryEpisode.number).padStart(2, "0")}` : "Episode 1"}
                </Link>
              )}
              <FavoriteButton
                video={{ ...series, href: baseHref, watchHref }}
                className="w-full sm:w-auto min-h-[44px] justify-center rounded-[4px] bg-white/15 hover:bg-white/25 border-white/25"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-[120rem] space-y-6 px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Episode</h2>
          {episodes.length > 0 && (
            <span className="text-xs uppercase tracking-widest text-white/50">{episodes.length} episode</span>
          )}
        </div>
        <EpisodeList
          episodes={episodes}
          baseHref={`/player?id=${slugId}&type=series`}
        />
      </section>

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
