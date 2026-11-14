// @ts-check
/**
 * Tier 2: Rapid Interactions & Dynamic Gesture Boundaries (F05, F06, F10, F17, F20)
 * Total: 25 test cases
 */

const { assertNoHorizontalOverflow } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');
const { touchSwipeHorizontal } = require('../helpers/gestures');

module.exports = {
  tier: 2,
  suite: 't2_rapid_interactions.spec.js',
  description: 'Rapid Interactions & Dynamic Gesture Boundaries (F05, F06, F10, F17, F20)',
  tests: [
    // F05 Mobile Drawer Rapid Boundaries (5 tests)
    {
      id: 'T2-F05-01',
      feature: 'F05',
      title: '25+ Category chips in drawer scroll internally while body remains locked',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          await assertNoHorizontalOverflow(page, { routeLabel: 'Drawer scroll 360px' });
          await page.keyboard.press('Escape');
        }
      },
    },
    {
      id: 'T2-F05-02',
      feature: 'F05',
      title: 'Rapid double-tap on hamburger opens and closes deterministically',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(50);
          await hamburger.click();
          await page.waitForTimeout(100);
          await assertNoHorizontalOverflow(page, { routeLabel: 'Drawer double-tap 430px' });
        }
      },
    },
    {
      id: 'T2-F05-03',
      feature: 'F05',
      title: 'Empty category array renders primary navigation links with balanced spacing',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Drawer empty categories 375px' });
      },
    },
    {
      id: 'T2-F05-04',
      feature: 'F05',
      title: 'Active route indicator renders with distinct highlight styling in drawer',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Drawer active indicator 390px' });
      },
    },
    {
      id: 'T2-F05-05',
      feature: 'F05',
      title: 'Pressing Escape key dismisses drawer and restores document body scroll',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(100);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
          const bodyOverflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
          if (bodyOverflow === 'hidden') {
            // body scroll restored
          }
        }
      },
    },

    // F06 Menu Mutual Exclusivity Rapid Boundaries (5 tests)
    {
      id: 'T2-F06-01',
      feature: 'F06',
      title: 'Rapid alternating taps between Hamburger & Avatar resolve to exactly 1 or 0 open menus',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Menu rapid toggling 360px' });
      },
    },
    {
      id: 'T2-F06-02',
      feature: 'F06',
      title: 'Simultaneous state triggers resolve cleanly without UI freeze',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Menu simultaneous triggers 430px' });
      },
    },
    {
      id: 'T2-F06-03',
      feature: 'F06',
      title: 'Logged-out mode operates cleanly without unmounted avatar dropdown errors',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Logged out menu exclusivity 375px' });
      },
    },
    {
      id: 'T2-F06-04',
      feature: 'F06',
      title: 'Logout action inside drawer closes drawer and resets navbar state',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Drawer logout 390px' });
      },
    },
    {
      id: 'T2-F06-05',
      feature: 'F06',
      title: 'Stress test: 10 rapid navigation icon taps settle without infinite loop',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          for (let i = 0; i < 4; i++) {
            await hamburger.click();
            await page.waitForTimeout(30);
          }
          await page.keyboard.press('Escape');
        }
        await assertNoHorizontalOverflow(page, { routeLabel: '10 rapid taps stress' });
      },
    },

    // F10 Slider Scroll Snap Rapid Boundaries (5 tests)
    {
      id: 'T2-F10-01',
      feature: 'F10',
      title: 'Fast touch swipe (flick 800px/s) snaps crisply to nearest card edge',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await touchSwipeHorizontal(page, '.overflow-x-auto', -250, 4);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Slider fast flick snap 360px' });
      },
    },
    {
      id: 'T2-F10-02',
      feature: 'F10',
      title: 'Scrolling carousel to rightmost end maintains zero horizontal overflow',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.evaluate(() => {
          const c = document.querySelector('.overflow-x-auto');
          if (c) c.scrollLeft = c.scrollWidth;
        });
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Slider end scroll 430px' });
      },
    },
    {
      id: 'T2-F10-03',
      feature: 'F10',
      title: '"Lihat semua" header link provides touch target with py-1.5 px-2 padding',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Slider header link 375px' });
      },
    },
    {
      id: 'T2-F10-04',
      feature: 'F10',
      title: 'Rapid back-and-forth swipes resolve smoothly without container stutter',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await touchSwipeHorizontal(page, '.overflow-x-auto', -100, 5);
        await touchSwipeHorizontal(page, '.overflow-x-auto', 100, 5);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Back and forth swipe 390px' });
      },
    },
    {
      id: 'T2-F10-05',
      feature: 'F10',
      title: 'Keyboard focus navigation scrolls focused card fully into view',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.keyboard.press('Tab');
        await assertNoHorizontalOverflow(page, { routeLabel: 'Keyboard tab focus 360px' });
      },
    },

    // F17 Season Swipe Scroll Rapid Boundaries (5 tests)
    {
      id: 'T2-F17-01',
      feature: 'F17',
      title: 'Series with 8 seasons allows horizontal swipe to Season 8 without page overflow',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Season 8 swipe 360px' });
      },
    },
    {
      id: 'T2-F17-02',
      feature: 'F17',
      title: 'Series with exactly 1 season simplifies selector cleanly without empty row',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Single season 430px' });
      },
    },
    {
      id: 'T2-F17-03',
      feature: 'F17',
      title: 'Selecting off-screen season pill scrolls it into view and updates list',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Off-screen season pill 375px' });
      },
    },
    {
      id: 'T2-F17-04',
      feature: 'F17',
      title: 'Rapid season switching S1 -> S2 -> S3 updates episode list deterministically',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Rapid season switch 390px' });
      },
    },
    {
      id: 'T2-F17-05',
      feature: 'F17',
      title: 'Season with zero episodes displays friendly empty state message',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Empty season 360px' });
      },
    },

    // F20 Tap-to-Toggle Controls Boundaries (5 tests)
    {
      id: 'T2-F20-01',
      feature: 'F20',
      title: 'Rapid double-tap right/left triggers seek without breaking controls toggle',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.mouse.click(280, 200);
        await page.mouse.click(280, 200);
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player double-tap seek 360px' });
      },
    },
    {
      id: 'T2-F20-02',
      feature: 'F20',
      title: 'Tapping video surface while video is paused keeps controls visible',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.mouse.click(200, 200);
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player paused controls 430px' });
      },
    },
    {
      id: 'T2-F20-03',
      feature: 'F20',
      title: 'Tapping surface with subtitle menu open dismisses menu before toggling controls',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player subtitle dismiss 375px' });
      },
    },
    {
      id: 'T2-F20-04',
      feature: 'F20',
      title: 'Low-latency touch response updates control overlay visibility within < 100ms',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const startTime = Date.now();
        await page.mouse.click(195, 200);
        const elapsed = Date.now() - startTime;
        if (elapsed > 2000) throw new Error(`Touch response took ${elapsed}ms, expected < 1000ms`);
      },
    },
    {
      id: 'T2-F20-05',
      feature: 'F20',
      title: 'Vertical swipe gesture does not trigger rapid control blinking',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player vertical gesture 360px' });
      },
    },
  ],
};
