// @ts-check
/**
 * Test Route Paths and Fixture Data Descriptors
 */

const TEST_ROUTES = {
  HOME: '/',
  SERIES_DETAIL: '/series/test-series-1',
  MOVIE_DETAIL: '/movies/test-movie-1',
  PLAYER: '/player?id=test-series-1&type=series&ep=1',
  SEARCH: '/search',
  FAVORITES: '/profile/favorites',
  HISTORY: '/profile/history',
  CATEGORY_TRENDING: '/movies/trending',
  CATEGORY_ACTION: '/category/action',
};

const MOCK_MEDIA = {
  series: {
    id: 'test-series-1',
    title: 'Kstream Series Chronicles',
    description: 'Petualangan fantasi epik dalam dunia streaming modern yang penuh intrik dan aksi tak terduga.',
    rating: '18+',
    year: '2025',
    duration: '2 Season',
    genres: ['Action', 'Fantasy', 'Adventure', 'Drama'],
    backdropUrl: '/images/hero-backdrop.jpg',
    posterUrl: '/images/hero-poster.jpg',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1: Kebangkitan',
        episodes: [
          { id: 'ep-1', episodeNumber: 1, title: 'Awal Perjalanan', duration: '48m', overview: 'Pertemuan pertama para pejuang streaming.' },
          { id: 'ep-2', episodeNumber: 2, title: 'Ujian Pertama', duration: '52m', overview: 'Menghadapi rintangan di medan pertempuran.' },
          { id: 'ep-3', episodeNumber: 3, title: 'Aliansi Tersembunyi', duration: '45m', overview: 'Membentuk persekutuan baru.' },
        ],
      },
      {
        seasonNumber: 2,
        title: 'Season 2: Pertarungan Takdir',
        episodes: [
          { id: 'ep-4', episodeNumber: 1, title: 'Garis Depan', duration: '50m', overview: 'Musuh baru muncul dari kegelapan.' },
          { id: 'ep-5', episodeNumber: 2, title: 'Pertarungan Terakhir', duration: '58m', overview: 'Puncak pertempuran menentukan segalanya.' },
        ],
      },
    ],
  },
  movie: {
    id: 'test-movie-1',
    title: 'Kstream The Movie: Eclipse',
    description: 'Sebuah film blockbuster bioskop dengan sinematografi memukau dan efek visual menakjubkan.',
    rating: '13+',
    year: '2024',
    duration: '2j 15m',
    genres: ['Action', 'Sci-Fi'],
    backdropUrl: '/images/movie-backdrop.jpg',
    posterUrl: '/images/movie-poster.jpg',
  },
};

module.exports = {
  TEST_ROUTES,
  MOCK_MEDIA,
};
