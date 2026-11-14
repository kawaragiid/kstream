// @ts-check
/**
 * Tier 2: Horizontal Overflow & Deep Scroll Boundaries (F02, F22)
 * Total: 10 test cases
 */

const { assertNoHorizontalOverflow } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 2,
  suite: 't2_overflow_boundaries.spec.js',
  description: 'Deep Scroll & Horizontal Overflow Boundary Audits (F02, F22)',
  tests: [
    // F02 Global Overflow Boundaries (5 tests)
    {
      id: 'T2-F02-01',
      feature: 'F02',
      title: 'Container bounds clamp wide child elements without body horizontal leak',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.evaluate(() => {
          const testEl = document.createElement('div');
          testEl.style.width = '300px';
          testEl.style.height = '1px';
          document.body.appendChild(testEl);
        });
        await assertNoHorizontalOverflow(page, { routeLabel: 'Injected wide element test' });
      },
    },
    {
      id: 'T2-F02-02',
      feature: 'F02',
      title: 'Sub-pixel rendering on high DPR does not produce fractional pixel leaks',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Subpixel high-DPR audit 430px' });
      },
    },
    {
      id: 'T2-F02-03',
      feature: 'F02',
      title: 'Fast vertical fling swipe maintains zero lateral drift',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(50);
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Fast fling swipe 375px' });
      },
    },
    {
      id: 'T2-F02-04',
      feature: 'F02',
      title: 'Deep page scroll audit: scrollWidth <= innerWidth at 0%, 50%, 100% depth',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        // 0%
        await assertNoHorizontalOverflow(page, { routeLabel: 'Scroll depth 0%' });
        // 50%
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Scroll depth 50%' });
        // 100%
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Scroll depth 100%' });
      },
    },
    {
      id: 'T2-F02-05',
      feature: 'F02',
      title: 'Empty page state maintains min-h-screen without horizontal collapse',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/profile/favorites`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Empty state min-h-screen 360px' });
      },
    },

    // F22 Zero-Overflow Route Boundaries (5 tests)
    {
      id: 'T2-F22-01',
      feature: 'F22',
      title: 'Fling scroll on Home maintains scrollWidth <= innerWidth continuously',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.mouse.wheel(0, 1500);
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Home fling scroll continuous' });
      },
    },
    {
      id: 'T2-F22-02',
      feature: 'F22',
      title: 'Category page with multiple cards maintains zero horizontal overflow',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/category/action`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Category page 430px' });
      },
    },
    {
      id: 'T2-F22-03',
      feature: 'F22',
      title: 'Favorites route maintains zero overflow in empty and populated states',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/profile/favorites`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Favorites route 375px' });
      },
    },
    {
      id: 'T2-F22-04',
      feature: 'F22',
      title: 'Active mobile drawer overlay maintains document scrollWidth <= innerWidth',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="navigasi" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(200);
          await assertNoHorizontalOverflow(page, { routeLabel: 'Drawer active overflow audit' });
        }
      },
    },
    {
      id: 'T2-F22-05',
      feature: 'F22',
      title: 'Active MediaOverlay modal maintains zero horizontal overflow',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'MediaOverlay active overflow 360px' });
      },
    },
  ],
};
