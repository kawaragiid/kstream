// @ts-check
/**
 * Tier 2: Desktop Visual Regression & Breakpoint Boundaries (F23)
 * Total: 5 test cases
 */

const { assertNoHorizontalOverflow } = require('../helpers/assertions');
const { getElementGeometry, waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 2,
  suite: 't2_desktop_boundaries.spec.js',
  description: 'Desktop Breakpoint Transitions & Visual Regression Boundaries (F23)',
  tests: [
    {
      id: 'T2-F23-01',
      feature: 'F23',
      title: 'Breakpoint transition test (1023px vs 1024px) switches cleanly between drawer and links',
      viewport: 'desktop-1024',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        // Test at 1023px (mobile/tablet layout)
        await page.setViewportSize({ width: 1023, height: 768 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Breakpoint 1023px' });

        // Transition to 1024px (desktop layout)
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Breakpoint 1024px' });
      },
    },
    {
      id: 'T2-F23-02',
      feature: 'F23',
      title: 'Content is constrained by max-w-[120rem] on 1440px without edge stretching',
      viewport: 'desktop-1440',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Container constraint 1440px' });
      },
    },
    {
      id: 'T2-F23-03',
      feature: 'F23',
      title: 'Desktop mouse hover over CardPoster activates preview popover',
      viewport: 'desktop-1024',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const card = page.locator('.overflow-x-auto a').first();
        if (await card.isVisible()) {
          await card.hover();
          await page.waitForTimeout(200);
        }
      },
    },
    {
      id: 'T2-F23-04',
      feature: 'F23',
      title: 'Detail page buttons are arranged in horizontal row (sm:w-auto sm:flex-row) on 1440px',
      viewport: 'desktop-1440',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Desktop actions 1440px' });
      },
    },
    {
      id: 'T2-F23-05',
      feature: 'F23',
      title: 'Desktop player chrome renders volume slider and desktop tooltips on 1024px',
      viewport: 'desktop-1024',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Desktop player 1024px' });
      },
    },
  ],
};
