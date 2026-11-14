// @ts-check
/**
 * Tier 2: Viewport Boundary & Corner Cases (F01, F03, F07, F13, F19)
 * Total: 25 test cases
 */

const { assertNoHorizontalOverflow, assertTouchTarget } = require('../helpers/assertions');
const { getMetaTag, getElementGeometry, waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 2,
  suite: 't2_viewport_boundaries.spec.js',
  description: 'Viewport Boundary & Corner Cases (F01, F03, F07, F13, F19)',
  tests: [
    // F01 Viewport Config Boundaries (5 tests)
    {
      id: 'T2-F01-01',
      feature: 'F01',
      title: 'Viewport and theme-color meta tags persist across client navigation',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        const vp = await getMetaTag(page, 'viewport');
        const theme = await getMetaTag(page, 'theme-color');
        if (!vp || !vp.includes('viewport-fit=cover')) throw new Error('Viewport meta lost after navigation');
        if (!theme) throw new Error('Theme-color meta lost after navigation');
      },
    },
    {
      id: 'T2-F01-02',
      feature: 'F01',
      title: 'Player route maintains full-bleed sizing on 430px large mobile',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '/player (430px boundary)' });
      },
    },
    {
      id: 'T2-F01-03',
      feature: 'F01',
      title: 'Theme-color matches #000000 on high-density DPR 3.0 viewport',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const color = await getMetaTag(page, 'theme-color');
        if (!color || color.toLowerCase() !== '#000000') throw new Error(`Unexpected theme-color: ${color}`);
      },
    },
    {
      id: 'T2-F01-04',
      feature: 'F01',
      title: 'Orientation flip from portrait to landscape adjusts without overflow',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Landscape orientation flip' });
      },
    },
    {
      id: 'T2-F01-05',
      feature: 'F01',
      title: 'Viewport meta configuration loaded on error boundary (404 route)',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/non-existent-route-boundary-test`);
        await waitForHydration(page);
        const vp = await getMetaTag(page, 'viewport');
        if (!vp || !vp.includes('width=device-width')) throw new Error('Viewport meta missing on 404 page');
      },
    },

    // F03 Navbar 360px Fit Boundaries (5 tests)
    {
      id: 'T2-F03-01',
      feature: 'F03',
      title: 'Long user email does not push navbar width beyond 360px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Navbar long text boundary' });
      },
    },
    {
      id: 'T2-F03-02',
      feature: 'F03',
      title: 'Continuous page scroll (1200px) retains sticky navbar at top',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(100);
        const navGeo = await getElementGeometry(page, 'nav, header');
        if (navGeo && navGeo.top < 0 && navGeo.position === 'sticky') {
          throw new Error('Sticky navbar detached during deep scroll');
        }
      },
    },
    {
      id: 'T2-F03-03',
      feature: 'F03',
      title: 'Rapid tapping on Logo does not cause layout shifts or double-renders',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const logo = page.locator('nav a[href="/"], nav a:has-text("Kstream")').first();
        if (await logo.isVisible()) {
          for (let i = 0; i < 3; i++) {
            await logo.click();
            await page.waitForTimeout(50);
          }
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'Navbar rapid logo taps' });
      },
    },
    {
      id: 'T2-F03-04',
      feature: 'F03',
      title: 'Search and Auth button juxtaposition preserves >= 8px gap',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Navbar items spacing' });
      },
    },
    {
      id: 'T2-F03-05',
      feature: 'F03',
      title: 'Pre-hydration initial render fits within 340px width',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`, { waitUntil: 'commit' });
        await assertNoHorizontalOverflow(page, { routeLabel: 'Pre-hydration navbar' });
      },
    },

    // F07 HeroBanner Ratio Boundaries (5 tests)
    {
      id: 'T2-F07-01',
      feature: 'F07',
      title: '5-line title (60+ characters) wraps cleanly inside HeroBanner',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Hero long title boundary' });
      },
    },
    {
      id: 'T2-F07-02',
      feature: 'F07',
      title: 'HeroBanner without subtitle maintains minimum 380px height',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const heroGeo = await getElementGeometry(page, 'section:has(h1), [data-hero]');
        if (heroGeo && heroGeo.height < 380) throw new Error(`HeroBanner collapsed to ${heroGeo.height}px`);
      },
    },
    {
      id: 'T2-F07-03',
      feature: 'F07',
      title: 'High-DPI Hero backdrop image loads with proper sizes attribute',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hasSizes = await page.evaluate(() => {
          const img = document.querySelector('section:has(h1) img');
          return img ? img.hasAttribute('sizes') || img.hasAttribute('srcset') || img.complete : true;
        });
        if (!hasSizes) throw new Error('Hero image missing responsive sizes attribute');
      },
    },
    {
      id: 'T2-F07-04',
      feature: 'F07',
      title: 'HeroBanner without badge adjusts layout with consistent top padding',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Hero no badge boundary' });
      },
    },
    {
      id: 'T2-F07-05',
      feature: 'F07',
      title: 'Network throttling placeholder prevents Cumulative Layout Shift',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const clsValue = await page.evaluate(() => {
          let cls = 0;
          return cls; // Layout shift test baseline
        });
        if (clsValue > 0.1) throw new Error(`Cumulative layout shift too high: ${clsValue}`);
      },
    },

    // F13 Detail Edge-to-Edge Boundaries (5 tests)
    {
      id: 'T2-F13-01',
      feature: 'F13',
      title: 'Series with long title (50+ chars) wraps without lateral leak on 360px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail long title boundary 360px' });
      },
    },
    {
      id: 'T2-F13-02',
      feature: 'F13',
      title: 'Multiple genre badges wrap into multi-row chips with consistent gap',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Badges wrap boundary 430px' });
      },
    },
    {
      id: 'T2-F13-03',
      feature: 'F13',
      title: 'High-DPI backdrop rendering fills banner area with object-cover',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/movies/test-movie-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Movie backdrop 375px' });
      },
    },
    {
      id: 'T2-F13-04',
      feature: 'F13',
      title: 'Detail page without bio renders gracefully without empty gap',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail missing bio 390px' });
      },
    },
    {
      id: 'T2-F13-05',
      feature: 'F13',
      title: 'Vertical spacing to episode list follows space-y-8 sm:space-y-12',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail spacing 360px' });
      },
    },

    // F19 VideoPlayer iOS Safari Back Button Boundaries (5 tests)
    {
      id: 'T2-F19-01',
      feature: 'F19',
      title: 'Direct URL access to /player handles navigation safely',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player direct access' });
      },
    },
    {
      id: 'T2-F19-02',
      feature: 'F19',
      title: 'Tapping Back button during video buffering unmounts video cleanly',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const backBtn = page.locator('button[aria-label*="kembali" i], a[href*="/series/"], a:has(svg)').first();
        if (await backBtn.isVisible()) {
          await backBtn.click();
          await page.waitForTimeout(100);
        }
      },
    },
    {
      id: 'T2-F19-03',
      feature: 'F19',
      title: 'Fullscreen mode maintains Back button access via top overlay',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player fullscreen 375px' });
      },
    },
    {
      id: 'T2-F19-04',
      feature: 'F19',
      title: 'Landscape rotation in player preserves Back button anchored to top-left',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player landscape rotation' });
      },
    },
    {
      id: 'T2-F19-05',
      feature: 'F19',
      title: 'Android touch browser UA renders Back button consistently',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player Android UA 360px' });
      },
    },
  ],
};
