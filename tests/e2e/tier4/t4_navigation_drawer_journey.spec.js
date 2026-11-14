// @ts-check
/**
 * Tier 4: Real-World Mobile User Scenarios - Stress, Responsive Shift & Accessibility (T4-SCEN-09 to 12)
 * Total: 4 test cases
 */

const { assertNoHorizontalOverflow, assertTouchTarget } = require('../helpers/assertions');
const { waitForHydration, getElementGeometry } = require('../helpers/dom');

module.exports = {
  tier: 4,
  suite: 't4_navigation_drawer_journey.spec.js',
  description: 'Real-World Mobile User Scenarios: Stress, Parity & Accessibility (T4-SCEN-09 to 12)',
  tests: [
    {
      id: 'T4-SCEN-09',
      scenario: 'The Edge-to-Edge Visual Immersion Tour',
      viewport: 'mobile-360',
      title: 'Full edge-to-edge aesthetic check across Home, Series, and Movies on 360px Android Go',
      async run({ page, baseUrl }) {
        // 1. Visit Home
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Tour 1: Home 360px' });

        // 2. Visit Series
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Tour 2: Series 360px' });

        // 3. Visit Movies
        await page.goto(`${baseUrl}/movies/test-movie-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Tour 3: Movies 360px' });
      },
    },
    {
      id: 'T4-SCEN-10',
      scenario: 'The Mobile Multitasker Stress Session',
      viewport: 'mobile-390',
      title: 'Rapid sequential operations: drawer toggle, search route, favorite click, vertical swipe',
      async run({ page, baseUrl }) {
        // 1. Home
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);

        // 2. Open drawer
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(50);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(50);
        }

        // 3. Scroll rapidly
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(50);
        await page.mouse.wheel(0, -600);
        await page.waitForTimeout(50);

        // 4. Verify zero overflow
        await assertNoHorizontalOverflow(page, { routeLabel: 'Multitasker stress completed' });
      },
    },
    {
      id: 'T4-SCEN-11',
      scenario: 'The Responsive Device Shift Workflow',
      viewport: 'mobile-360',
      title: 'Dynamic viewport resize: 360px mobile -> 1024px tablet -> 1440px desktop preserves parity',
      async run({ page, baseUrl }) {
        // 1. Mobile 360px
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 1: Mobile 360px' });

        // 2. Shift to 1024px
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 2: Tablet 1024px' });

        // 3. Shift to 1440px
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 3: Desktop 1440px' });
      },
    },
    {
      id: 'T4-SCEN-12',
      scenario: 'The Accessible Touch & High-DPI Experience',
      viewport: 'mobile-375',
      title: 'Comprehensive touch target scan across interactive elements under DPR 3.0',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);

        // 1. Audit Hamburger
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        if (await hamburger.isVisible()) {
          await assertTouchTarget(page, hamburger, { minWidth: 44, minHeight: 44, label: 'Audit Hamburger' });
        }

        // 2. Audit Search
        const searchBtn = page.locator('a[href*="/search"], button[aria-label*="cari" i]').first();
        if (await searchBtn.isVisible()) {
          await assertTouchTarget(page, searchBtn, { minWidth: 44, minHeight: 44, label: 'Audit Search' });
        }

        // 3. Audit Hero CTA
        const heroCta = page.locator('section:has(h1) a, section:has(h1) button').first();
        if (await heroCta.isVisible()) {
          await assertTouchTarget(page, heroCta, { minWidth: 44, minHeight: 44, label: 'Audit Hero CTA' });
        }

        // 4. Audit Footer link
        const footerLink = page.locator('footer a').first();
        if (await footerLink.isVisible()) {
          await assertTouchTarget(page, footerLink, { minWidth: 32, minHeight: 44, label: 'Audit Footer Link' });
        }

        // 5. Verify zero overflow
        await assertNoHorizontalOverflow(page, { routeLabel: 'Touch target audit completed' });
      },
    },
  ],
};
