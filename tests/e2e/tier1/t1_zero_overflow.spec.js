// @ts-check
/**
 * Tier 1: Feature 22 - Cross-Route Zero Horizontal Overflow Verification
 * Total: 5 test cases
 */

const { assertNoHorizontalOverflow } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 1,
  suite: 't1_zero_overflow.spec.js',
  description: 'Cross-Route Zero Horizontal Overflow Audit (F22)',
  tests: [
    {
      id: 'T1-F22-01',
      feature: 'F22',
      title: 'Home route (/) has scrollWidth <= innerWidth on 360px viewport',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Route / (Home 360px)' });
      },
    },
    {
      id: 'T1-F22-02',
      feature: 'F22',
      title: 'Series detail route (/series/[id]) has zero horizontal overflow on 375px',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Route /series/test-series-1 (375px)' });
      },
    },
    {
      id: 'T1-F22-03',
      feature: 'F22',
      title: 'Movie detail route (/movies/[id]) has zero horizontal overflow on 390px',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/movies/test-movie-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Route /movies/test-movie-1 (390px)' });
      },
    },
    {
      id: 'T1-F22-04',
      feature: 'F22',
      title: 'Search route (/search) has zero horizontal overflow on 414px',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/search`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Route /search (414px)' });
      },
    },
    {
      id: 'T1-F22-05',
      feature: 'F22',
      title: 'Player route (/player) has zero horizontal overflow on 430px',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-series-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Route /player (430px)' });
      },
    },
  ],
};
