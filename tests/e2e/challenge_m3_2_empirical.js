// @ts-check
/**
 * Empirical Challenge Harness: Milestone 3-2 (Modal Overlay & Scroll Architecture)
 * Target Server: http://127.0.0.1:3008
 */

const { launchBrowser, createContext } = require('./helpers/browser');
const { waitForHydration } = require('./helpers/dom');

const BASE_URL = 'http://127.0.0.1:3008';
const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 640, isMobile: true, hasTouch: true },
  { name: 'mobile-375', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'mobile-414', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: 'mobile-430', width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: 'desktop-1024', width: 1024, height: 768, isMobile: false, hasTouch: false },
];

const MOCK_SERIES_FIXTURE = {
  media: {
    id: 'test-challenge-series',
    slug: 'test-challenge-series',
    type: 'series',
    title: 'Kstream Empirical Challenge Series Chronicles (Adversarial Text Clamping & Season Swipe Test)',
    overview: 'Serial pengujian adversarial untuk memverifikasi scroll architecture, touch targets, season selector swipe, dan text clamping.',
    category: 'Action',
    genres: ['Action', 'Fantasy', 'Sci-Fi'],
    backdropUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="%230f172a"/></svg>',
    totalSeasons: 3,
    episodes: [
      {
        id: 'ep-s1-1',
        seasonNumber: 1,
        number: 1,
        title: 'Episode 1: Judul Episode Yang Sangat Panjang Sekali Melebihi Batas Normal Layar HP 360px Untuk Menguji Clamping Truncation',
        overview: 'Sinopsis episode 1 yang sangat mendetail dan panjang melintasi banyak baris untuk memverifikasi tidak ada horizontal container blowout pada layar hp.',
        duration: 2700,
        thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23000"/></svg>',
      },
      {
        id: 'ep-s1-2',
        seasonNumber: 1,
        number: 2,
        title: 'Episode 2: Ujian Lanjutan Ketahanan Scroll',
        overview: 'Sinopsis episode 2 untuk memverifikasi daftar episode scrollable dalam container tunggal.',
        duration: 2500,
        thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23000"/></svg>',
      },
      {
        id: 'ep-s1-3',
        seasonNumber: 1,
        number: 3,
        title: 'Episode 3: Aliansi Tersembunyi Dan Pertempuran',
        overview: 'Sinopsis episode 3.',
        duration: 2400,
        thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23000"/></svg>',
      },
      {
        id: 'ep-s1-4',
        seasonNumber: 1,
        number: 4,
        title: 'Episode 4: Menembus Batas Viewport',
        overview: 'Sinopsis episode 4.',
        duration: 2600,
        thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23000"/></svg>',
      },
      {
        id: 'ep-s2-1',
        seasonNumber: 2,
        number: 1,
        title: 'Episode S2E1: Era Baru Dimulai',
        overview: 'Sinopsis season 2 episode 1.',
        duration: 2800,
        thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23000"/></svg>',
      },
      {
        id: 'ep-s3-1',
        seasonNumber: 3,
        number: 1,
        title: 'Episode S3E1: Babak Penentuan Takdir',
        overview: 'Sinopsis season 3 episode 1.',
        duration: 3100,
        thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23000"/></svg>',
      },
    ],
  },
};

