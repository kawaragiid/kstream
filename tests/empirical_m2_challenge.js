// @ts-check
const { launchBrowser, createContext } = require('./e2e/helpers/browser');

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 640, isMobile: true, hasTouch: true },
  { name: 'mobile-375', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'mobile-414', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: 'mobile-430', width: 430, height: 932, isMobile: true, hasTouch: true },
];

async function main() {
  const browser = await launchBrowser({ headless: true });
  console.log('=== EMPIRICAL MEASUREMENT HARNESS: CAROUSEL & CARDPOSTER ===\n');

  const results = {
    cardWidths: [],
    peekRatios: [],
    containerSnap: [],
    cardSnap: [],
    scrollbarSuppression: [],
    touchVsDesktop: [],
    overflowResults: []
  };

  for (const vp of VIEWPORTS) {
    const context = await createContext(browser, vp);
    const page = await context.newPage();
    await page.goto('http://localhost:3005/');
    await page.waitForLoadState('networkidle');

    // 1. Measure Card Widths & Peek Ratios
    const measurement = await page.evaluate((width) => {
      const container = document.querySelector('.overflow-x-auto');
      if (!container) return { error: 'No .overflow-x-auto container found' };

      const cards = Array.from(container.querySelectorAll('[data-card="true"]'));
      const cardElements = cards.length > 0 ? cards : Array.from(container.children);

      const card0 = cardElements[0]?.getBoundingClientRect();
      const card1 = cardElements[1]?.getBoundingClientRect();
      const card2 = cardElements[2]?.getBoundingClientRect();

      const card0Width = card0 ? card0.width : 0;
      const card0Vw = (card0Width / width) * 100;

      // Card 3 peek (index 2)
      let card2VisibleWidth = 0;
      let card2PeekRatio = 0;
      let hasPeek = false;

      if (card2) {
        card2VisibleWidth = Math.max(0, width - card2.left);
        card2PeekRatio = card2.width > 0 ? (card2VisibleWidth / card2.width) : 0;
        hasPeek = card2.left < width && (card2.left + card2.width) > width && card2PeekRatio >= 0.20;
      }

      // Container snap & scrollbar classes
      const containerCls = container.className;
      const containerStyle = window.getComputedStyle(container);
      const snapType = containerStyle.scrollSnapType || containerStyle['scroll-snap-type'];
      const scrollPaddingLeft = containerStyle.scrollPaddingLeft;
      const scrollbarWidth = containerStyle.scrollbarWidth;

      // Card snap
      const firstCardWrapper = container.firstElementChild;
      const cardWrapperCls = firstCardWrapper ? firstCardWrapper.className : '';
      const cardWrapperStyle = firstCardWrapper ? window.getComputedStyle(firstCardWrapper) : null;
      const snapAlign = cardWrapperStyle ? cardWrapperStyle.scrollSnapAlign : '';

      // Overflow check
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl ? docEl.scrollWidth : 0, body ? body.scrollWidth : 0);
      const overflow = scrollWidth - width;

      return {
        cardCount: cardElements.length,
        card0Width,
        card0Vw,
        card2Left: card2 ? card2.left : 0,
        card2Width: card2 ? card2.width : 0,
        card2VisibleWidth,
        card2PeekRatio,
        hasPeek,
        containerCls,
        snapType,
        scrollPaddingLeft,
        scrollbarWidth,
        cardWrapperCls,
        snapAlign,
        scrollWidth,
        overflow
      };
    }, vp.width);

    results.cardWidths.push({
      viewport: vp.name,
      width: vp.width,
      measuredPx: parseFloat(measurement.card0Width.toFixed(2)),
      measuredVw: parseFloat(measurement.card0Vw.toFixed(2)),
      expectedVwRange: '34vw - 38vw',
      pass: measurement.card0Vw >= 34 && measurement.card0Vw <= 38
    });

    results.peekRatios.push({
      viewport: vp.name,
      width: vp.width,
      card2Left: parseFloat(measurement.card2Left.toFixed(2)),
      card2Width: parseFloat(measurement.card2Width.toFixed(2)),
      card2VisibleWidth: parseFloat(measurement.card2VisibleWidth.toFixed(2)),
      card2PeekRatio: (measurement.card2PeekRatio * 100).toFixed(1) + '%',
      hasPeek: measurement.hasPeek,
      pass: measurement.hasPeek && measurement.card2PeekRatio >= 0.20
    });

    results.containerSnap.push({
      viewport: vp.name,
      hasSnapX: measurement.containerCls.includes('snap-x'),
      hasSnapMandatory: measurement.containerCls.includes('snap-mandatory'),
      hasScrollPl4: measurement.containerCls.includes('scroll-pl-4'),
      computedSnapType: measurement.snapType,
      pass: measurement.containerCls.includes('snap-x') &&
            measurement.containerCls.includes('snap-mandatory') &&
            measurement.containerCls.includes('scroll-pl-4')
    });

    results.cardSnap.push({
      viewport: vp.name,
      hasSnapStart: measurement.cardWrapperCls.includes('snap-start'),
      computedSnapAlign: measurement.snapAlign,
      pass: measurement.cardWrapperCls.includes('snap-start')
    });

    results.scrollbarSuppression.push({
      viewport: vp.name,
      hasNoScrollbarClass: measurement.containerCls.includes('no-scrollbar'),
      computedScrollbarWidth: measurement.scrollbarWidth,
      pass: measurement.containerCls.includes('no-scrollbar') || measurement.scrollbarWidth === 'none'
    });

    results.overflowResults.push({
      viewport: vp.name,
      scrollWidth: measurement.scrollWidth,
      windowWidth: vp.width,
      overflow: measurement.overflow,
      pass: measurement.overflow <= 0
    });

    // 6. Test CardPoster touch behavior: Hovering in touch mode should NOT mount video
    const firstCard = page.locator('[data-card="true"]').first();
    await firstCard.hover();
    await page.waitForTimeout(300);

    const touchVideoMounted = await page.evaluate(() => {
      const popoverVideo = document.querySelector('[data-popover="true"] video');
      return popoverVideo !== null;
    });

    const activeFeedbackPresent = await page.evaluate(() => {
      const card = document.querySelector('[data-card="true"]');
      if (!card) return false;
      return card.className.includes('active:scale-95');
    });

    results.touchVsDesktop.push({
      mode: `Touch (${vp.name})`,
      videoMounted: touchVideoMounted,
      activeFeedbackPresent,
      pass: !touchVideoMounted && activeFeedbackPresent
    });

    await context.close();
  }

  // 6b. Test CardPoster Desktop hover behavior: Popover mounts on desktop hover
  {
    const desktopContext = await createContext(browser, {
      name: 'desktop-1280',
      width: 1280,
      height: 800,
      isMobile: false,
      hasTouch: false,
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://localhost:3005/');
    await desktopPage.waitForLoadState('networkidle');

    const card = desktopPage.locator('[data-card="true"]').first();
    await card.hover();
    // Wait for the 200ms preview timer
    await desktopPage.waitForTimeout(400);

    const desktopPopoverMounted = await desktopPage.evaluate(() => {
      const popover = document.querySelector('[data-popover="true"]');
      return popover !== null && window.getComputedStyle(popover).display !== 'none';
    });

    results.touchVsDesktop.push({
      mode: 'Desktop (1280px hover)',
      popoverMounted: desktopPopoverMounted,
      pass: desktopPopoverMounted
    });

    await desktopContext.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error('Measurement harness error:', err);
  process.exit(1);
});
