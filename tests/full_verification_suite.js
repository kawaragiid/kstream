const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  console.log('=== FULL VERIFICATION SUITE FOR PROPOSED NAVBAR OPTIMIZATION ===\n');

  // Viewports to test
  const mobileViewports = [360, 375, 390, 414, 430];
  const desktopViewports = [1024, 1040, 1060, 1080, 1100, 1200, 1279, 1280, 1440, 1920];

  let allPass = true;

  // 1. Mobile viewports verification
  console.log('--- 1. MOBILE VIEWPORTS (360px - 430px) ---');
  for (const w of mobileViewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 740 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);

    // Apply Option B styles
    await page.evaluate((width) => {
      const nav = document.querySelector('div.lg\\:flex');
      if (nav) {
        nav.style.whiteSpace = 'nowrap';
        if (width >= 1024 && width < 1280) {
          nav.style.gap = '16px';
        } else if (width >= 1280) {
          nav.style.gap = '24px';
        }
      }
      const container = document.querySelector('header .container');
      if (container) {
        if (width >= 1024 && width < 1280) {
          container.style.paddingLeft = '24px';
          container.style.paddingRight = '24px';
          container.style.gap = '24px';
        } else if (width >= 1280) {
          container.style.paddingLeft = '32px';
          container.style.paddingRight = '32px';
          container.style.gap = '32px';
        }
      }
    }, w);

    const m = await page.evaluate((width) => {
      const header = document.querySelector('header');
      const body = document.body;
      const doc = document.documentElement;
      return {
        headerScroll: header.scrollWidth,
        bodyScroll: body.scrollWidth,
        docScroll: doc.scrollWidth,
        overflow: Math.max(header.scrollWidth, body.scrollWidth, doc.scrollWidth) - width,
      };
    }, w);

    const pass = m.overflow <= 0;
    if (!pass) allPass = false;
    console.log(`Mobile ${w}px: headerScroll=${m.headerScroll}px, bodyScroll=${m.bodyScroll}px -> ${pass ? 'PASS (0px overflow)' : 'FAIL'}`);
    await page.close();
  }

  // 2. Desktop viewports verification
  console.log('\n--- 2. DESKTOP VIEWPORTS (1024px - 1920px) ---');
  for (const w of desktopViewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);

    // Apply Option B styles
    await page.evaluate((width) => {
      const nav = document.querySelector('div.lg\\:flex');
      if (nav) {
        nav.style.whiteSpace = 'nowrap';
        if (width >= 1024 && width < 1280) {
          nav.style.gap = '16px';
        } else if (width >= 1280) {
          nav.style.gap = '24px';
        }
      }
      const container = document.querySelector('header .container');
      if (container) {
        if (width >= 1024 && width < 1280) {
          container.style.paddingLeft = '24px';
          container.style.paddingRight = '24px';
          container.style.gap = '24px';
        } else if (width >= 1280) {
          container.style.paddingLeft = '32px';
          container.style.paddingRight = '32px';
          container.style.gap = '32px';
        }
      }
    }, w);

    const m = await page.evaluate((width) => {
      const header = document.querySelector('header');
      const body = document.body;
      const navLinks = header.querySelector('div.lg\\:flex');
      const rightGroup = header.querySelector('.ml-auto');
      const baruRilis = navLinks ? navLinks.querySelectorAll('a')[2] : null;
      return {
        headerScroll: header.scrollWidth,
        bodyScroll: body.scrollWidth,
        overflow: header.scrollWidth - width,
        navWidth: navLinks ? navLinks.getBoundingClientRect().width : 0,
        rightEdge: rightGroup ? rightGroup.getBoundingClientRect().right : 0,
        baruRilisHeight: baruRilis ? baruRilis.getBoundingClientRect().height : 0,
      };
    }, w);

    const pass = m.overflow <= 0 && m.baruRilisHeight <= 25;
    if (!pass) allPass = false;
    console.log(`Desktop ${w}px: headerScroll=${m.headerScroll}px, bodyScroll=${m.bodyScroll}px, overflow=${m.overflow}px, navWidth=${m.navWidth.toFixed(1)}px, rightEdge=${m.rightEdge.toFixed(1)}px, singleLineText=${m.baruRilisHeight <= 25} -> ${pass ? 'PASS' : 'FAIL'}`);
    await page.close();
  }

  console.log(`\nOVERALL VERDICT: ${allPass ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);

  await browser.close();
})();