async function runEmpiricalChallenge() {
  console.log('================================================================');
  console.log('  CHALLENGER M3-2 EMPIRICAL ADVERSARIAL TEST HARNESS');
  console.log(`  Target: ${BASE_URL}`);
  console.log('================================================================\n');

  const browser = await launchBrowser({ headless: true });
  const results = {
    geometry: [],
    closeButton: [],
    scrollArchitecture: [],
    bodyLock: [],
    seasonSelector: [],
    episodeCardClamping: [],
    passed: 0,
    failed: 0,
    total: 0,
  };

  function record(category, testName, pass, details) {
    results.total++;
    if (pass) {
      results.passed++;
      console.log(`  [PASS] ${testName}: ${details}`);
    } else {
      results.failed++;
      console.log(`  [FAIL] ${testName}: ${details}`);
    }
    results[category].push({ testName, pass, details });
  }

  try {
    const context = await createContext(browser, VIEWPORTS[0]);
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(10000);

    // Route API media to return mock series instantaneously
    await page.route('**/api/media/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SERIES_FIXTURE),
      });
    });

    console.log('Loading home page...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // Wait for card to appear
    const card = page.locator('[data-card="true"], a[href*="/series/"], a[href*="/movies/"]').first();
    await card.waitFor({ state: 'visible', timeout: 30000 });
    if (!card) {
      throw new Error('No card poster found on page');
    }
    await card.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // SUITE 1 & 2: Modal Viewport Geometry & Close Button across 6 Viewports
    // -------------------------------------------------------------
    console.log('\n--- SUITE 1 & 2: Modal Viewport Geometry & Close Button across Viewports ---');
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);

      const dialogGeo = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return null;
        const rect = d.getBoundingClientRect();
        const style = window.getComputedStyle(d);
        const parent = d.parentElement;
        const parentStyle = parent ? window.getComputedStyle(parent) : null;
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          borderRadius: style.borderRadius,
          parentPadding: parentStyle ? parentStyle.padding : '',
        };
      });

      if (vp.isMobile) {
        const heightMatch = Math.abs(dialogGeo.height - vp.height) <= 1;
        const widthMatch = Math.abs(dialogGeo.width - vp.width) <= 1;
        const zeroRadius = dialogGeo.borderRadius === '0px';
        const zeroPadding = dialogGeo.parentPadding === '0px';

        record('geometry', `${vp.name} Full-Screen Height (100dvh)`, heightMatch, `height=${dialogGeo.height}px, expected=${vp.height}px`);
        record('geometry', `${vp.name} Full-Screen Width (w-full)`, widthMatch, `width=${dialogGeo.width}px, expected=${vp.width}px`);
        record('geometry', `${vp.name} Zero Border Radius (rounded-none)`, zeroRadius, `borderRadius=${dialogGeo.borderRadius}`);
        record('geometry', `${vp.name} Zero Outer Padding (p-0)`, zeroPadding, `parentPadding=${dialogGeo.parentPadding}`);
      } else {
        const isFloating = dialogGeo.x > 0;
        const isRounded = dialogGeo.borderRadius !== '0px';
        const notFullHeight = dialogGeo.height < vp.height;

        record('geometry', `${vp.name} Desktop Centered Floating Modal`, isFloating, `x=${dialogGeo.x}px > 0`);
        record('geometry', `${vp.name} Desktop Rounded Corners (rounded-3xl)`, isRounded, `borderRadius=${dialogGeo.borderRadius}`);
        record('geometry', `${vp.name} Desktop Bounded Height (< 100vh)`, notFullHeight, `height=${dialogGeo.height}px < ${vp.height}px`);
      }

      // Close button measurements
      const closeBtnGeo = await page.evaluate(() => {
        const btn = document.querySelector('[role="dialog"] button[aria-label*="tutup" i]');
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        const svg = btn.querySelector('svg');
        return {
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
          top: Math.round(rect.top * 10) / 10,
          hasSvg: !!svg,
          ariaLabel: btn.getAttribute('aria-label'),
          styleTop: btn.style.top,
        };
      });

      const btnWidthPass = closeBtnGeo && closeBtnGeo.width >= 44;
      const btnHeightPass = closeBtnGeo && closeBtnGeo.height >= 44;
      const safeTopPass = closeBtnGeo && (closeBtnGeo.top >= 14 || closeBtnGeo.styleTop.includes('safe-area-inset-top'));

      record('closeButton', `${vp.name} Close Button Width >= 44px`, btnWidthPass, `width=${closeBtnGeo?.width}px`);
      record('closeButton', `${vp.name} Close Button Height >= 44px`, btnHeightPass, `height=${closeBtnGeo?.height}px`);
      record('closeButton', `${vp.name} Safe Area Top Clearance`, safeTopPass, `top=${closeBtnGeo?.top}px, style.top=${closeBtnGeo?.styleTop}`);
    }

    // Reset to 360px mobile for Suites 4 & 5
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(100);

    // -------------------------------------------------------------
    // SUITE 4: Scroll Architecture & Trap Elimination
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Scroll Architecture & Trap Elimination ---');
    await page.waitForSelector('text=Episode Tersedia', { timeout: 5000 });

    const scrollAnalysis = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const allElements = Array.from(dialog.querySelectorAll('*'));
      const scrollContainers = allElements.filter(el => {
        const s = window.getComputedStyle(el);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll');
      });

      const mainScroll = dialog.querySelector('.overflow-y-auto');
      const mainStyle = mainScroll ? window.getComputedStyle(mainScroll) : null;

      const epSection = dialog.querySelector('.space-y-4 .flex.flex-col.gap-3');
      const epStyle = epSection ? window.getComputedStyle(epSection) : null;

      return {
        totalVerticalScrollContainers: scrollContainers.length,
        overscrollBehaviorY: mainStyle ? mainStyle.overscrollBehaviorY : '',
        paddingBottom: mainStyle ? mainStyle.paddingBottom : '',
        epOverflowY: epStyle ? epStyle.overflowY : '',
        epMaxHeight: epStyle ? epStyle.maxHeight : '',
        mainScrollHeight: mainScroll ? mainScroll.scrollHeight : 0,
        mainClientHeight: mainScroll ? mainScroll.clientHeight : 0,
      };
    });

    record('scrollArchitecture', 'Exactly 1 vertical scroll container in modal', scrollAnalysis.totalVerticalScrollContainers === 1, `count=${scrollAnalysis.totalVerticalScrollContainers}`);
    record('scrollArchitecture', 'Modal scroll has overscroll-behavior-y: contain', scrollAnalysis.overscrollBehaviorY === 'contain', `overscrollBehaviorY=${scrollAnalysis.overscrollBehaviorY}`);
    record('scrollArchitecture', 'Episode section has visible overflow (NO inner trap)', scrollAnalysis.epOverflowY === 'visible', `epOverflowY=${scrollAnalysis.epOverflowY}`);
    record('scrollArchitecture', 'Episode section has no max-height constraint', scrollAnalysis.epMaxHeight === 'none', `epMaxHeight=${scrollAnalysis.epMaxHeight}`);
    record('scrollArchitecture', 'Safe area bottom padding on scroll container (>= 32px)', parseInt(scrollAnalysis.paddingBottom) >= 32, `paddingBottom=${scrollAnalysis.paddingBottom}`);

    const canScroll = scrollAnalysis.mainScrollHeight > scrollAnalysis.mainClientHeight;
    record('scrollArchitecture', 'Modal content is scrollable (> clientHeight)', canScroll, `scrollHeight=${scrollAnalysis.mainScrollHeight}px > clientHeight=${scrollAnalysis.mainClientHeight}px`);

    if (canScroll) {
      const scrolled = await page.evaluate(() => {
        const mainScroll = document.querySelector('[role="dialog"] .overflow-y-auto');
        mainScroll.scrollTop = 200;
        return mainScroll.scrollTop;
      });
      record('scrollArchitecture', 'Modal scrolls programmatically without trap', scrolled > 0, `scrollTop=${scrolled}px`);
    }

    // -------------------------------------------------------------
    // SUITE 5: Season Selector Swipe & EpisodeCard Clamping
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Season Selector Swipe & EpisodeCard Clamping ---');
    const seasonInfo = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const seasonContainer = dialog.querySelector('.overflow-x-auto.no-scrollbar');
      if (!seasonContainer) return { found: false };

      const pills = Array.from(seasonContainer.querySelectorAll('button'));
      const pillData = pills.map((p, idx) => {
        const rect = p.getBoundingClientRect();
        return {
          index: idx,
          text: p.textContent.trim(),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      });

      const containerStyle = window.getComputedStyle(seasonContainer);
      return {
        found: true,
        pillCount: pills.length,
        pills: pillData,
        overflowX: containerStyle.overflowX,
      };
    });

    record('seasonSelector', 'Multi-season selector rendered', seasonInfo.found && seasonInfo.pillCount === 3, `pills=${seasonInfo.pillCount}`);
    record('seasonSelector', 'Season selector container has overflow-x: auto', seasonInfo.overflowX === 'auto', `overflowX=${seasonInfo.overflowX}`);

    let allPillsSizePass = true;
    if (seasonInfo.pills) {
      for (const p of seasonInfo.pills) {
        if (p.height < 38 || p.width < 38) {
          allPillsSizePass = false;
        }
      }
    }
    record('seasonSelector', 'All season pills touch targets >= 38px (TOUCH_TARGET_PILL)', allPillsSizePass, JSON.stringify(seasonInfo.pills));

    // Test season switching: click Season 2
    const season2Btn = await page.$('[role="dialog"] button:has-text("Season 2")');
    if (season2Btn) {
      await season2Btn.click();
      await page.waitForTimeout(200);

      const s2VisibleTitle = await page.evaluate(() => {
        const ep = document.querySelector('[role="dialog"] .space-y-4 .flex.flex-col.gap-3 button');
        return ep ? ep.textContent : '';
      });
      const switched = s2VisibleTitle.includes('Era Baru Dimulai');
      record('seasonSelector', 'Clicking Season 2 updates visible episode list', switched, `text="${s2VisibleTitle.slice(0, 50)}..."`);
    }

    // Switch back to Season 1 to test extreme text clamping
    const season1Btn = await page.$('[role="dialog"] button:has-text("Season 1")');
    if (season1Btn) await season1Btn.click();
    await page.waitForTimeout(200);

    const clampInfo = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const ep1Btn = dialog.querySelector('.space-y-4 .flex.flex-col.gap-3 button');
      if (!ep1Btn) return null;

      const btnRect = ep1Btn.getBoundingClientRect();
      const thumb = ep1Btn.querySelector('.aspect-video');
      const thumbRect = thumb ? thumb.getBoundingClientRect() : null;
      const titleEl = ep1Btn.querySelector('.truncate');
      const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
      const badge = ep1Btn.querySelector('span');
      const badgeRect = badge ? badge.getBoundingClientRect() : null;

      return {
        btnWidth: Math.round(btnRect.width),
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
        thumbWidth: thumbRect ? Math.round(thumbRect.width) : 0,
        thumbHeight: thumbRect ? Math.round(thumbRect.height) : 0,
        titleWidth: titleRect ? Math.round(titleRect.width) : 0,
        badgeWidth: badgeRect ? Math.round(badgeRect.width) : 0,
        hasTruncateClass: titleEl ? titleEl.classList.contains('truncate') : false,
      };
    });

    record('episodeCardClamping', 'Episode card width fits inside 360px without overflow', clampInfo.btnWidth <= 328, `btnWidth=${clampInfo.btnWidth}px`);
    record('episodeCardClamping', 'Zero document horizontal overflow with extreme text', clampInfo.docScrollWidth <= clampInfo.docClientWidth, `scrollWidth=${clampInfo.docScrollWidth}px, clientWidth=${clampInfo.docClientWidth}px`);
    record('episodeCardClamping', 'Episode thumbnail scaled to w-28 (112px on mobile)', clampInfo.thumbWidth === 112, `thumbWidth=${clampInfo.thumbWidth}px`);
    record('episodeCardClamping', 'Episode title truncated cleanly in single-line flex row', clampInfo.hasTruncateClass && clampInfo.titleWidth > 0, `titleWidth=${clampInfo.titleWidth}px, truncate=${clampInfo.hasTruncateClass}`);

    // -------------------------------------------------------------
    // SUITE 3: Body Scroll Lock Lifecycle & Dismissal Methods
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Body Scroll Lock Lifecycle & Dismissal Methods ---');
    const lockedOverflow = await page.evaluate(() => document.body.style.overflow);
    record('bodyLock', 'Body locked on modal mount', lockedOverflow === 'hidden', `overflow="${lockedOverflow}"`);

    // 1. Dismiss via Close Button
    const closeBtn = await page.$('[role="dialog"] button[aria-label*="tutup" i]');
    await closeBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 });
    const restoredOverflow1 = await page.evaluate(() => document.body.style.overflow);
    record('bodyLock', 'Body restored on Close Button dismiss', restoredOverflow1 === '', `overflow="${restoredOverflow1}"`);

    // 2. Open and dismiss via ESC Key
    await card.click();
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 });
    const restoredOverflow2 = await page.evaluate(() => document.body.style.overflow);
    record('bodyLock', 'Body restored on ESC key dismiss', restoredOverflow2 === '', `overflow="${restoredOverflow2}"`);

    // 3. Open and dismiss via Backdrop Click on desktop (1024px)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(100);
    await card.click();
    await page.waitForSelector('[role="dialog"]');
    const lockedDesk = await page.evaluate(() => document.body.style.overflow);
    record('bodyLock', 'Desktop body locked on modal mount', lockedDesk === 'hidden', `overflow="${lockedDesk}"`);

    // Click at x: 10, y: 10 (backdrop padding area outside floating dialog)
    await page.mouse.click(10, 10);
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 });
    const restoredOverflow3 = await page.evaluate(() => document.body.style.overflow);
    record('bodyLock', 'Body restored on Backdrop click dismiss (desktop)', restoredOverflow3 === '', `overflow="${restoredOverflow3}"`);

    // Reset to 360px
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(100);

    // 4. Rapid Open/Close Stress (5 cycles)
    let leakDetected = false;
    for (let i = 0; i < 5; i++) {
      await card.click();
      await page.waitForSelector('[role="dialog"]');
      const btn = await page.$('[role="dialog"] button[aria-label*="tutup" i]');
      await btn.click();
      await page.waitForSelector('[role="dialog"]', { state: 'detached' });
      const ov = await page.evaluate(() => document.body.style.overflow);
      if (ov !== '') {
        leakDetected = true;
        break;
      }
    }
    record('bodyLock', 'Rapid Mount/Unmount (5 cycles) Zero Leak', !leakDetected, `leakDetected=${leakDetected}`);

    await context.close();
  } catch (err) {
    console.error('Fatal harness error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`  CHALLENGE SUMMARY: ${results.passed} PASSED | ${results.failed} FAILED | TOTAL: ${results.total}`);
  console.log('================================================================\n');

  return results;
}

runEmpiricalChallenge()
  .then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(2);
  });
