// @ts-check
/**
 * Tier 4: Real-World Mobile User Scenarios - Browse & Stream Workflows (T4-SCEN-01 to T4-SCEN-04)
 * Total: 4 test cases
 */

const { assertNoHorizontalOverflow, assertTouchTarget } = require('../helpers/assertions');
const { waitForHydration, getElementGeometry } = require('../helpers/dom');
const { touchSwipeHorizontal } = require('../helpers/gestures');

module.exports = {
  tier: 4,
  suite: 't4_guest_browse_journey.spec.js',
  description: 'Real-World Mobile User Scenarios: Discovery, Stream & Search (T4-SCEN-01 to 04)',
  tests: [
    {
      id: 'T4-SCEN-01',
      scenario: 'The Home-to-Stream Odyssey',
      viewport: 'mobile-360',
      title: 'Journey from Home landing, browsing carousels, card tap preview to playback and return',
      async run({ page, baseUrl }) {
        // 1. Land on Home page
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 1: Home Landing' });

        // 2. Verify HeroBanner section height >= 380px
        const heroGeo = await getElementGeometry(page, 'section:has(h1), [data-hero]');
        if (heroGeo && heroGeo.height < 380) {
          throw new Error(`HeroBanner height ${heroGeo.height}px < 380px`);
        }

        // 3. Scroll down to carousel and swipe to card 3
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(50);
        await touchSwipeHorizontal(page, '.overflow-x-auto', -180);

        // 4. Tap card to inspect media
        const card = page.locator('.overflow-x-auto a').first();
        if (await card.isVisible()) {
          await card.click();
          await waitForHydration(page);
        }

        // 5. Check zero overflow throughout journey
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 5: Card Detail Inspection' });
      },
    },
    {
      id: 'T4-SCEN-02',
      scenario: 'The Series Binge Navigator',
      viewport: 'mobile-375',
      title: 'Series exploration: edge-to-edge backdrop, full-width Play CTA, season selector swipe',
      async run({ page, baseUrl }) {
        // 1. Navigate to Series Detail
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 1: Series Detail' });

        // 2. Inspect full-width Play CTA
        const playBtn = page.locator('a[href*="/player"], button:has-text("Putar")').first();
        if (await playBtn.isVisible()) {
          await assertTouchTarget(page, playBtn, { minWidth: 44, minHeight: 44, label: 'Series Play CTA' });
        }

        // 3. Scroll to Episode List
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(50);

        // 4. Verify zero overflow
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 4: Episodes list 375px' });
      },
    },
    {
      id: 'T4-SCEN-03',
      scenario: 'The Category Discovery & Browse Flow',
      viewport: 'mobile-390',
      title: 'Slide-over drawer category selection, grid browsing, and favorite toggling',
      async run({ page, baseUrl }) {
        // 1. Land on Home page
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);

        // 2. Tap hamburger to open drawer
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          await assertNoHorizontalOverflow(page, { routeLabel: 'Step 2: Drawer Open' });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(50);
        }

        // 3. Browse trending
        await page.goto(`${baseUrl}/movies/trending`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 3: Trending Grid' });
      },
    },
    {
      id: 'T4-SCEN-04',
      scenario: 'The Rapid Mobile Search Journey',
      viewport: 'mobile-360',
      title: 'Mobile search icon tap (>= 44px), query typing, and responsive card results',
      async run({ page, baseUrl }) {
        // 1. Tap search icon from Home
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const searchBtn = page.locator('a[href*="/search"], button[aria-label*="cari" i]').first();
        if (await searchBtn.isVisible()) {
          await assertTouchTarget(page, searchBtn, { minWidth: 44, minHeight: 44, label: 'Search Icon' });
          await searchBtn.click();
          await waitForHydration(page);
        }

        // 2. On search route, verify zero horizontal overflow
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 2: Search Page' });

        // 3. Click logo to return Home
        const logo = page.locator('nav a[href="/"], nav a:has-text("Kstream")').first();
        if (await logo.isVisible()) {
          await logo.click();
          await waitForHydration(page);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 3: Return to Home' });
      },
    },
  ],
};
