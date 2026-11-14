// @ts-check
const { launchBrowser, createContext } = require('./e2e/helpers/browser');

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 640, isMobile: true, hasTouch: true },
  { name: 'mobile-375', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'mobile-414', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: 'mobile-430', width: 430, height: 932, isMobile: true, hasTouch: true },
  { name: 'desktop-1024', width: 1024, height: 768, isMobile: false, hasTouch: false },
  { name: 'desktop-1280', width: 1280, height: 800, isMobile: false, hasTouch: false },
];

const ROUTES_TO_TEST = [
  { type: 'series', url: 'http://localhost:3008/series/piece-of-safe-2026' },
  { type: 'movie', url: 'http://localhost:3008/movies/bishu' },
];

async function runEmpiricalChallenge() {
  console.log('=== EMPIRICAL CHALLENGER M3-1: DETAIL PAGES & FAVORITE BUTTON ===\n');

  const browser = await launchBrowser({ headless: true });
  const allResults = [];

  for (const route of ROUTES_TO_TEST) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`TESTING ROUTE: ${route.type.toUpperCase()} (${route.url})`);
    console.log(`------------------------------------------------------------`);

    for (const vp of VIEWPORTS) {
      const context = await createContext(browser, vp);
      const page = await context.newPage();

      try {
        await page.goto(route.url, { waitUntil: 'networkidle' });

        // Evaluate Touch Targets, Geometry, and Overflow
        const data = await page.evaluate(({ width, isMobile }) => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerWidth = window.innerWidth;
          const overflow = scrollWidth - innerWidth;

          // 1. Hero banner outer wrapper and section
          const heroSection = document.querySelector('section');
          const heroComputed = heroSection ? window.getComputedStyle(heroSection) : null;
          const heroBorderRadius = heroComputed ? parseFloat(heroComputed.borderRadius) : null;
          const heroWrapper = heroSection?.parentElement;
          const heroWrapperComputed = heroWrapper ? window.getComputedStyle(heroWrapper) : null;
          const heroWrapperPaddingLeft = heroWrapperComputed ? parseFloat(heroWrapperComputed.paddingLeft) : null;
          const heroWrapperPaddingRight = heroWrapperComputed ? parseFloat(heroWrapperComputed.paddingRight) : null;

          // 2. Play Button
          const playBtn = document.querySelector('a[href*="/player"]');
          let playBox = null;
          if (playBtn) {
            const r = playBtn.getBoundingClientRect();
            playBox = { width: r.width, height: r.height, text: playBtn.textContent?.trim() };
          }

          // 3. FavoriteButton
          const favBtn = document.querySelector('button[aria-label*="Favorit"]');
          let favBox = null;
          let favBorderRadius = null;
          if (favBtn) {
            const r = favBtn.getBoundingClientRect();
            const cs = window.getComputedStyle(favBtn);
            favBox = { width: r.width, height: r.height, text: favBtn.textContent?.trim() };
            favBorderRadius = cs.borderRadius;
          }

          // 4. Trailer Button (if present)
          const allLinks = Array.from(document.querySelectorAll('a'));
          const trailerBtn = allLinks.find(a => a.textContent?.includes('Trailer') || a.href.includes('trailer'));
          let trailerBox = null;
          if (trailerBtn) {
            const r = trailerBtn.getBoundingClientRect();
            trailerBox = { width: r.width, height: r.height };
          }

          // 5. Episode Cards & Season Pills (if on series page)
          const episodeCards = Array.from(document.querySelectorAll('[data-episode-card]'));
          let firstEpisodeCard = null;
          if (episodeCards.length > 0) {
            const first = episodeCards[0];
            const thumb = first.querySelector('div.relative.aspect-video');
            const titleEl = first.querySelector('p.line-clamp-2');
            const thumbRect = thumb ? thumb.getBoundingClientRect() : null;
            const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
            firstEpisodeCard = {
              thumbWidth: thumbRect ? thumbRect.width : null,
              thumbHeight: thumbRect ? thumbRect.height : null,
              titleWidth: titleRect ? titleRect.width : null,
              titleOverflow: titleRect && thumbRect ? titleRect.right > window.innerWidth : false,
            };
          }

          // Season Pills
          const seasonPills = Array.from(document.querySelectorAll('div[role="tablist"] button, div.no-scrollbar button'));
          const seasonPillHeights = seasonPills.map(p => {
            const r = p.getBoundingClientRect();
            return { width: r.width, height: r.height, text: p.textContent?.trim() };
          });

          // Check overflowing DOM elements
          const allEls = Array.from(document.querySelectorAll('*'));
          const leakingElements = [];
          for (const el of allEls) {
            const r = el.getBoundingClientRect();
            if (r.width > innerWidth + 1 && r.right > innerWidth + 1) {
              leakingElements.push({
                tag: el.tagName,
                cls: el.className?.toString().slice(0, 80),
                width: r.width,
                right: r.right,
              });
            }
          }

          return {
            innerWidth,
            scrollWidth,
            overflow,
            heroBorderRadius,
            heroWrapperPaddingLeft,
            heroWrapperPaddingRight,
            playBox,
            favBox,
            favBorderRadius,
            trailerBox,
            firstEpisodeCard,
            seasonPillHeights,
            leakingElementsCount: leakingElements.length,
            sampleLeak: leakingElements[0] || null,
          };
        }, { width: vp.width, isMobile: vp.isMobile });

        const testRecord = {
          route: route.type,
          viewport: vp.name,
          width: vp.width,
          scrollWidth: data.scrollWidth,
          overflow: data.overflow,
          zeroOverflow: data.overflow <= 0,
          playTargetPass: data.playBox ? (data.playBox.width >= 44 && data.playBox.height >= 43.9) : true,
          playBox: data.playBox,
          favTargetPass: data.favBox ? (data.favBox.width >= 44 && data.favBox.height >= 43.9) : false,
          favBox: data.favBox,
          favPillRadius: data.favBorderRadius,
          trailerPass: data.trailerBox ? (data.trailerBox.width >= 44 && data.trailerBox.height >= 43.9) : true,
          trailerBox: data.trailerBox,
          seasonPillsPass: data.seasonPillHeights.every(p => p.height >= 37.9),
          seasonPillCount: data.seasonPillHeights.length,
          desktopParityPass: vp.width >= 1024
            ? (data.heroBorderRadius >= 20 && data.heroWrapperPaddingLeft >= 16)
            : (data.heroBorderRadius === 0 && data.heroWrapperPaddingLeft === 0),
          heroBorderRadius: data.heroBorderRadius,
          heroPadding: `${data.heroWrapperPaddingLeft}px`,
          firstEpisodeCard: data.firstEpisodeCard,
        };

        allResults.push(testRecord);

        console.log(`[${vp.name}] Overflow: ${data.overflow}px | Play: ${data.playBox ? `${data.playBox.width.toFixed(0)}x${data.playBox.height.toFixed(0)}px` : 'N/A'} | Fav: ${data.favBox ? `${data.favBox.width.toFixed(0)}x${data.favBox.height.toFixed(0)}px` : 'N/A'} | Hero Radius: ${data.heroBorderRadius}px | Hero Pad: ${data.heroWrapperPaddingLeft}px`);

      } finally {
        await context.close();
      }
    }
  }

  // ADVERSARIAL STRESS TEST: Inject extreme long text on 360px series & movie page
  console.log('\n------------------------------------------------------------');
  console.log('ADVERSARIAL STRESS: Extreme Long Content & Unbroken Strings');
  console.log('------------------------------------------------------------');

  for (const route of ROUTES_TO_TEST) {
    const context = await createContext(browser, VIEWPORTS[0]); // 360px
    const page = await context.newPage();
    try {
      await page.goto(route.url, { waitUntil: 'networkidle' });

      // Mutate DOM with adversarial stress content
      const stressResult = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1) {
          h1.textContent = 'SUPER_ULTRA_LONG_UNBROKEN_SERIES_TITLE_WITHOUT_SPACES_THAT_WOULD_BREAK_ORDINARY_FLEX_CONTAINERS_ON_MOBILE_SCREENS_1234567890';
        }

        const overview = document.querySelector('p.break-words');
        if (overview) {
          overview.textContent = 'Adversarial_Stress_Text_'.repeat(40) + ' ' + 'Normal words '.repeat(50);
        }

        // Measure document overflow
        const docEl = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
        const overflow = scrollWidth - window.innerWidth;

        // Check if H1 broke outside viewport
        const h1Rect = h1 ? h1.getBoundingClientRect() : null;
        const h1Overflow = h1Rect ? (h1Rect.right > window.innerWidth) : false;

        return {
          route: window.location.pathname,
          scrollWidth,
          innerWidth: window.innerWidth,
          overflow,
          h1Right: h1Rect ? h1Rect.right : 0,
          h1Overflow,
          pass: overflow <= 0 && !h1Overflow,
        };
      });

      console.log(`[Stress 360px - ${route.type}] Overflow: ${stressResult.overflow}px | H1 Overflow: ${stressResult.h1Overflow} | Result: ${stressResult.pass ? 'PASS' : 'FAIL'}`);
      allResults.push({ stressTest: true, route: route.type, ...stressResult });
    } finally {
      await context.close();
    }
  }

  // INTERACTIVE STRESS TEST: FavoriteButton toggle & feedback
  console.log('\n------------------------------------------------------------');
  console.log('INTERACTIVE STRESS: FavoriteButton Toggle & Feedback on 360px');
  console.log('------------------------------------------------------------');
  {
    const context = await createContext(browser, VIEWPORTS[0]); // 360px touch
    const page = await context.newPage();
    try {
      await page.goto(ROUTES_TO_TEST[0].url, { waitUntil: 'networkidle' });

      const favBtn = page.locator('button[aria-label*="Favorit"]').first();
      const initialBox = await favBtn.boundingBox();
      const initialText = await favBtn.textContent();
      const initialAria = await favBtn.getAttribute('aria-label');

      // Check active feedback class
      const hasActiveScale = await favBtn.evaluate(el => el.className.includes('active:scale-95'));
      const hasMinH44 = await favBtn.evaluate(el => el.className.includes('min-h-[44px]'));
      const hasRoundedFull = await favBtn.evaluate(el => el.className.includes('rounded-full'));

      console.log(`Initial Box: ${initialBox?.width.toFixed(1)}x${initialBox?.height.toFixed(1)}px | Text: "${initialText?.trim()}" | Aria: "${initialAria}"`);
      console.log(`Feedback classes: active:scale-95=${hasActiveScale}, min-h-[44px]=${hasMinH44}, rounded-full=${hasRoundedFull}`);

      allResults.push({
        interactiveFavoritePass: initialBox && initialBox.height >= 43.9 && initialBox.width >= 44 && hasActiveScale && hasMinH44 && hasRoundedFull,
        initialBox,
        hasActiveScale,
        hasMinH44,
        hasRoundedFull,
      });
    } finally {
      await context.close();
    }
  }

  // MODAL OVERLAY STRESS TEST: MediaOverlayRoot full-screen and geometry
  console.log('\n------------------------------------------------------------');
  console.log('MODAL OVERLAY EMPIRICAL MEASUREMENT: 360px vs 1024px');
  console.log('------------------------------------------------------------');
  for (const vp of [VIEWPORTS[0], VIEWPORTS[5]]) { // 360px and 1024px
    const context = await createContext(browser, vp);
    const page = await context.newPage();
    try {
      await page.goto('http://localhost:3008/', { waitUntil: 'networkidle' });

      // Trigger modal overlay via MediaOverlayContext / Poster click
      // Let's see if clicking a card opens the modal or navigates
      const card = page.locator('[data-card="true"]').first();
      if (await card.isVisible()) {
        // Evaluate dispatching openMedia if modal provider is active
        const modalOpened = await page.evaluate(() => {
          // Check if modal provider exists on window or trigger click
          const dialog = document.querySelector('div[role="dialog"]');
          return dialog !== null;
        });

        // Trigger detail overlay directly via test injection if needed or card click
        await card.click();
        await page.waitForTimeout(500);

        const modalGeometry = await page.evaluate((isMobile) => {
          const dialog = document.querySelector('div[role="dialog"]');
          if (!dialog) return { found: false };

          const rect = dialog.getBoundingClientRect();
          const cs = window.getComputedStyle(dialog);
          const closeBtn = dialog.querySelector('button[aria-label*="Tutup"]');
          const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;

          return {
            found: true,
            width: rect.width,
            height: rect.height,
            borderRadius: parseFloat(cs.borderRadius),
            closeWidth: closeRect ? closeRect.width : 0,
            closeHeight: closeRect ? closeRect.height : 0,
            isFullScreenMobile: isMobile ? (rect.width >= window.innerWidth && rect.height >= window.innerHeight - 5) : false,
            isCenteredDesktop: !isMobile ? (rect.width < window.innerWidth && parseFloat(cs.borderRadius) >= 20) : false,
          };
        }, vp.isMobile);

        console.log(`[Modal ${vp.name}] Found: ${modalGeometry.found} | Box: ${modalGeometry.width?.toFixed(0)}x${modalGeometry.height?.toFixed(0)}px | Radius: ${modalGeometry.borderRadius}px | Close: ${modalGeometry.closeWidth?.toFixed(0)}x${modalGeometry.closeHeight?.toFixed(0)}px`);
        allResults.push({ modalTest: true, viewport: vp.name, ...modalGeometry });
      }
    } finally {
      await context.close();
    }
  }

  await browser.close();

  // Print summary JSON
  console.log('\n=== EMPIRICAL CHALLENGE SUMMARY ===');
  console.log(JSON.stringify(allResults, null, 2));

  // Determine overall verdict
  const failedRecords = allResults.filter(r => {
    if (r.zeroOverflow === false) return true;
    if (r.playTargetPass === false) return true;
    if (r.favTargetPass === false) return true;
    if (r.desktopParityPass === false) return true;
    if (r.stressTest && !r.pass) return true;
    if (r.interactiveFavoritePass === false) return true;
    return false;
  });

  console.log(`\nTOTAL FAILED CHECKS: ${failedRecords.length}`);
  if (failedRecords.length === 0) {
    console.log('CHALLENGER VERDICT: APPROVE');
  } else {
    console.log('CHALLENGER VERDICT: REQUEST_CHANGES');
    console.log('FAILURES:', JSON.stringify(failedRecords, null, 2));
  }
}

runEmpiricalChallenge().catch(err => {
  console.error('Empirical challenge error:', err);
  process.exit(1);
});
