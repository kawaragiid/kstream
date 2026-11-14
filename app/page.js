import { cache } from 'react';
import Link from 'next/link';
import HeroBanner from '../components/HeroBanner';
import SliderRow from '../components/SliderRow';
import HomeHistoryRow from '../components/HomeHistoryRow';
import Top10Row from '../components/Top10Row';

let getTrending;
let getNewReleases;
let getPlatformSettings;
let getVideosByGenre;
let getVideoById;

const getCachedPlatformSettings = cache(async () => {
  if (!getPlatformSettings) {
    try {
      ({ getPlatformSettings } = await import('../lib/firestoreServer'));
    } catch {
      return { hero: null, categories: [] };
    }
  }
  return getPlatformSettings().catch(() => ({ hero: null, categories: [] }));
});

async function loadData() {
  if (!getTrending || !getPlatformSettings) {
    try {
      ({
        getTrending,
        getNewReleases,
        getPlatformSettings,
        getVideosByGenre,
        getVideoById,
      } = await import('../lib/firestoreServer'));
    } catch (error) {
      console.warn('Data server belum siap:', error.message);
      getTrending = async () => [];
      getNewReleases = async () => [];
      getPlatformSettings = async () => ({ hero: null, categories: [] });
      getVideosByGenre = async () => [];
      getVideoById = async () => null;
    }
  }

  const [settings, trending, newReleases] = await Promise.all([
    getCachedPlatformSettings(),
    getTrending(24).catch(() => []),
    getNewReleases(24).catch(() => []),
  ]);

  const seenHeroKeys = new Set();
  const heroPool = [...trending, ...newReleases].filter((item) => {
    if (!item?.id) return false;
    const key = `${item.type || "movie"}-${item.id}`;
    if (seenHeroKeys.has(key)) return false;
    seenHeroKeys.add(key);
    return true;
  });

  // Deterministic slot so ISR / navigation keeps a consistent hero per 6-hour window
  const slotIndex =
    heroPool.length > 0 ? Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % heroPool.length : 0;
  let heroItem = heroPool.length > 0 ? heroPool[slotIndex] : null;
  let isCustomHeroMatched = false;

  if (settings?.hero?.mode !== "random" && settings?.hero?.contentId) {
    const customHero = await getVideoById(settings.hero.contentId).catch(() => null);
    if (customHero) {
      heroItem = customHero;
      isCustomHeroMatched = true;
    }
  }

  const allCategories = settings.categories || [];
  const curatedGenres = allCategories.slice(0, 4);
  const genreRows = await Promise.all(
    curatedGenres.map(async (genre) => ({
      genre,
      items: await getVideosByGenre(genre, 18).catch(() => []),
    }))
  );

  return {
    settings,
    trending,
    newReleases,
    heroItem,
    isCustomHeroMatched,
    genreRows,
    hasMoreCategories: allCategories.length > 4,
  };
}

export const revalidate = 300;

export default async function HomePage() {
  const {
    settings,
    trending,
    newReleases,
    heroItem,
    isCustomHeroMatched,
    genreRows,
    hasMoreCategories,
  } = await loadData();

  const useCustomHeroMeta = isCustomHeroMatched && settings?.hero?.mode !== "random";
  const heroBackground = useCustomHeroMeta
    ? settings.hero?.backgroundUrl || heroItem?.backdropUrl || heroItem?.posterUrl || ""
    : heroItem?.backdropUrl || heroItem?.posterUrl || "";
  const heroSubtitle = useCustomHeroMeta
    ? settings.hero?.subtitle || heroItem?.overview || "Nikmati film, series, dan konten favoritmu secara gratis."
    : heroItem?.overview || "Nikmati film, series, dan konten favoritmu secara gratis.";
  const heroTitle = useCustomHeroMeta
    ? settings.hero?.title || heroItem?.title || "Selamat datang di Kstream"
    : heroItem?.title || "Selamat datang di Kstream";

  const rawWatchHref = heroItem
    ? heroItem.watchHref ||
      `/player?id=${encodeURIComponent(heroItem.slug || heroItem.id)}&type=${heroItem.type === 'series' ? 'series' : 'movie'}`
    : '';
  const ctaHref = rawWatchHref
    ? rawWatchHref.includes('autoplay=')
      ? rawWatchHref
      : `${rawWatchHref}${rawWatchHref.includes('?') ? '&' : '?'}autoplay=1`
    : '/search';
  const detailHref = heroItem?.href || '';

  const remainingTrending = trending.slice(10);
  const visibleGenreRows = genreRows.filter(({ items }) => items.length > 0);
  const isCatalogEmpty =
    trending.length === 0 && newReleases.length === 0 && visibleGenreRows.length === 0;

  return (
    <div className="space-y-8 sm:space-y-12 pb-8 sm:pb-12">
      <div className="w-full">
        <HeroBanner
          title={heroTitle}
          subtitle={heroSubtitle}
          backdropUrl={heroBackground}
          ctaHref={ctaHref}
          ctaLabel="Tonton sekarang"
          detailHref={detailHref}
          badge={settings.hero?.badge || 'Sedang Populer'}
        />
      </div>

      {isCatalogEmpty ? (
        <div className="mx-auto w-full max-w-[120rem] px-4">
          <div className="rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <h2 className="text-lg font-semibold text-white">Katalog sedang disiapkan</h2>
            <p className="mt-2 text-sm text-white/60">
              Belum ada tayangan yang tersedia saat ini. Silakan cek kembali beberapa saat lagi atau gunakan pencarian.
            </p>
            <Link
              href="/search"
              className="mt-5 inline-flex min-h-[40px] items-center rounded-[4px] bg-[#E50914] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#f6121d]"
            >
              Cari Tayangan
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-10">
          <div className="mx-auto w-full max-w-[120rem] px-4">
            <Top10Row title="Top 10 Hari Ini" items={trending} />
          </div>
          {remainingTrending.length > 0 && (
            <div className="mx-auto w-full max-w-[120rem] px-4">
              <SliderRow title="Sedang Trending" items={remainingTrending} actionHref="/movies/trending" />
            </div>
          )}
          <HomeHistoryRow />
          <div className="mx-auto w-full max-w-[120rem] px-4">
            <SliderRow title="Baru Rilis" items={newReleases} actionHref="/movies/new" />
          </div>
          {visibleGenreRows.map(({ genre, items }) => (
            <div key={genre} className="mx-auto w-full max-w-[120rem] px-4">
              <SliderRow
                title={`Genre: ${genre}`}
                items={items}
                actionHref={`/category/${encodeURIComponent(genre.toLowerCase())}`}
              />
            </div>
          ))}
          {hasMoreCategories && (
            <div className="mx-auto flex w-full max-w-[120rem] justify-end px-4">
              <Link
                href="/search"
                className="text-xs font-semibold uppercase tracking-widest text-white/60 transition hover:text-white"
              >
                Lihat semua kategori &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
