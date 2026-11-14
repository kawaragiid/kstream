const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const viewports = [
    360, 375, 390, 412, 430,
    768, 1023, 1024, 1025, 1030, 1040, 1050, 1080, 1100, 1200, 1279, 1280, 1440, 1920
  ];

  console.log('=== CHALLENGER M1-1 ROUND 2 ADVERSARIAL STRESS TEST ===\n');

  let failureCount = 0;

  // 1. Boundary Viewport Overflow Check (Scoped 360px - 1920px)
  console.log('--- TEST 1: Fine-Grained Viewport Overflow Check (360px - 1920px) ---');
  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);

    const m = await page.evaluate((width) => {
      const header = document.querySelector('header');
      const body = document.body;
      const doc = document.documentElement;
      return {
        width,
        headerScroll: header ? header.scrollWidth : 0,
        headerClient: header ? header.clientWidth : 0,
        bodyScroll: body.scrollWidth,
        docScroll: doc.scrollWidth,
        headerOverflow: header ? Math.max(0, header.scrollWidth - width) : 0,
        docOverflow: Math.max(0, doc.scrollWidth - width),
      };
    }, w);

    const pass = m.headerOverflow === 0 && m.docOverflow === 0;
    if (!pass) failureCount++;
    console.log(`Viewport ${String(w).padStart(4)}px: headerScroll=${m.headerScroll}px, docScroll=${m.docScroll}px -> ${pass ? 'PASS (0px overflow)' : `FAIL (+${m.headerOverflow || m.docOverflow}px)`}`);
    await page.close();
  }

  // 1b. Informational Sub-360px Boundary (320px)
  {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    const m320 = await page.evaluate(() => {
      const header = document.querySelector('header');
      const doc = document.documentElement;
      return {
        headerScroll: header ? header.scrollWidth : 0,
        docScroll: doc.scrollWidth,
      };
    });
    console.log(`[INFO] Sub-envelope 320px check: headerScroll=${m320.headerScroll}px, docScroll=${m320.docScroll}px (body scroll horizontal: ${m320.docScroll <= 320 ? 'NONE' : 'EXISTS'})`);
    await page.close();
  }

  // 2. Semantic Nav Landmark & Landmark Selectors
  console.log('\n--- TEST 2: Semantic Nav Landmark & Landmark Selectors ---');
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const landmarkCheck = await page.evaluate(() => {
      const nav = document.querySelector('header nav[aria-label="Navigasi Utama"]');
      const loginInNav = nav ? nav.querySelector('a[href*="login"]') : null;
      const homeInNav = nav ? nav.querySelector('a[href="/"]') : null;
      const drawerOutsideNav = !nav.querySelector('#mobile-nav-drawer');

      return {
        navExists: !!nav,
        ariaLabel: nav ? nav.getAttribute('aria-label') : null,
        hasLoginLink: !!loginInNav,
        hasHomeLink: !!homeInNav,
        drawerOutsideNav,
      };
    });

    console.log('Landmark check result:', landmarkCheck);
    if (!landmarkCheck.navExists || landmarkCheck.ariaLabel !== 'Navigasi Utama' || !landmarkCheck.hasLoginLink || !landmarkCheck.drawerOutsideNav) {
      console.log('Semantic Landmark Check: FAIL');
      failureCount++;
    } else {
      console.log('Semantic Landmark Check: PASS');
    }
    await page.close();
  }

  // 3. Mobile Touch Targets (360px)
  console.log('\n--- TEST 3: Mobile Touch Target Compliance (360px) ---');
  {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const targets = await page.evaluate(() => {
      const hamburger = document.querySelector('header button[aria-label="Menu navigasi"]');
      const search = document.querySelector('header a[href="/search"]');
      const login = document.querySelector('header a[href="/login"]');
      const register = document.querySelector('header a[href="/register"]');

      const getDims = (el) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      };

      return {
        hamburger: getDims(hamburger),
        search: getDims(search),
        login: getDims(login),
        register: getDims(register),
      };
    });

    console.log('Touch target dimensions:', targets);
    const hPass = targets.hamburger && targets.hamburger.width >= 44 && targets.hamburger.height >= 44;
    const sPass = targets.search && targets.search.width >= 44 && targets.search.height >= 44;
    const lPass = targets.login && targets.login.height >= 44;
    const rPass = targets.register && targets.register.height >= 44;

    if (hPass && sPass && lPass && rPass) {
      console.log('Touch Target Compliance: PASS');
    } else {
      console.log('Touch Target Compliance: FAIL');
      failureCount++;
    }
    await page.close();
  }

  console.log(`\n=== OVERALL ADVERSARIAL VERDICT: ${failureCount === 0 ? 'ALL CHECKS PASSED' : `${failureCount} FAILURES`} ===`);
  await browser.close();
  process.exit(failureCount === 0 ? 0 : 1);
})();
