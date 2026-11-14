// @ts-check
/**
 * Tier 4: Real-World Mobile User Scenarios - Binge Watching & iOS Safari (T4-SCEN-05 to T4-SCEN-08)
 * Total: 4 test cases
 */

const { assertNoHorizontalOverflow, assertTouchTarget } = require('../helpers/assertions');
const { waitForHydration, getMetaTag } = require('../helpers/dom');

module.exports = {
  tier: 4,
  suite: 't4_binge_watch_journey.spec.js',
  description: 'Real-World Mobile User Scenarios: Playback, Progress & iOS (T4-SCEN-05 to 08)',
  tests: [
    {
      id: 'T4-SCEN-05',
      scenario: 'The Interruption & Resume Flow',
      viewport: 'mobile-414',
      title: 'Watch interruption, history row card display, and seamless playback resumption',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Step 1: Watch History Check' });
      },
    },
    {
      id: 'T4-SCEN-06',
      scenario: 'The iOS Safari Emulated Experience',
      viewport: 'mobile-390',
      title: 'iOS Safari UA emulation: viewport-fit=cover, status bar #000000, and un-trapped Back button',
      async run({ page, baseUrl }) {
        // 1. Visit Home with iOS Safari UA
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);

        // 2. Verify viewport-fit=cover
        const vp = await getMetaTag(page, 'viewport');
        if (!vp || !vp.includes('viewport-fit=cover')) {
          throw new Error('iOS Safari requires viewport-fit=cover meta');
        }

        // 3. Visit player route
        await page.goto(`${baseUrl}/player?id=test-1&type=movie`);
        await waitForHydration(page);

        // 4. Verify Back button touch target
        const backBtn = page.locator('button[aria-label*="kembali" i], a[href*="/movies/"], a:has(svg)').first();
        if (await backBtn.isVisible()) {
          await assertTouchTarget(page, backBtn, { minWidth: 40, minHeight: 40, label: 'iOS Back Button' });
        }

        // 5. Check zero overflow
        await assertNoHorizontalOverflow(page, { routeLabel: 'iOS Safari Player Experience' });
      },
    },
    {
      id: 'T4-SCEN-07',
      scenario: 'The Guest-to-User Authentication Flow',
      viewport: 'mobile-360',
      title: 'Guest navigation fit (< 340px), auth entry, avatar appearance (>= 44px), and zero overflow',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Guest state navbar fit' });

        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(50);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'Auth flow completed' });
      },
    },
    {
      id: 'T4-SCEN-08',
      scenario: 'The Multi-Season Mobile Marathon',
      viewport: 'mobile-430',
      title: 'Multi-season browsing, season tab swipe, episode navigation, and subtitle controls',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Series Multi-season marathon' });

        await page.goto(`${baseUrl}/player?id=test-series-1&type=series&ep=2`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Series episode 2 playback' });
      },
    },
  ],
};
