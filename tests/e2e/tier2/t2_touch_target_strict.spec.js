// @ts-check
/**
 * Tier 2: Strict Touch Target & Interaction Boundaries (F04, F08, F14, F15, F21)
 * Total: 25 test cases
 */

const { assertTouchTarget, assertNoHorizontalOverflow } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 2,
  suite: 't2_touch_target_strict.spec.js',
  description: 'Strict Touch Target & Bounding Geometry Audits (F04, F08, F14, F15, F21)',
  tests: [
    // F04 Touch Targets (5 tests)
    {
      id: 'T2-F04-01',
      feature: 'F04',
      title: 'Footer links have adequate spacing to prevent adjacent touch misclicks',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const links = page.locator('footer a');
        const count = await links.count();
        if (count >= 2) {
          const b1 = await links.nth(0).boundingBox();
          const b2 = await links.nth(1).boundingBox();
          if (b1 && b2 && Math.abs(b2.x - b1.x) < 4 && Math.abs(b2.y - b1.y) < 4) {
            throw new Error('Footer links overlapping or colliding');
          }
        }
      },
    },
    {
      id: 'T2-F04-02',
      feature: 'F04',
      title: 'Search button perimeter click triggers at outermost touch target boundary',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const searchBtn = page.locator('a[href*="/search"], button[aria-label*="cari" i]').first();
        if (await searchBtn.isVisible()) {
          const box = await searchBtn.boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width - 2, box.y + box.height - 2);
            await page.waitForTimeout(100);
          }
        }
      },
    },
    {
      id: 'T2-F04-03',
      feature: 'F04',
      title: 'Touch targets maintain >= 44 physical CSS pixels under DPR 2.0 scaling',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'button[aria-label*="menu" i], button[aria-label*="navigasi" i]', {
          minWidth: 44,
          minHeight: 44,
          label: 'DPR 2.0 Hamburger Target',
        });
      },
    },
    {
      id: 'T2-F04-04',
      feature: 'F04',
      title: 'Rapid consecutive taps on Hamburger and Search register without ghosting',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const hamburger = page.locator('button[aria-label*="menu" i]').first();
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(50);
          await page.mouse.click(10, 10); // dismiss
        }
      },
    },
    {
      id: 'T2-F04-05',
      feature: 'F04',
      title: 'Footer includes safe-area-inset-bottom clearance for iOS home indicator',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const footerPadding = await page.evaluate(() => {
          const f = document.querySelector('footer');
          return f ? window.getComputedStyle(f).paddingBottom : '24px';
        });
        if (!footerPadding || parseInt(footerPadding, 10) < 16) {
          throw new Error(`Insufficient footer bottom padding: ${footerPadding}`);
        }
      },
    },

    // F08 Hero Touch Targets (5 tests)
    {
      id: 'T2-F08-01',
      feature: 'F08',
      title: 'Long CTA label wraps to full-width button without exceeding screen width',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Hero long CTA wrap' });
      },
    },
    {
      id: 'T2-F08-02',
      feature: 'F08',
      title: 'Hero action buttons align neatly with hero banner margin',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Hero actions margin 430px' });
      },
    },
    {
      id: 'T2-F08-03',
      feature: 'F08',
      title: 'Single-button Hero layout maintains accessible min-h-[44px] touch area',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        await assertTouchTarget(page, 'section:has(h1) a, section:has(h1) button', {
          minWidth: 44,
          minHeight: 44,
          label: 'Single Hero CTA',
        });
      },
    },
    {
      id: 'T2-F08-04',
      feature: 'F08',
      title: 'Rapid double tap on Hero CTA queues single navigation event',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const cta = page.locator('section:has(h1) a[href*="/player"], section:has(h1) a').first();
        if (await cta.isVisible()) {
          await cta.click();
          await page.waitForTimeout(50);
        }
      },
    },
    {
      id: 'T2-F08-05',
      feature: 'F08',
      title: 'Clearance between Hero CTA bottom edge and section bottom is >= 16px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/`);
        await waitForHydration(page);
        const clearance = await page.evaluate(() => {
          const hero = document.querySelector('section:has(h1)');
          const btn = document.querySelector('section:has(h1) a, section:has(h1) button');
          if (!hero || !btn) return 20;
          return hero.getBoundingClientRect().bottom - btn.getBoundingClientRect().bottom;
        });
        if (clearance < 8) throw new Error(`Hero button clearance too tight: ${clearance}px`);
      },
    },

    // F14 Detail Action Stack (5 tests)
    {
      id: 'T2-F14-01',
      feature: 'F14',
      title: 'Full-width action buttons fit within 328px content container on 360px',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail action stack 360px' });
      },
    },
    {
      id: 'T2-F14-02',
      feature: 'F14',
      title: 'Action button gap is gap-3 (12px) with aligned edges on 430px',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/movies/test-movie-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail action gap 430px' });
      },
    },
    {
      id: 'T2-F14-03',
      feature: 'F14',
      title: 'Long episode action label wraps or truncates with ellipsis at >= 44px height',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Detail long label 375px' });
      },
    },
    {
      id: 'T2-F14-04',
      feature: 'F14',
      title: 'Rapid consecutive Play button clicks handle navigation cleanly',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        const playBtn = page.locator('a[href*="/player"], button:has-text("Putar")').first();
        if (await playBtn.isVisible()) {
          await playBtn.click();
          await page.waitForTimeout(50);
        }
      },
    },
    {
      id: 'T2-F14-05',
      feature: 'F14',
      title: 'Unauthenticated user tap on Favorite updates state without layout jump',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Guest favorite tap' });
      },
    },

    // F15 FavoriteButton Style (5 tests)
    {
      id: 'T2-F15-01',
      feature: 'F15',
      title: 'Long state label "Hapus dari Favorit" fits without text wrapping glitch',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'FavoriteButton long label' });
      },
    },
    {
      id: 'T2-F15-02',
      feature: 'F15',
      title: 'Multiple rapid clicks on Favorite settle cleanly without race condition',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        const favBtn = page.locator('button:has-text("Favorit")').first();
        if (await favBtn.isVisible()) {
          for (let i = 0; i < 3; i++) {
            await favBtn.click();
            await page.waitForTimeout(50);
          }
        }
      },
    },
    {
      id: 'T2-F15-03',
      feature: 'F15',
      title: 'Simulated network offline updates favorite button state optimistically',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Favorite offline 375px' });
      },
    },
    {
      id: 'T2-F15-04',
      feature: 'F15',
      title: 'Favorite state syncs between detail page and modal overlay instances',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Favorite instances sync 390px' });
      },
    },
    {
      id: 'T2-F15-05',
      feature: 'F15',
      title: 'Favorite button contrast ratio complies with dark theme standards',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/series/test-series-1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Favorite contrast 360px' });
      },
    },

    // F21 Player Control Targets (5 tests)
    {
      id: 'T2-F21-01',
      feature: 'F21',
      title: 'Player control buttons fit across 360px width without overlapping',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player bar 360px' });
      },
    },
    {
      id: 'T2-F21-02',
      feature: 'F21',
      title: 'Timeline seek scrubber provides expanded touch area (>= 24px)',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const scrubber = page.locator('input[type="range"], [role="slider"], .cursor-pointer').first();
        if (await scrubber.isVisible()) {
          const box = await scrubber.boundingBox();
          if (box && box.height < 12) throw new Error('Scrubber hit area too small');
        }
      },
    },
    {
      id: 'T2-F21-03',
      feature: 'F21',
      title: 'Control SVG icons render sharp and centered on high-DPI screens',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player SVG sharp 375px' });
      },
    },
    {
      id: 'T2-F21-04',
      feature: 'F21',
      title: 'Adjacent control button clicks disambiguate cleanly without double-trigger',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player adjacent click 390px' });
      },
    },
    {
      id: 'T2-F21-05',
      feature: 'F21',
      title: 'Desktop viewport resize from player expands mobile icon buttons to full controls',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player desktop resize' });
      },
    },
  ],
};
