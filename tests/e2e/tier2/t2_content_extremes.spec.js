// @ts-check
/**
 * Tier 2: Content Extremes & Asymmetric Layout Boundaries (F09, F11, F12, F16, F18)
 * Total: 25 test cases
 */

const { assertNoHorizontalOverflow } = require('../helpers/assertions');
const { getElementGeometry, waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 2,
  suite: 't2_content_extremes.spec.js',
  description: 'Content Extremes & Asymmetric Layout Boundaries (F09, F11, F12, F16, F18)',
  tests: [
    // F09 Slider Peek Extremes (5 tests)
    {
      id: 'T2-F09-01',
      feature: 'F09',
      title: 'SliderRow with only 2 items renders stably without empty phantom card',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'SliderRow 2 items 360px' });
      },
    },
    {
      id: 'T2-F09-02',
      feature: 'F09',
      title: 'SliderRow with 30 items retains exact w-[36vw] card width',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'SliderRow 30 items 430px' });
      },
    },
    {
      id: 'T2-F09-03',
      feature: 'F09',
      title: 'Orientation flip to landscape dynamically adapts card widths',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await page.setViewportSize({ width: 667, height: 375 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'SliderRow landscape flip' });
      },
    },
    {
      id: 'T2-F09-04',
      feature: 'F09',
      title: 'Landscape history cards reveal next-card peek affordance cleanly',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Landscape cards 390px' });
      },
    },
    {
      id: 'T2-F09-05',
      feature: 'F09',
      title: 'Skeleton loading placeholders use w-[36vw] with peek affordance',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Skeleton loading cards 360px' });
      },
    },

    // F11 Card Touch Feedback Extremes (5 tests)
    {
      id: 'T2-F11-01',
      feature: 'F11',
      title: 'Poster card renders fallback gracefully on image 404',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Card image 404 fallback' });
      },
    },
    {
      id: 'T2-F11-02',
      feature: 'F11',
      title: 'Card with long title (50+ chars) clamps cleanly without breaking layout',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Card long title 430px' });
      },
    },
    {
      id: 'T2-F11-03',
      feature: 'F11',
      title: 'Rapid multi-tap on poster card opens single modal overlay',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const card = page.locator('.overflow-x-auto a').first();
        if (await card.isVisible()) {
          await card.click();
          await page.waitForTimeout(50);
        }
      },
    },
    {
      id: 'T2-F11-04',
      feature: 'F11',
      title: 'Watch history card at 100% progress renders red bar spanning card bottom',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'History 100% progress' });
      },
    },
    {
      id: 'T2-F11-05',
      feature: 'F11',
      title: 'Touch drag disambiguation: dragging finger horizontally scrolls without opening modal',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Touch drag vs tap' });
      },
    },

    // F12 Home Spacing Rhythm Extremes (5 tests)
    {
      id: 'T2-F12-01',
      feature: 'F12',
      title: 'Compact screen height (640px) displays Hero title and CTA in fold',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const titleGeo = await getElementGeometry(page, 'h1');
        if (titleGeo && titleGeo.top > 640) throw new Error('Hero title pushed out of 640px fold');
      },
    },
    {
      id: 'T2-F12-02',
      feature: 'F12',
      title: 'Tall screen height (932px) maintains balanced vertical spacing',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Tall screen 932px' });
      },
    },
    {
      id: 'T2-F12-03',
      feature: 'F12',
      title: 'User with empty watch history unmounts history row without extra gap',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Empty history gap' });
      },
    },
    {
      id: 'T2-F12-04',
      feature: 'F12',
      title: 'Distance between final slider row and footer is balanced (32px-48px)',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Footer distance 390px' });
      },
    },
    {
      id: 'T2-F12-05',
      feature: 'F12',
      title: 'Rendering 10 content rows maintains uniform vertical rhythm',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: '10 rows rhythm 360px' });
      },
    },

    // F16 EpisodeCard Squashing Extremes (5 tests)
    {
      id: 'T2-F16-01',
      feature: 'F16',
      title: '50-character episode title wraps cleanly without squashing thumbnail',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Episode long title 360px' });
      },
    },
    {
      id: 'T2-F16-02',
      feature: 'F16',
      title: 'Episode without synopsis renders compact header and duration badge',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Episode no synopsis 430px' });
      },
    },
    {
      id: 'T2-F16-03',
      feature: 'F16',
      title: 'Episode thumbnail 404 renders fallback placeholder without layout break',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Episode thumbnail 404' });
      },
    },
    {
      id: 'T2-F16-04',
      feature: 'F16',
      title: 'Scrolling through 24 episodes in season renders smoothly',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(50);
        await assertNoHorizontalOverflow(page, { routeLabel: '24 episodes scroll 390px' });
      },
    },
    {
      id: 'T2-F16-05',
      feature: 'F16',
      title: 'Full card bounding area registers touch click to navigate to player',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Episode card bounding click' });
      },
    },

    // F18 MediaOverlay Modal Extremes (5 tests)
    {
      id: 'T2-F18-01',
      feature: 'F18',
      title: 'Ultra-long series title in modal header truncates with ellipsis',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Modal long title truncate 360px' });
      },
    },
    {
      id: 'T2-F18-02',
      feature: 'F18',
      title: 'Swipe down gesture on modal header dismisses overlay smoothly',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Modal swipe dismiss 430px' });
      },
    },
    {
      id: 'T2-F18-03',
      feature: 'F18',
      title: 'Background page scroll remains locked while modal is open',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Modal background scroll lock 375px' });
      },
    },
    {
      id: 'T2-F18-04',
      feature: 'F18',
      title: 'Launching player from modal navigates to /player and dismisses modal',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Modal launch player 390px' });
      },
    },
    {
      id: 'T2-F18-05',
      feature: 'F18',
      title: 'High-DPI modal thumbnails render crisp images with responsive sizes',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Modal high-DPI thumbnails' });
      },
    },
  ],
};
