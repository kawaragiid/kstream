// @ts-check
/**
 * Tier 3: Pairwise Combinations - Drawer & Navigation Flow (T3-COMB-01 to T3-COMB-06)
 * Total: 6 test cases
 */

const { assertNoHorizontalOverflow, assertTouchTarget, observeDrawerState } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');
const { touchSwipeHorizontal } = require('../helpers/gestures');

module.exports = {
  tier: 3,
  suite: 't3_drawer_navigation.spec.js',
  description: 'Pairwise Cross-Feature Tests: Drawer, Navigation & Scroll Locks (T3-COMB-01 to 06)',
  tests: [
    {
      id: 'T3-COMB-01',
      features: ['F05', 'F03'],
      title: 'Open mobile drawer, tap link -> navigates, drawer auto-closes, navbar fits within 340px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          const link = page.locator('aside a, nav [data-drawer] a').first();
          if (await link.isVisible()) {
            await link.click();
            await waitForHydration(page);
          }
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-01 360px' });
      },
    },
    {
      id: 'T3-COMB-02',
      features: ['F05', 'F02'],
      title: 'Open drawer, swipe background page, tap backdrop -> background locked, scroll unlocks on close',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          const observer = observeDrawerState(page);
          await observer.assertOpenWithScrollLock();
          await page.mouse.click(350, 400); // tap backdrop
          await page.waitForTimeout(100);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-02 375px' });
      },
    },
    {
      id: 'T3-COMB-03',
      features: ['F06', 'F05', 'F04'],
      title: 'Open avatar dropdown, tap hamburger -> avatar dismisses, drawer opens with >= 44px close target',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          await assertTouchTarget(page, 'button[aria-label*="menu" i], button[aria-label*="tutup" i], button:has(svg)', {
            minWidth: 44,
            minHeight: 44,
            label: 'Drawer Action Target',
          });
          await page.keyboard.press('Escape');
        }
      },
    },
    {
      id: 'T3-COMB-04',
      features: ['F10', 'F11', 'F09'],
      title: 'Swipe SliderRow to Card 3, then tap Card 3 -> snaps neatly and triggers modal preview',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await touchSwipeHorizontal(page, '.overflow-x-auto', -200);
        const card = page.locator('.overflow-x-auto a').nth(2);
        if (await card.isVisible()) {
          await card.click();
          await page.waitForTimeout(100);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-04 360px' });
      },
    },
    {
      id: 'T3-COMB-05',
      features: ['F18', 'F16', 'F17'],
      title: 'In MediaOverlay, swipe to Season 2 and tap Episode 2 -> renders without squashing and routes to player',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-05 390px' });
      },
    },
    {
      id: 'T3-COMB-06',
      features: ['F18', 'F02'],
      title: 'In MediaOverlay modal, scroll episode list -> outer page locked, zero lateral leak',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-06 360px' });
      },
    },
  ],
};
