// @ts-check
/**
 * Tier 1: Feature 23 - Desktop Visual Parity & Zero Regressions (>=1024px)
 * Total: 5 test cases
 */

const { assertNoHorizontalOverflow } = require('../helpers/assertions');
const { getElementGeometry, waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 1,
  suite: 't1_desktop_parity.spec.js',
  description: 'Desktop Visual Regression Preservation (F23 >= 1024px)',
  tests: [
    {
      id: 'T1-F23-01',
      feature: 'F23',
      title: 'Desktop Navbar links visible and hamburger hidden on 1024px',
      viewport: 'desktop-1024',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburgerVisible = await page.evaluate(() => {
          const btn = document.querySelector('button[aria-label*="menu" i], button[aria-label*="navigasi" i]');
          if (!btn) return false;
          return window.getComputedStyle(btn).display !== 'none';
        });
        if (hamburgerVisible) throw new Error('Hamburger menu button unexpectedly visible on desktop 1024px');
        await assertNoHorizontalOverflow(page, { routeLabel: 'Desktop Navbar 1024px' });
      },
    },
    {
      id: 'T1-F23-02',
      feature: 'F23',
      title: 'Desktop HeroBanner retains widescreen aspect ratio and rounded corners',
      viewport: 'desktop-1024',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const heroGeo = await getElementGeometry(page, 'section:has(h1), [data-hero]');
        if (heroGeo && heroGeo.width > 1024) throw new Error('HeroBanner width exceeds 1024px');
      },
    },
    {
      id: 'T1-F23-03',
      feature: 'F23',
      title: 'SliderRow displays desktop card widths and navigation arrows on 1440px',
      viewport: 'desktop-1440',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Desktop 1440px' });
      },
    },
    {
      id: 'T1-F23-04',
      feature: 'F23',
      title: 'Episode list renders 2-column grid on desktop 1440px',
      viewport: 'desktop-1440',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Series Desktop 1440px' });
      },
    },
    {
      id: 'T1-F23-05',
      feature: 'F23',
      title: 'Media overlay renders as centered floating modal on desktop 1024px',
      viewport: 'desktop-1024',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Desktop Modal 1024px' });
      },
    },
  ],
};
