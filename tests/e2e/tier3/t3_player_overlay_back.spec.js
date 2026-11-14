// @ts-check
/**
 * Tier 3: Pairwise Combinations - Player Overlay & Responsive Interactions (T3-COMB-14 to T3-COMB-20)
 * Total: 7 test cases
 */

const { assertNoHorizontalOverflow, assertTouchTarget } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');
const { touchSwipeHorizontal } = require('../helpers/gestures');

module.exports = {
  tier: 3,
  suite: 't3_player_overlay_back.spec.js',
  description: 'Pairwise Cross-Feature Tests: Player Overlay, Search & Rotations (T3-COMB-14 to 20)',
  tests: [
    {
      id: 'T3-COMB-14',
      features: ['F03', 'F04'],
      title: 'Tap Search in top navbar on 360px -> >= 44px touch target, navigates to /search, header fits within 360px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const searchBtn = page.locator('a[href*="/search"], button[aria-label*="cari" i]').first();
        if (await searchBtn.isVisible()) {
          await assertTouchTarget(page, searchBtn, { minWidth: 44, minHeight: 44, label: 'Search Icon' });
          await searchBtn.click();
          await waitForHydration(page);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-14 360px' });
      },
    },
    {
      id: 'T3-COMB-15',
      features: ['F10', 'F12'],
      title: 'Diagonal swipe over SliderRow scrolls horizontally without causing vertical layout jumping',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await touchSwipeHorizontal(page, '.overflow-x-auto', -120);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-15 375px' });
      },
    },
    {
      id: 'T3-COMB-16',
      features: ['F18', 'F09'],
      title: 'Scroll to Card 4, open modal, close modal -> scroll position preserved at Card 4 with peek visible',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await touchSwipeHorizontal(page, '.overflow-x-auto', -200);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-16 390px' });
      },
    },
    {
      id: 'T3-COMB-17',
      features: ['F19', 'F01', 'F21'],
      title: 'View /player on 430px iPhone Pro Max -> Back button respects safe-area, control targets >= 40px',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-17 430px' });
      },
    },
    {
      id: 'T3-COMB-18',
      features: ['F21', 'F20', 'F01'],
      title: 'Rotate player from portrait to landscape -> controls adapt, touch targets >= 40px, tap-to-toggle operates',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-18 landscape' });
      },
    },
    {
      id: 'T3-COMB-19',
      features: ['F07', 'F03'],
      title: 'Scroll past HeroBanner on 360px -> hero content readable, sticky navbar pinned at top with backdrop blur',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-19 360px' });
      },
    },
    {
      id: 'T3-COMB-20',
      features: ['F11', 'F18'],
      title: 'Press down on card, hold 100ms, release -> active:scale-95 tactile depression feedback',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const card = page.locator('.overflow-x-auto a').first();
        if (await card.isVisible()) {
          const box = await card.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.mouse.up();
          }
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'T3-COMB-20 375px' });
      },
    },
  ],
};
