const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Test across key viewports:
  // Mobile: 360, 375, 390, 414, 430
  // Tablet/Mid: 768, 800, 900
  // Desktop boundary: 1024, 1040, 1060, 1080, 1100, 1200, 1279
  // Wide Desktop: 1280, 1440, 1920
  const viewports = [360, 375, 390, 414, 430, 768, 1024, 1040, 1060, 1080, 1100, 1200, 1279, 1280, 1440, 1920];

  console.log('=== EXPERIMENT: Current (gap-6) vs Proposed (gap-4 at lg, gap-6 at xl) ===');

  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const baseline = await page.evaluate(() => {
      const header = document.querySelector('header');
      const body = document.body;
      const navLinksDiv = header.querySelector('div.lg\\:flex');
      const navLinksRect = navLinksDiv ? navLinksDiv.getBoundingClientRect() : null;
      const container = header.querySelector('.container');
      const containerRect = container ? container.getBoundingClientRect() : null;
      const cStyle = container ? window.getComputedStyle(container) : null;
      const navStyle = navLinksDiv ? window.getComputedStyle(navLinksDiv) : null;
      const rightGroup = header.querySelector('.ml-auto');
      const rightRect = rightGroup ? rightGroup.getBoundingClientRect() : null;

      return {
        headerScroll: header.scrollWidth,
        headerClient: header.clientWidth,
        bodyScroll: body.scrollWidth,
        navLinksWidth: navLinksRect ? navLinksRect.width : 0,
        navLinksGap: navStyle ? navStyle.gap : null,
        containerPadding: cStyle ? `${cStyle.paddingLeft} + ${cStyle.paddingRight}` : null,
        rightEdge: rightRect ? rightRect.right : 0,
        overflow: header.scrollWidth - window.innerWidth,
      };
    });

    // Now dynamically simulate the proposed change:
    // If viewport >= 1024 and < 1280 -> gap: 16px (gap-4)
    // If viewport >= 1280 -> gap: 24px (xl:gap-6)
    // On mobile (< 1024) -> div.lg:flex is display: none anyway
    const proposed = await page.evaluate((width) => {
      const header = document.querySelector('header');
      const body = document.body;
      const navLinksDiv = header.querySelector('div.lg\\:flex');
      if (navLinksDiv) {
        if (width >= 1024 && width < 1280) {
          navLinksDiv.style.gap = '16px'; // gap-4 (1rem)
        } else if (width >= 1280) {
          navLinksDiv.style.gap = '24px'; // xl:gap-6 (1.5rem)
        }
      }

      // Read new measurements
      const navLinksRect = navLinksDiv ? navLinksDiv.getBoundingClientRect() : null;
      const navStyle = navLinksDiv ? window.getComputedStyle(navLinksDiv) : null;
      const rightGroup = header.querySelector('.ml-auto');
      const rightRect = rightGroup ? rightGroup.getBoundingClientRect() : null;

      return {
        headerScroll: header.scrollWidth,
        headerClient: header.clientWidth,
        bodyScroll: body.scrollWidth,
        navLinksWidth: navLinksRect ? navLinksRect.width : 0,
        navLinksGap: navStyle ? navStyle.gap : null,
        rightEdge: rightRect ? rightRect.right : 0,
        overflow: header.scrollWidth - window.innerWidth,
      };
    }, w);

    console.log(
      `Viewport ${w}px:\n` +
      `  [Baseline]:  linksWidth=${baseline.navLinksWidth.toFixed(1)}px (gap=${baseline.navLinksGap}), ` +
      `rightEdge=${baseline.rightEdge.toFixed(1)}px, headerScroll=${baseline.headerScroll}px, overflow=${baseline.overflow > 0 ? '+' + baseline.overflow + 'px (FAIL)' : '0px (OK)'}\n` +
      `  [Proposed]:  linksWidth=${proposed.navLinksWidth.toFixed(1)}px (gap=${proposed.navLinksGap}), ` +
      `rightEdge=${proposed.rightEdge.toFixed(1)}px, headerScroll=${proposed.headerScroll}px, overflow=${proposed.overflow > 0 ? '+' + proposed.overflow + 'px (FAIL)' : '0px (OK)'}`
    );

    await page.close();
  }

  await browser.close();
})();
