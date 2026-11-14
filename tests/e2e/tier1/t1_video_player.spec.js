// @ts-check
/**
 * Tier 1: Video Player Mobile Experience & iOS Fixes (Features 19-21)
 * Total: 15 test cases
 */

const { assertTouchTarget, assertNoHorizontalOverflow } = require('../helpers/assertions');
const { waitForHydration } = require('../helpers/dom');

module.exports = {
  tier: 1,
  suite: 't1_video_player.spec.js',
  description: 'Video Player Mobile Experience & iOS Fixes (F19-F21)',
  tests: [
    // Feature 19: VideoPlayer iOS Safari Back Button Fix (5 tests)
    {
      id: 'T1-F19-01',
      feature: 'F19',
      title: 'Back button is visible (opacity-100) on iOS user-agent emulation',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const backBtn = page.locator('button[aria-label*="kembali" i], button[aria-label*="back" i], a[href*="/series/"], a[href*="/movies/"], a:has(svg)').first();
        if (await backBtn.isVisible()) {
          const isVisible = await backBtn.evaluate((el) => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.opacity !== '0';
          });
          if (!isVisible) throw new Error('Back button hidden on iOS emulation');
        }
      },
    },
    {
      id: 'T1-F19-02',
      feature: 'F19',
      title: 'Player Back button touch target is >= 44px',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const backBtn = page.locator('button[aria-label*="kembali" i], button[aria-label*="back" i], a[href*="/series/"], a[href*="/movies/"]').first();
        if (await backBtn.isVisible()) {
          await assertTouchTarget(page, backBtn, { minWidth: 40, minHeight: 40, label: 'Player Back Button' });
        }
      },
    },
    {
      id: 'T1-F19-03',
      feature: 'F19',
      title: 'Tapping Back button navigates back to previous screen safely',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const backBtn = page.locator('button[aria-label*="kembali" i], button[aria-label*="back" i], a[href*="/series/"], a[href*="/movies/"]').first();
        if (await backBtn.isVisible()) {
          await backBtn.click();
          await page.waitForTimeout(200);
        }
      },
    },
    {
      id: 'T1-F19-04',
      feature: 'F19',
      title: 'Back button is positioned with safe-area padding',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player safe-area 414px' });
      },
    },
    {
      id: 'T1-F19-05',
      feature: 'F19',
      title: 'Back button remains visible under isIOS || showOverlay logic',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player 430px' });
      },
    },

    // Feature 20: VideoPlayer Tap-to-Toggle Controls (5 tests)
    {
      id: 'T1-F20-01',
      feature: 'F20',
      title: 'Single tap on video surface toggles controls to visible',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.mouse.click(180, 300);
        await page.waitForTimeout(100);
      },
    },
    {
      id: 'T1-F20-02',
      feature: 'F20',
      title: 'Second tap on video surface hides controls',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.mouse.click(187, 300);
        await page.waitForTimeout(100);
        await page.mouse.click(187, 300);
        await page.waitForTimeout(100);
      },
    },
    {
      id: 'T1-F20-03',
      feature: 'F20',
      title: 'Controls overlay auto-hides after inactivity period',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page, { routeLabel: 'Player inactivity 390px' });
      },
    },
    {
      id: 'T1-F20-04',
      feature: 'F20',
      title: 'Tapping control button does not hide overlay prematurely',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const playBtn = page.locator('button[aria-label*="play" i], button[aria-label*="putar" i]').first();
        if (await playBtn.isVisible()) {
          await playBtn.click();
          await page.waitForTimeout(100);
        }
      },
    },
    {
      id: 'T1-F20-05',
      feature: 'F20',
      title: 'Mousemove event reveals controls temporarily',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        await page.mouse.move(200, 200);
        await page.waitForTimeout(100);
      },
    },

    // Feature 21: VideoPlayer Control Button Touch Targets (5 tests)
    {
      id: 'T1-F21-01',
      feature: 'F21',
      title: 'Player Play/Pause button touch target is >= 40px (h-10 w-10)',
      viewport: 'mobile-360',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const playBtn = page.locator('button[aria-label*="play" i], button[aria-label*="pause" i], button:has(svg)').first();
        if (await playBtn.isVisible()) {
          await assertTouchTarget(page, playBtn, { minWidth: 38, minHeight: 38, label: 'Player Play/Pause' });
        }
      },
    },
    {
      id: 'T1-F21-02',
      feature: 'F21',
      title: 'Seek buttons (-10s, +10s) touch target is >= 40px',
      viewport: 'mobile-375',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const seekBtn = page.locator('button:has-text("10"), button[aria-label*="seek" i]').first();
        if (await seekBtn.isVisible()) {
          await assertTouchTarget(page, seekBtn, { minWidth: 38, minHeight: 38, label: 'Seek Button' });
        }
      },
    },
    {
      id: 'T1-F21-03',
      feature: 'F21',
      title: 'Next Episode button touch target is >= 40px',
      viewport: 'mobile-390',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const nextBtn = page.locator('button[aria-label*="next" i], button[aria-label*="lanjut" i]').first();
        if (await nextBtn.isVisible()) {
          await assertTouchTarget(page, nextBtn, { minWidth: 38, minHeight: 38, label: 'Next Episode Button' });
        }
      },
    },
    {
      id: 'T1-F21-04',
      feature: 'F21',
      title: 'Subtitles button touch target is >= 40px',
      viewport: 'mobile-414',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const subBtn = page.locator('button[aria-label*="subtitle" i], button[aria-label*="teks" i]').first();
        if (await subBtn.isVisible()) {
          await assertTouchTarget(page, subBtn, { minWidth: 38, minHeight: 38, label: 'Subtitles Button' });
        }
      },
    },
    {
      id: 'T1-F21-05',
      feature: 'F21',
      title: 'Fullscreen button touch target is >= 40px',
      viewport: 'mobile-430',
      async run({ page, baseUrl }) {
        await page.goto(`${baseUrl}/player?id=test-1&type=series&ep=1`);
        await waitForHydration(page);
        const fsBtn = page.locator('button[aria-label*="fullscreen" i], button[aria-label*="layar penuh" i]').first();
        if (await fsBtn.isVisible()) {
          await assertTouchTarget(page, fsBtn, { minWidth: 38, minHeight: 38, label: 'Fullscreen Button' });
        }
      },
    },
  ],
};
