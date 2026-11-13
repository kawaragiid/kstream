import HeroBanner from '../components/HeroBanner';
import SliderRow from '../components/SliderRow';
import HomeHistoryRow from '../components/HomeHistoryRow';

let getTrending;
let getNewReleases;
let getPlatformSettings;
let getVideosByGenre;
let getVideoById;

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
      console.warn('Firestore admin belum siap:', error.message);
      getTrending = async () => [];
      getNewReleases = async () => [];
      getPlatformSettings = async () => ({ hero: null, categories: [] });
      getVideosByGenre = async () => [];
      getVideoById = async () => null;
    }
  }

  const [settings, trending, newReleases] = await Promise.all([
    getPlatformSettings().catch(() => ({ hero: null, categories: [] })),
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

  let heroItem = heroPool.length > 0 ? heroPool[Math.floor(Math.random() * heroPool.length)] : null;
  if (settings?.hero?.mode !== "random" && settings?.hero?.contentId) {
    heroItem = (await getVideoById(settings.hero.contentId).catch(() => null)) || heroItem;
  }

  const curatedGenres = (settings.categories || []).slice(0, 4);
  const genreRows = await Promise.all(
    curatedGenres.map(async (genre) => ({
      genre,
      items: await getVideosByGenre(genre, 18).catch(() => []),
    }))
  );

  return { settings, trending, newReleases, heroItem, genreRows };
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { settings, trending, newReleases, heroItem, genreRows } = await loadData();
  const isRandomHero = settings?.hero?.mode === "random" || !settings?.hero?.contentId;
  const heroBackground = isRandomHero
    ? heroItem?.backdropUrl || heroItem?.posterUrl || ""
    : settings.hero?.backgroundUrl || heroItem?.backdropUrl || heroItem?.posterUrl || "";
  const heroSubtitle = isRandomHero
    ? heroItem?.overview || "Nikmati film, series, dan konten favoritmu secara gratis."
    : settings.hero?.subtitle || heroItem?.overview || "Nikmati film, series, dan konten favoritmu secara gratis.";
  const heroTitle = isRandomHero
    ? heroItem?.title || "Selamat datang di Kstream"
    : settings.hero?.title || heroItem?.title || "Selamat datang di Kstream";
  const ctaHref = heroItem
    ? heroItem.watchHref ||
      `/player?id=${encodeURIComponent(heroItem.slug || heroItem.id)}&type=${heroItem.type === 'series' ? 'series' : 'movie'}`
    : '/search';
  const detailHref = heroItem?.href || '';

  return (
    <div className="space-y-12 pb-12">
      <div className="mx-auto w-full max-w-[120rem] px-4 pt-6">
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

      <div className="space-y-10">
        <div className="mx-auto w-full max-w-[120rem] px-4">
          <SliderRow title="Sedang Trending" items={trending} actionHref="/movies/trending" />
        </div>
        <HomeHistoryRow />
        <div className="mx-auto w-full max-w-[120rem] px-4">
          <SliderRow title="Baru Rilis" items={newReleases} actionHref="/movies/new" />
        </div>
        {genreRows
          .filter(({ items }) => items.length > 0)
          .map(({ genre, items }) => (
            <div key={genre} className="mx-auto w-full max-w-[120rem] px-4">
              <SliderRow
                title={`Genre: ${genre}`}
                items={items}
                actionHref={`/category/${encodeURIComponent(genre.toLowerCase())}`}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
