const { chromium } = require('@playwright/test');

async function runReviewerVerification() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const results = {
    checks: [],
    passed: 0,
    failed: 0,
  };

  function assert(name, condition, details = {}) {
    if (condition) {
      results.passed++;
      results.checks.push({ name, status: 'PASS', details });
      console.log(`[PASS] ${name}`);
    } else {
      results.failed++;
      results.checks.push({ name, status: 'FAIL', details });
      console.error(`[FAIL] ${name}`, details);
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. DESKTOP VIEWPORT OVERFLOW CHECK (1024px to 1920px)
    // -------------------------------------------------------------
    console.log('\n--- 1. DESKTOP VIEWPORT OVERFLOW CHECK ---');
    const desktopViewports = [1024, 1040, 1060, 1080, 1100, 1200, 1280, 1440, 1920];
    for (const width of desktopViewports) {
      const page = await browser.newPage({ viewport: { width, height: 768 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const m = await page.evaluate((w) => {
        const header = document.querySelector('header');
        const body = document.body;
        const doc = document.documentElement;
        return {
          viewport: w,
          headerScroll: header ? header.scrollWidth : 0,
          bodyScroll: body.scrollWidth,
          docScroll: doc.scrollWidth,
          headerOverflow: header ? Math.max(0, header.scrollWidth - w) : 0,
          bodyOverflow: Math.max(0, body.scrollWidth - w),
        };
      }, width);

      assert(
        `Desktop ${width}px: Header has 0px overflow`,
        m.headerOverflow === 0,
        { headerScroll: m.headerScroll, width }
      );
      assert(
        `Desktop ${width}px: Body has 0px overflow`,
        m.bodyOverflow === 0,
        { bodyScroll: m.bodyScroll, width }
      );

      await page.close();
    }

    // -------------------------------------------------------------
    // 2. MOBILE VIEWPORTS OVERFLOW & 360px BUDGET CHECK
    // -------------------------------------------------------------
    console.log('\n--- 2. MOBILE VIEWPORTS & BUDGET CHECK ---');
    const mobileViewports = [360, 375, 390, 414, 430];
    for (const width of mobileViewports) {
      const page = await browser.newPage({ viewport: { width, height: 740 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const m = await page.evaluate((w) => {
        const header = document.querySelector('header');
        return {
          headerScroll: header ? header.scrollWidth : 0,
          headerOverflow: header ? Math.max(0, header.scrollWidth - w) : 0,
        };
      }, width);

      assert(
        `Mobile ${width}px: Header has 0px overflow`,
        m.headerOverflow === 0,
        { headerScroll: m.headerScroll, width }
      );

      await page.close();
    }

    // Measure detailed 360px budget
    {
      const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const budget = await page.evaluate(() => {
        const header = document.querySelector('header');
        const container = header.querySelector('.container');
        const hamburger = container.querySelector('button[aria-label="Menu navigasi"]');
        const logo = container.querySelector('a[href="/"]');
        const search = container.querySelector('a[href="/search"]');
        const login = container.querySelector('a[href="/login"]');
        const authGroup = login ? login.parentElement : null;

        const hRect = hamburger ? hamburger.getBoundingClientRect() : { width: 0, left: 0, right: 0 };
        const lRect = logo ? logo.getBoundingClientRect() : { width: 0, left: 0, right: 0 };
        const sRect = search ? search.getBoundingClientRect() : { width: 0, left: 0, right: 0 };
        const aRect = authGroup ? authGroup.getBoundingClientRect() : { width: 0, left: 0, right: 0 };

        const cStyle = window.getComputedStyle(container);
        const pL = parseFloat(cStyle.paddingLeft);
        const pR = parseFloat(cStyle.paddingRight);

        const leftSpan = lRect.right - hRect.left;
        const rightSpan = aRect.right - sRect.left;
        const middleGap = sRect.left - lRect.right;
        const intrinsicSum = leftSpan + rightSpan + pL + pR;

        return {
          paddingTotal: pL + pR,
          hamburgerWidth: hRect.width,
          logoWidth: lRect.width,
          leftSpan,
          searchWidth: sRect.width,
          authGroupWidth: aRect.width,
          rightSpan,
          middleGap,
          intrinsicSum,
          headerScrollWidth: header.scrollWidth,
        };
      });

      assert(
        '360px Top bar intrinsic sum <= 340px ceiling',
        budget.intrinsicSum <= 340,
        { intrinsicSum: budget.intrinsicSum, ceiling: 340 }
      );
      assert(
        '360px Positive gap between logo and search CTA (> 20px)',
        budget.middleGap > 20,
        { middleGap: budget.middleGap }
      );

      await page.close();
    }

    // -------------------------------------------------------------
    // 3. SEMANTIC LANDMARK & ACCESSIBILITY CHECK
    // -------------------------------------------------------------
    console.log('\n--- 3. SEMANTIC LANDMARK & ACCESSIBILITY ---');
    {
      const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const navLandmarks = await page.evaluate(() => {
        const header = document.querySelector('header');
        const nav = header.querySelector('nav[aria-label="Navigasi Utama"]');
        const drawer = document.getElementById('mobile-nav-drawer');

        return {
          hasHeader: !!header,
          hasSemanticNav: !!nav,
          navAriaLabel: nav ? nav.getAttribute('aria-label') : null,
          isDrawerInsideNav: nav && drawer ? nav.contains(drawer) : false,
          navContainsLogin: nav ? !!nav.querySelector('a[href*="login"]') : false,
          navContainsLogo: nav ? !!nav.querySelector('a[href="/"]') : false,
        };
      });

      assert(
        'Header contains semantic nav[aria-label="Navigasi Utama"]',
        navLandmarks.hasSemanticNav && navLandmarks.navAriaLabel === 'Navigasi Utama'
      );
      assert(
        'Semantic nav contains desktop navigation links & login CTA',
        navLandmarks.navContainsLogin && navLandmarks.navContainsLogo
      );
      assert(
        'Mobile drawer is NOT improperly nested inside semantic top nav',
        !navLandmarks.isDrawerInsideNav
      );

      await page.close();
    }

    // -------------------------------------------------------------
    // 4. TOUCH TARGET COMPLIANCE (>= 44x44px)
    // -------------------------------------------------------------
    console.log('\n--- 4. TOUCH TARGET COMPLIANCE ---');
    {
      const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const targets = await page.evaluate(() => {
        const hamburger = document.querySelector('header button[aria-label="Menu navigasi"]');
        const search = document.querySelector('header a[href="/search"]');
        const login = document.querySelector('header a[href="/login"]');
        const register = document.querySelector('header a[href="/register"]');
        const footerLinks = Array.from(document.querySelectorAll('footer a'));

        const getBox = (el) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10 };
        };

        return {
          hamburger: getBox(hamburger),
          search: getBox(search),
          login: getBox(login),
          register: getBox(register),
          minFooterHeight: Math.min(...footerLinks.map((a) => a.getBoundingClientRect().height)),
        };
      });

      assert(
        'Hamburger button touch target >= 44x44px',
        targets.hamburger && targets.hamburger.width >= 44 && targets.hamburger.height >= 44,
        targets.hamburger
      );
      assert(
        'Search button touch target >= 44x44px',
        targets.search && targets.search.width >= 44 && targets.search.height >= 44,
        targets.search
      );
      assert(
        'Login button touch target height >= 44px',
        targets.login && targets.login.height >= 44,
        targets.login
      );
      assert(
        'Register button touch target height >= 44px',
        targets.register && targets.register.height >= 44,
        targets.register
      );
      assert(
        'Footer links touch target height >= 44px',
        targets.minFooterHeight >= 44,
        { minFooterHeight: targets.minFooterHeight }
      );

      // Open drawer to check drawer touch targets
      const hamburgerBtn = page.locator('header button[aria-label="Menu navigasi"]');
      await hamburgerBtn.click();
      await page.waitForTimeout(200);

      const drawerTargets = await page.evaluate(() => {
        const drawer = document.getElementById('mobile-nav-drawer');
        if (!drawer) return null;
        const closeBtn = drawer.querySelector('button[aria-label="Tutup menu navigasi"]');
        const links = Array.from(drawer.querySelectorAll('nav a'));
        const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
        const linkHeights = links.map((l) => l.getBoundingClientRect().height);

        return {
          closeWidth: closeRect ? Math.round(closeRect.width * 10) / 10 : 0,
          closeHeight: closeRect ? Math.round(closeRect.height * 10) / 10 : 0,
          minLinkHeight: Math.min(...linkHeights),
        };
      });

      assert(
        'Drawer Close button touch target >= 44x44px',
        drawerTargets && drawerTargets.closeWidth >= 44 && drawerTargets.closeHeight >= 44,
        { width: drawerTargets?.closeWidth, height: drawerTargets?.closeHeight }
      );
      assert(
        'Drawer primary links touch target height >= 44px',
        drawerTargets && drawerTargets.minLinkHeight >= 44,
        { minLinkHeight: drawerTargets?.minLinkHeight }
      );

      await page.close();
    }

    // -------------------------------------------------------------
    // 5. DRAWER LIFECYCLE, SCROLL LOCK, KEYBOARD & RESIZE
    // -------------------------------------------------------------
    console.log('\n--- 5. DRAWER LIFECYCLE & MUTUAL EXCLUSIVITY ---');
    {
      const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
      await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      const hamburger = page.locator('header button[aria-label="Menu navigasi"]');

      // 5.1 Open & Close via Close button
      await hamburger.click();
      await page.waitForTimeout(150);
      let s = await page.evaluate(() => ({
        open: !!document.getElementById('mobile-nav-drawer'),
        overflow: document.body.style.overflow,
      }));
      assert('Drawer opens with body overflow "hidden"', s.open && s.overflow === 'hidden');

      const closeBtn = page.locator('button[aria-label="Tutup menu navigasi"]');
      await closeBtn.click();
      await page.waitForTimeout(150);
      s = await page.evaluate(() => ({
        open: !!document.getElementById('mobile-nav-drawer'),
        overflow: document.body.style.overflow,
      }));
      assert('Drawer closes via close button and restores body overflow', !s.open && s.overflow !== 'hidden');

      // 5.2 Close via Escape key
      await hamburger.click();
      await page.waitForTimeout(150);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      s = await page.evaluate(() => ({
        open: !!document.getElementById('mobile-nav-drawer'),
        overflow: document.body.style.overflow,
      }));
      assert('Drawer closes via Escape key and restores body overflow', !s.open && s.overflow !== 'hidden');

      // 5.3 Close via Backdrop tap
      await hamburger.click();
      await page.waitForTimeout(150);
      await page.mouse.click(350, 300);
      await page.waitForTimeout(150);
      s = await page.evaluate(() => ({
        open: !!document.getElementById('mobile-nav-drawer'),
        overflow: document.body.style.overflow,
      }));
      assert('Drawer closes via Backdrop click and restores body overflow', !s.open && s.overflow !== 'hidden');

      // 5.4 Auto-close on resize to desktop (>= 1024px)
      await hamburger.click();
      await page.waitForTimeout(150);
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(200);
      s = await page.evaluate(() => ({
        open: !!document.getElementById('mobile-nav-drawer'),
        overflow: document.body.style.overflow,
      }));
      assert('Drawer auto-closes when resizing to desktop (1024px)', !s.open && s.overflow !== 'hidden');

      await page.close();
    }

    console.log(`\n=============================================================`);
    console.log(`REVIEWER INDEPENDENT SUITE: ${results.passed} PASSED, ${results.failed} FAILED`);
    console.log(`=============================================================`);

  } finally {
    await browser.close();
  }
}

runReviewerVerification().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
