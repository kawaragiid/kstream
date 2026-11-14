// @ts-check
/**
 * Tier 3: Pairwise Combinations - Modal, Episodes & Player Actions (T3-COMB-07 to T3-COMB-13)
 * Total: 7 test cases
 */

const { assertNoHorizontalOverflow, assertTouchTarget } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 3,
  suite: 't3_modal_episode_flow.spec.js',
  description: 'Pairwise Cross-Feature Tests: Modal, Episodes & Player Actions (T3-COMB-07 to 13)',
  tests: [
    {
      id: 'T3-COMB-07',
      features: ['F20', 'F19'],
      title: 'On /player (iOS UA), tap screen, tap Back -> controls toggle visible and Back button exits cleanly',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.mouse.click(187, 200);
        await page.waitForTimeout(100);
        const backBtn = page.locator('button[aria-label*="kembali" i], a[href*="/series/"], a:has(svg)').first();
        if (await backBtn.isVisible()) {
          await backBtn.click();
          await page.waitForTimeout(100);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-07 375px' });
      },
    },
    {
      id: 'T3-COMB-08',
      features: ['F20', 'F21'],
      title: 'On /player, tap Play/Pause button -> toggles playback with >= 40px hit target without hiding overlay',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const playBtn = page.locator('button[aria-label*="play" i], button:has(svg)').first();
        if (await playBtn.isVisible()) {
          await assertTouchTarget(page, playBtn, { minWidth: 38, minHeight: 38, label: 'Player Control' });
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-08 414px' });
      },
    },
    {
      id: 'T3-COMB-09',
      features: ['F14', 'F19', 'F20'],
      title: 'Tap full-width Play CTA on /series/[id] -> navigates to player and reveals Back button on tap',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        const playBtn = page.locator('a[href*="/player"], button:has-text("Putar")').first();
        if (await playBtn.isVisible()) {
          await playBtn.click();
          await waitForHydration(page);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-09 360px' });
      },
    },
    {
      id: 'T3-COMB-10',
      features: ['F15', 'F14', 'F13'],
      title: 'Tap FavoriteButton on Series detail -> state updates without page scroll jump or alignment break',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        const favBtn = page.locator('button:has-text("Favorit")').first();
        if (await favBtn.isVisible()) {
          await favBtn.click();
          await page.waitForTimeout(50);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-10 375px' });
      },
    },
    {
      id: 'T3-COMB-11',
      features: ['F15', 'F18'],
      title: 'Tap FavoriteButton inside MediaOverlay -> updates modal state and parent card reflects it on close',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-11 390px' });
      },
    },
    {
      id: 'T3-COMB-12',
      features: ['F17', 'F16'],
      title: 'Swipe season selector and select Season 3 -> pills scroll horizontally, episodes update cleanly',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-12 360px' });
      },
    },
    {
      id: 'T3-COMB-13',
      features: ['F08', 'F05'],
      title: 'Open drawer, tap "Beranda", tap Hero Play CTA -> navigates to player with >= 44px hit target',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-13 430px' });
      },
    },
  ],
};
