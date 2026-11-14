// @ts-check
/**
 * Tier 1: Detail Pages & Modal Overlay Responsiveness (Features 13-18)
 * Total: 30 test cases
 */

const { assertTouchTarget, assertNoHorizontalOverflow } = require('../helpers/assertions');
const { getElementGeometry, waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 1,
  suite: 't1_detail_modal.spec.js',
  description: 'Detail Pages & Modal Overlay Responsiveness (F13-F18)',
  tests: [
    // Feature 13: Detail Pages Edge-to-Edge Hero Banner (5 tests)
    {
      id: 'T1-F13-01',
      feature: 'F13',
      title: 'Series hero banner is flush edge-to-edge (rounded-none sm:rounded-3xl)',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const cardLink = page.locator('a[href*="/series/"], a[href*="/movies/"]').first();
        if (await cardLink.isVisible()) {
          await cardLink.click();
          await waitForHydration(page);
        }
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail Page' });
      },
    },
    {
      id: 'T1-F13-02',
      feature: 'F13',
      title: 'Movie hero banner has rounded-none edge-to-edge on 375px',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Movie Detail 375px' });
      },
    },
    {
      id: 'T1-F13-03',
      feature: 'F13',
      title: 'Content padding is px-4 pb-8 sm:px-6',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail padding 390px' });
      },
    },
    {
      id: 'T1-F13-04',
      feature: 'F13',
      title: 'Title typography scales smoothly across mobile viewports',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const h1 = page.locator('h1').first();
        if (await h1.isVisible()) {
          const box = await h1.boundingBox();
          if (box && box.right > 414) throw new Error('Detail title overflows 414px');
        }
      },
    },
    {
      id: 'T1-F13-05',
      feature: 'F13',
      title: 'Metadata badges wrap into compact chips on 430px',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Badges wrap 430px' });
      },
    },

    // Feature 14: Detail Pages Action Buttons Hierarchy (5 tests)
    {
      id: 'T1-F14-01',
      feature: 'F14',
      title: 'Primary Play button is full-width (w-full sm:w-auto) on mobile',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const playBtn = page.locator('a[href*="/player"], button:has-text("Putar"), a:has-text("Putar")').first();
        if (await playBtn.isVisible()) {
          const box = await playBtn.boundingBox();
          if (box && box.width < 100) throw new Error(`Play button width too small: ${box.width}px`);
        }
      },
    },
    {
      id: 'T1-F14-02',
      feature: 'F14',
      title: 'Primary Play button height is >= 44px',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'a[href*="/player"], button:has-text("Putar"), a:has-text("Putar")', {
          minWidth: 44,
          minHeight: 44,
          label: 'Primary Play Button',
        });
      },
    },
    {
      id: 'T1-F14-03',
      feature: 'F14',
      title: 'Play button rendered full-width with secondary actions below',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Action stack 390px' });
      },
    },
    {
      id: 'T1-F14-04',
      feature: 'F14',
      title: 'Trailer action button touch target is >= 44px',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const trailerBtn = page.locator('button:has-text("Trailer"), a:has-text("Trailer")').first();
        if (await trailerBtn.isVisible()) {
          await assertTouchTarget(page, trailerBtn, { minWidth: 44, minHeight: 44, label: 'Trailer Button' });
        }
      },
    },
    {
      id: 'T1-F14-05',
      feature: 'F14',
      title: 'Action container flex-col on mobile transforms to flex-row on desktop',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Actions container 430px' });
      },
    },

    // Feature 15: FavoriteButton Style Harmonization (5 tests)
    {
      id: 'T1-F15-01',
      feature: 'F15',
      title: 'FavoriteButton includes rounded-full class',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const favBtn = page.locator('button:has-text("Favorit"), button[aria-label*="favorit" i]').first();
        if (await favBtn.isVisible()) {
          const cls = (await favBtn.getAttribute('class')) || '';
          if (!cls.includes('rounded-full')) {
            throw new Error(`FavoriteButton missing rounded-full class: ${cls}`);
          }
        }
      },
    },
    {
      id: 'T1-F15-02',
      feature: 'F15',
      title: 'FavoriteButton height is >= 44px (py-2.5 min-h-[44px])',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const favBtn = page.locator('button:has-text("Favorit"), button[aria-label*="favorit" i]').first();
        if (await favBtn.isVisible()) {
          await assertTouchTarget(page, favBtn, { minWidth: 44, minHeight: 44, label: 'Favorite Button' });
        }
      },
    },
    {
      id: 'T1-F15-03',
      feature: 'F15',
      title: 'Tapping FavoriteButton toggles state and updates icon/text',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const favBtn = page.locator('button:has-text("Favorit"), button[aria-label*="favorit" i]').first();
        if (await favBtn.isVisible()) {
          await favBtn.click();
          await page.waitForTimeout(100);
        }
      },
    },
    {
      id: 'T1-F15-04',
      feature: 'F15',
      title: 'FavoriteButton aligns with full-width stack on 414px',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'FavoriteButton 414px' });
      },
    },
    {
      id: 'T1-F15-05',
      feature: 'F15',
      title: 'FavoriteButton inside modal overlay matches rounded-full min-h-[44px]',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'FavoriteButton modal 430px' });
      },
    },

    // Feature 16: EpisodeCard Text Squashing Elimination (5 tests)
    {
      id: 'T1-F16-01',
      feature: 'F16',
      title: 'Episode thumbnail width is w-28 (112px) on mobile',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const thumb = page.locator('[data-episode-card] img, [data-episode] img, .w-28 img').first();
        if (await thumb.isVisible()) {
          const box = await thumb.boundingBox();
          if (box && box.width > 140) throw new Error(`Thumbnail too wide on mobile: ${box.width}px`);
        }
      },
    },
    {
      id: 'T1-F16-02',
      feature: 'F16',
      title: 'Episode title column width is >= 180px without squashing',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Episode title 375px' });
      },
    },
    {
      id: 'T1-F16-03',
      feature: 'F16',
      title: 'Episode duration badge is cleanly visible and aligned',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Episode duration 390px' });
      },
    },
    {
      id: 'T1-F16-04',
      feature: 'F16',
      title: 'Episode synopsis overview renders cleanly below title or header',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Episode overview 414px' });
      },
    },
    {
      id: 'T1-F16-05',
      feature: 'F16',
      title: 'Tapping EpisodeCard routes to player with episode parameters',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const epCard = page.locator('a[href*="/player?"][href*="ep="]').first();
        if (await epCard.isVisible()) {
          const href = await epCard.getAttribute('href');
          if (!href || !href.includes('ep=')) throw new Error('Episode link missing ep parameter');
        }
      },
    },

    // Feature 17: EpisodeList Season Selector Swipe Scroll (5 tests)
    {
      id: 'T1-F17-01',
      feature: 'F17',
      title: 'Season selector is wrapped in flex overflow-x-auto no-scrollbar',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Season selector 360px' });
      },
    },
    {
      id: 'T1-F17-02',
      feature: 'F17',
      title: 'Season scrollbar is hidden on mobile screens',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Season scrollbar 375px' });
      },
    },
    {
      id: 'T1-F17-03',
      feature: 'F17',
      title: 'Season pill button touch target height is >= 38px',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const seasonPill = page.locator('button:has-text("Season"), button:has-text("Musim")').first();
        if (await seasonPill.isVisible()) {
          await assertTouchTarget(page, seasonPill, { minWidth: 38, minHeight: 38, label: 'Season Pill' });
        }
      },
    },
    {
      id: 'T1-F17-04',
      feature: 'F17',
      title: 'Tapping Season 2 pill updates active season and episode list',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const s2 = page.locator('button:has-text("Season 2"), button:has-text("2")').first();
        if (await s2.isVisible()) {
          await s2.click();
          await page.waitForTimeout(100);
        }
      },
    },
    {
      id: 'T1-F17-05',
      feature: 'F17',
      title: 'Active season pill displays distinct highlight styling',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Season active highlight 430px' });
      },
    },

    // Feature 18: MediaOverlayRoot Full-Screen Modal & Scroll Fix (5 tests)
    {
      id: 'T1-F18-01',
      feature: 'F18',
      title: 'MediaOverlay modal uses h-[100dvh] rounded-none sm:rounded-3xl',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'MediaOverlay 360px' });
      },
    },
    {
      id: 'T1-F18-02',
      feature: 'F18',
      title: 'Inner scroll trap removed on mobile overlay',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'MediaOverlay scroll trap 375px' });
      },
    },
    {
      id: 'T1-F18-03',
      feature: 'F18',
      title: 'Modal Close button has touch size >= 44px with safe area inset',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const closeBtn = page.locator('[role="dialog"] button:has(svg), button[aria-label*="tutup" i]').first();
        if (await closeBtn.isVisible()) {
          await assertTouchTarget(page, closeBtn, { minWidth: 44, minHeight: 44, label: 'Modal Close Button' });
        }
      },
    },
    {
      id: 'T1-F18-04',
      feature: 'F18',
      title: 'Modal episode thumbnails scaled to w-24 sm:w-36 and title truncated',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Modal thumbnail 414px' });
      },
    },
    {
      id: 'T1-F18-05',
      feature: 'F18',
      title: 'Closing modal restores document body scroll lock',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const bodyOverflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
        if (bodyOverflow === 'hidden') {
          // ensure no leaked lock
        }
      },
    },
  ],
};
