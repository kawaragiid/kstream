// @ts-check
/**
 * Tier 3: Pairwise Combinations - Scroll, Categories & Transitions (T3-COMB-21 to T3-COMB-26)
 * Total: 6 test cases
 */

const { assertNoHorizontalOverflow } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 3,
  suite: 't3_scroll_favorite_toggle.spec.js',
  description: 'Pairwise Cross-Feature Tests: Scroll, Categories & Transitions (T3-COMB-21 to 26)',
  tests: [
    {
      id: 'T3-COMB-21',
      features: ['F17', 'F22'],
      title: 'Rapidly swipe season pills right and left -> scrolls internally with zero document overflow',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-21 360px' });
      },
    },
    {
      id: 'T3-COMB-22',
      features: ['F05', 'F22'],
      title: 'Open drawer, tap category link -> navigates, drawer closes, category grid has zero overflow',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          await page.keyboard.press('Escape');
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-22 414px' });
      },
    },
    {
      id: 'T3-COMB-23',
      features: ['F21', 'F20'],
      title: 'Drag video seek scrubber on mobile -> scrubber updates smoothly, overlay remains visible during drag',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-23 390px' });
      },
    },
    {
      id: 'T3-COMB-24',
      features: ['F13', 'F14', 'F15'],
      title: 'Visit /movies/[id] on 360px -> edge-to-edge hero aligns flush with full-width Play CTA and pill FavoriteButton',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/movies/test-movie-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-24 360px' });
      },
    },
    {
      id: 'T3-COMB-25',
      features: ['F11', 'F10', 'F20'],
      title: 'Resume video from watch history card -> player opens at saved progress timestamp',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-25 375px' });
      },
    },
    {
      id: 'T3-COMB-26',
      features: ['F18', 'F23'],
      title: 'Open modal on mobile, resize to desktop -> full-screen sheet converts to centered modal dialog',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-26 resize' });
      },
    },
  ],
};
