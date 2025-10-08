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

  let heroItem = trending[0] || newReleases[0] || null;
  if (settings?.hero?.contentId) {
    heroItem = (await getVideoById(settings.hero.contentId).catch(() => null)) || heroItem;
  }

  const curatedGenres = (settings.categories || []).slice(0, 3);
  const genreRows = await Promise.all(
    curatedGenres.map(async (genre) => ({
      genre,
      items: await getVideosByGenre(genre, 18).catch(() => []),
    }))
  );

  return { settings, trending, newReleases, heroItem, genreRows };
}

export const revalidate = 60;

export default async function HomePage() {
  const { settings, trending, newReleases, heroItem, genreRows } = await loadData();
  const heroBackground = settings.hero?.backgroundUrl || heroItem?.backdropUrl || heroItem?.posterUrl || '';
  const heroSubtitle = settings.hero?.subtitle || heroItem?.overview || 'Nikmati film, series, dan konten favoritmu.';
  const heroTitle = settings.hero?.title || heroItem?.title || 'Selamat datang di Kstream';
  const ctaHref = heroItem
    ? heroItem.watchHref ||
      `/player?id=${encodeURIComponent(heroItem.slug || heroItem.id)}&type=${heroItem.type === 'series' ? 'series' : 'movie'}`
    : '/search';

  return (
    <div className="space-y-12 pb-12">
      <div className="mx-auto w-full max-w-[120rem] px-4 pt-6">
        <HeroBanner
          title={heroTitle}
          subtitle={heroSubtitle}
          backdropUrl={heroBackground}
          ctaHref={ctaHref}
          ctaLabel="Tonton sekarang"
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
        {genreRows.map(({ genre, items }) => (
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
