// @ts-check
/**
 * Empirical Verification Harness: Milestone 1 Touch Target & Interaction Stress Suite
 * Challenger: M1-2 (critic, specialist)
 * Target: Kstream Mobile Responsiveness & Netflix Mirror UI/UX Stabilization
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3456';

const VIEWPORTS = [
  { name: 'Samsung Galaxy S-series (360x740)', width: 360, height: 740, isMobile: true, hasTouch: true },
  { name: 'iPhone SE (375x667)', width: 375, height: 667, isMobile: true, hasTouch: true },
  { name: 'iPhone 12/13/14 (390x844)', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'iPhone 11 / XR (414x896)', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: 'iPhone 14/15/16 Pro Max (430x932)', width: 430, height: 932, isMobile: true, hasTouch: true },
];

const DESKTOP_VIEWPORT = { name: 'Desktop (1024x768)', width: 1024, height: 768, isMobile: false, hasTouch: false };

const RESULTS = {
  total: 0,
  passed: 0,
  failed: 0,
  measurements: [],
  interactions: [],
  failures: [],
};

function recordTest(category, name, passed, details = {}) {
  RESULTS.total++;
  if (passed) {
    RESULTS.passed++;
    console.log(`  ✓ [PASS] [${category}] ${name}`);
  } else {
    RESULTS.failed++;
    RESULTS.failures.push({ category, name, details });
    console.error(`  ✗ [FAIL] [${category}] ${name}`);
    console.error(`     Details:`, JSON.stringify(details, null, 2));
  }
}

async function injectAuthMock(page) {
  // Mock Firebase auth via indexedDB and network route
  await page.route('**/accounts:lookup**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [
          {
            localId: 'challenger-test-uid',
            email: 'challenger@kstream.test',
            emailVerified: true,
            displayName: 'Empirical Challenger',
            providerUserInfo: [],
            validSince: '1234567890',
            lastLoginAt: '1234567890',
            createdAt: '1234567890',
          },
        ],
      }),
    });
  });

  await page.addInitScript(() => {
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
        db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('firebaseLocalStorage', 'readwrite');
      tx.objectStore('firebaseLocalStorage').put({
        fbase_key: 'firebase:authUser:AIzaSyAfJT_0Krn-2cd5AZZx7_0nqDKeNlw88Os:[DEFAULT]',
        value: {
          uid: 'challenger-test-uid',
          email: 'challenger@kstream.test',
          emailVerified: true,
          displayName: 'Empirical Challenger',
          isAnonymous: false,
          photoURL: null,
          phoneNumber: null,
          tenantId: null,
          providerData: [],
          apiKey: 'AIzaSyAfJT_0Krn-2cd5AZZx7_0nqDKeNlw88Os',
          appName: '[DEFAULT]',
          stsTokenManager: {
            apiKey: 'AIzaSyAfJT_0Krn-2cd5AZZx7_0nqDKeNlw88Os',
            refreshToken: 'mock-refresh-token',
            accessToken: 'mock-access-token',
            expirationTime: Date.now() + 360000000,
          },
          createdAt: String(Date.now()),
          lastLoginAt: String(Date.now()),
        },
      });
    };
  });
}

async function runEmpiricalSuite() {
  console.log('================================================================');
  console.log('EMPIRICAL CHALLENGER M1-2: TOUCH TARGET & INTERACTION SUITE');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // --------------------------------------------------------------------------
  // SECTION 1: LOGGED-OUT TOUCH TARGET GEOMETRIES ACROSS MOBILE VIEWPORTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Touch Target Geometries across Mobile Viewports ---');

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    });
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 1.1 Hamburger button (>= 44x44px)
    const hamburger = await page.$('button[aria-label="Menu navigasi"]');
    if (hamburger) {
      const box = await hamburger.boundingBox();
      const pass = box && box.width >= 43.5 && box.height >= 43.5;
      RESULTS.measurements.push({ viewport: vp.width, element: 'hamburger', width: box?.width, height: box?.height });
      recordTest('TouchTarget', `Hamburger button (${vp.width}px): ${box?.width}x${box?.height}px (>=44x44)`, pass, { box });
    } else {
      recordTest('TouchTarget', `Hamburger button (${vp.width}px) found in DOM`, false, { error: 'Not found' });
    }

    // 1.2 Search button (>= 44x44px)
    const search = await page.$('a[aria-label="Cari film atau series"]');
    if (search) {
      const box = await search.boundingBox();
      const pass = box && box.width >= 43.5 && box.height >= 43.5;
      RESULTS.measurements.push({ viewport: vp.width, element: 'search', width: box?.width, height: box?.height });
      recordTest('TouchTarget', `Search button (${vp.width}px): ${box?.width}x${box?.height}px (>=44x44)`, pass, { box });
    } else {
      recordTest('TouchTarget', `Search button (${vp.width}px) found in DOM`, false, { error: 'Not found' });
    }

    // 1.3 Navbar Auth Buttons: Login & Register (min-height >= 44px)
    const loginBtn = await page.$('header a[href="/login"]');
    if (loginBtn) {
      const box = await loginBtn.boundingBox();
      const pass = box && box.height >= 43.5;
      RESULTS.measurements.push({ viewport: vp.width, element: 'login', width: box?.width, height: box?.height });
      recordTest('TouchTarget', `Login button height (${vp.width}px): ${box?.height}px (>=44)`, pass, { box });
    } else {
      recordTest('TouchTarget', `Login button (${vp.width}px) found in DOM`, false, { error: 'Not found' });
    }

    const registerBtn = await page.$('header a[href="/register"]');
    if (registerBtn) {
      const box = await registerBtn.boundingBox();
      const pass = box && box.height >= 43.5;
      RESULTS.measurements.push({ viewport: vp.width, element: 'register', width: box?.width, height: box?.height });
      recordTest('TouchTarget', `Register button height (${vp.width}px): ${box?.height}px (>=44)`, pass, { box });
    } else {
      recordTest('TouchTarget', `Register button (${vp.width}px) found in DOM`, false, { error: 'Not found' });
    }

    // 1.4 Open Drawer & Measure Drawer Targets
    if (hamburger) {
      await hamburger.click();
      await page.waitForTimeout(200);

      // Drawer Close Button (>= 44x44px)
      const closeBtn = await page.$('button[aria-label="Tutup menu navigasi"]');
      if (closeBtn) {
        const box = await closeBtn.boundingBox();
        const pass = box && box.width >= 43.5 && box.height >= 43.5;
        RESULTS.measurements.push({ viewport: vp.width, element: 'drawer_close', width: box?.width, height: box?.height });
        recordTest('TouchTarget', `Drawer Close button (${vp.width}px): ${box?.width}x${box?.height}px (>=44x44)`, pass, { box });
      } else {
        recordTest('TouchTarget', `Drawer Close button (${vp.width}px) found in DOM`, false, { error: 'Not found' });
      }

      // Drawer Primary Links (height >= 44px)
      const drawerLinks = await page.$$('#mobile-nav-drawer nav a');
      for (const link of drawerLinks) {
        const text = (await link.textContent()).trim();
        const box = await link.boundingBox();
        const pass = box && box.height >= 43.5;
        RESULTS.measurements.push({ viewport: vp.width, element: `drawer_link_${text}`, width: box?.width, height: box?.height });
        recordTest('TouchTarget', `Drawer primary link "${text}" (${vp.width}px): height=${box?.height}px (>=44)`, pass, { text, box });
      }

      // Drawer Category Chips (height >= 38px)
      const categoryChips = await page.$$('#mobile-nav-drawer a[href*="/category/"]');
      if (categoryChips.length > 0) {
        let allChipsPass = true;
        const chipDetails = [];
        for (let i = 0; i < Math.min(categoryChips.length, 6); i++) {
          const chip = categoryChips[i];
          const text = (await chip.textContent()).trim();
          const box = await chip.boundingBox();
          const pass = box && box.height >= 37.5;
          if (!pass) allChipsPass = false;
          chipDetails.push({ text, height: box?.height });
          RESULTS.measurements.push({ viewport: vp.width, element: `category_chip_${text}`, width: box?.width, height: box?.height });
        }
        recordTest('TouchTarget', `Drawer category chips (${vp.width}px): count=${categoryChips.length}, min-h>=38px`, allChipsPass, { chips: chipDetails });
      }

      // Drawer Footer Auth Buttons (height >= 44px)
      const drawerLogin = await page.$('#mobile-nav-drawer a[href="/login"]');
      if (drawerLogin) {
        const box = await drawerLogin.boundingBox();
        const pass = box && box.height >= 43.5;
        RESULTS.measurements.push({ viewport: vp.width, element: 'drawer_auth_login', width: box?.width, height: box?.height });
        recordTest('TouchTarget', `Drawer Login CTA (${vp.width}px): height=${box?.height}px (>=44)`, pass, { box });
      }

      const drawerRegister = await page.$('#mobile-nav-drawer a[href="/register"]');
      if (drawerRegister) {
        const box = await drawerRegister.boundingBox();
        const pass = box && box.height >= 43.5;
        RESULTS.measurements.push({ viewport: vp.width, element: 'drawer_auth_register', width: box?.width, height: box?.height });
        recordTest('TouchTarget', `Drawer Register CTA (${vp.width}px): height=${box?.height}px (>=44)`, pass, { box });
      }

      // Close drawer for next step
      if (closeBtn) {
        await closeBtn.click();
        await page.waitForTimeout(150);
      }
    }

    // 1.5 Footer Navigation Links (min-height >= 44px)
    const footerLinks = await page.$$('footer a');
    if (footerLinks.length > 0) {
      let allFooterPass = true;
      const footerDetails = [];
      for (const flink of footerLinks) {
        const text = (await flink.textContent()).trim();
        const box = await flink.boundingBox();
        const pass = box && box.height >= 43.5;
        if (!pass) allFooterPass = false;
        footerDetails.push({ text, height: box?.height });
        RESULTS.measurements.push({ viewport: vp.width, element: `footer_link_${text}`, width: box?.width, height: box?.height });
      }
      recordTest('TouchTarget', `Footer links (${vp.width}px): ${footerLinks.length} items, all min-h>=44px`, allFooterPass, { links: footerDetails });
    } else {
      recordTest('TouchTarget', `Footer links (${vp.width}px) found in DOM`, false, { error: 'No footer links found' });
    }

    await context.close();
  }

  // --------------------------------------------------------------------------
  // SECTION 2: LOGGED-IN AVATAR & DROPDOWN ITEMS TOUCH TARGET GEOMETRIES
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Logged-in Avatar & Dropdown Touch Targets ---');

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Authenticated Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    });
    const page = await context.newPage();
    await injectAuthMock(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const avatarBtn = await page.$('button[aria-label="Menu profil pengguna"]');
    if (avatarBtn) {
      const box = await avatarBtn.boundingBox();
      const pass = box && box.width >= 43.5 && box.height >= 43.5;
      RESULTS.measurements.push({ viewport: vp.width, element: 'avatar_button', width: box?.width, height: box?.height });
      recordTest('TouchTarget', `Profile avatar button (${vp.width}px): ${box?.width}x${box?.height}px (>=44x44)`, pass, { box });

      // Open profile dropdown
      await avatarBtn.click();
      await page.waitForTimeout(200);

      const menuItems = await page.$$('div[role="menu"] [role="menuitem"]');
      let allMenuPass = true;
      const menuDetails = [];
      for (const item of menuItems) {
        const text = (await item.textContent()).trim();
        const itemBox = await item.boundingBox();
        const pass = itemBox && itemBox.height >= 43.5;
        if (!pass) allMenuPass = false;
        menuDetails.push({ text, height: itemBox?.height });
        RESULTS.measurements.push({ viewport: vp.width, element: `profile_menu_${text}`, width: itemBox?.width, height: itemBox?.height });
      }
      recordTest('TouchTarget', `Profile menu items (${vp.width}px): ${menuItems.length} items, min-h>=44px`, allMenuPass && menuItems.length >= 4, { items: menuDetails });

      // Close menu
      await avatarBtn.click();
      await page.waitForTimeout(150);
    } else {
      recordTest('TouchTarget', `Profile avatar button (${vp.width}px) found in DOM`, false, { error: 'Avatar button not found' });
    }

    await context.close();
  }

  // --------------------------------------------------------------------------
  // SECTION 3: INTERACTION LOGIC & MUTUAL EXCLUSIVITY STRESS TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Mutual Exclusivity Stress Tests ---');

  {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await injectAuthMock(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const hamburger = await page.$('button[aria-label="Menu navigasi"]');
    const avatar = await page.$('button[aria-label="Menu profil pengguna"]');

    // 3.1 Scenario A1: Open Drawer, real tap outside drawer sheet hits modal backdrop and dismisses drawer
    await hamburger.click();
    await page.waitForTimeout(200);
    let drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    recordTest('Interaction', 'Open drawer: drawer is visible', drawerVisible, { drawerVisible });

    // Tap backdrop (outside sheet, e.g. at x=350, y=300)
    await page.mouse.click(350, 300);
    await page.waitForTimeout(200);
    drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    recordTest('Interaction', 'Scenario A1: Tapping backdrop dismisses modal drawer safely', !drawerVisible, { drawerVisible });

    // 3.2 Scenario A2: Open Drawer, then directly trigger Avatar -> Drawer closes, Profile Menu opens (mutual exclusivity)
    await hamburger.click();
    await page.waitForTimeout(200);
    drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Menu profil pengguna"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    let menuVisible = await page.$eval('div[role="menu"]', (el) => window.getComputedStyle(el).opacity === '1').catch(() => false);
    recordTest('Interaction', 'Scenario A2: Triggering Avatar closes Drawer & opens Profile Menu', (!drawerVisible) && menuVisible, { drawerVisible, menuVisible });

    // 3.3 Scenario B: Profile Menu is open, tap Hamburger -> Profile Menu closes, Drawer opens (real user click, unintercepted)
    await hamburger.click();
    await page.waitForTimeout(200);
    drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    menuVisible = await page.$eval('div[role="menu"]', (el) => window.getComputedStyle(el).opacity === '1').catch(() => false);
    recordTest('Interaction', 'Scenario B: Tapping Hamburger closes Profile Menu & opens Drawer', drawerVisible && (!menuVisible), { drawerVisible, menuVisible });

    // 3.4 Scenario C: Tap Close button -> Drawer closes
    const closeBtn = await page.$('button[aria-label="Tutup menu navigasi"]');
    await closeBtn.click();
    await page.waitForTimeout(200);
    drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    recordTest('Interaction', 'Scenario C: Drawer close button closes Drawer', !drawerVisible, { drawerVisible });

    // 3.5 Scenario D: Avatar re-toggle (open -> click again -> close)
    await avatar.click();
    await page.waitForTimeout(150);
    menuVisible = await page.$eval('div[role="menu"]', (el) => window.getComputedStyle(el).opacity === '1').catch(() => false);
    await avatar.click();
    await page.waitForTimeout(150);
    const menuClosed = await page.$eval('div[role="menu"]', (el) => window.getComputedStyle(el).opacity === '0' || window.getComputedStyle(el).pointerEvents === 'none').catch(() => true);
    recordTest('Interaction', 'Scenario D: Tapping Avatar toggles Profile Menu open and closed', menuVisible && menuClosed, { menuVisible, menuClosed });

    // 3.6 Scenario E: Adversarial Rapid Alternation (10 rapid alternating toggles)
    console.log('  Testing 10 rapid alternating toggles (race condition check)...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const h = document.querySelector('button[aria-label="Menu navigasi"]');
        if (h) h.click();
      });
      await page.waitForTimeout(50);
      await page.evaluate(() => {
        const a = document.querySelector('button[aria-label="Menu profil pengguna"]');
        if (a) a.click();
      });
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
    drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    menuVisible = await page.$eval('div[role="menu"]', (el) => window.getComputedStyle(el).opacity === '1').catch(() => false);
    const mutuallyExclusive = !(drawerVisible && menuVisible);
    recordTest('Interaction', 'Scenario E: Rapid alternating toggles maintains mutual exclusivity (never both open)', mutuallyExclusive, { drawerVisible, menuVisible });

    await context.close();
  }

  // --------------------------------------------------------------------------
  // SECTION 4: BODY SCROLL LOCKING STRESS TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Body Scroll Locking & Restoration ---');

  {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Initial state: body overflow should NOT be hidden
    const initialOverflow = await page.evaluate(() => document.body.style.overflow);
    recordTest('ScrollLock', 'Initial body overflow is not hidden', initialOverflow !== 'hidden', { initialOverflow });

    // 4.1 Open drawer -> body overflow locked
    const hamburger = await page.$('button[aria-label="Menu navigasi"]');
    await hamburger.click();
    await page.waitForTimeout(200);
    const lockedOverflow = await page.evaluate(() => document.body.style.overflow);
    recordTest('ScrollLock', 'Body overflow is "hidden" when drawer is open', lockedOverflow === 'hidden', { lockedOverflow });

    // 4.2 Close via Close button (✕) -> body overflow restored
    const closeBtn = await page.$('button[aria-label="Tutup menu navigasi"]');
    await closeBtn.click();
    await page.waitForTimeout(200);
    const restoredOverflowClose = await page.evaluate(() => document.body.style.overflow);
    recordTest('ScrollLock', 'Body overflow restored after Close button dismiss', restoredOverflowClose === initialOverflow, { restored: restoredOverflowClose });

    // 4.3 Open drawer -> Close via Backdrop click -> body overflow restored
    await hamburger.click();
    await page.waitForTimeout(200);
    // Click outside drawer sheet (e.g. at x=350, y=300 on a 375px wide screen; sheet is max 320px)
    await page.mouse.click(350, 300);
    await page.waitForTimeout(200);
    const restoredOverflowBackdrop = await page.evaluate(() => document.body.style.overflow);
    const drawerClosedBackdrop = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    recordTest('ScrollLock', 'Body overflow restored and drawer closed after Backdrop click', (!drawerClosedBackdrop) && restoredOverflowBackdrop === initialOverflow, {
      drawerClosed: !drawerClosedBackdrop,
      restoredOverflow: restoredOverflowBackdrop,
    });

    // 4.4 Open drawer -> Close via Escape key -> body overflow restored
    await hamburger.click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const restoredOverflowEsc = await page.evaluate(() => document.body.style.overflow);
    const drawerClosedEsc = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    recordTest('ScrollLock', 'Body overflow restored and drawer closed after Escape key dismiss', (!drawerClosedEsc) && restoredOverflowEsc === initialOverflow, {
      drawerClosed: !drawerClosedEsc,
      restoredOverflow: restoredOverflowEsc,
    });

    // 4.5 Route navigation dismiss: Open drawer -> Click "Trending" link -> Drawer closes, scroll unlocked
    await hamburger.click();
    await page.waitForTimeout(200);
    const trendingLink = await page.$('#mobile-nav-drawer nav a[href="/movies/trending"]');
    if (trendingLink) {
      await trendingLink.click();
      await page.waitForURL('**/movies/trending');
      await page.waitForTimeout(300);
      const restoredOverflowNav = await page.evaluate(() => document.body.style.overflow);
      const drawerClosedNav = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
      recordTest('ScrollLock', 'Body overflow restored and drawer closed on route navigation', (!drawerClosedNav) && restoredOverflowNav !== 'hidden', {
        drawerClosed: !drawerClosedNav,
        overflow: restoredOverflowNav,
      });
    }

    await context.close();
  }

  // --------------------------------------------------------------------------
  // SECTION 5: ESCAPE KEY DISMISSAL ACCESSIBILITY
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Escape Key Dismissal Accessibility ---');

  {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await injectAuthMock(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 5.1 Profile menu dismiss via Escape
    const avatar = await page.$('button[aria-label="Menu profil pengguna"]');
    await avatar.click();
    await page.waitForTimeout(150);
    let menuVisible = await page.$eval('div[role="menu"]', (el) => window.getComputedStyle(el).opacity === '1').catch(() => false);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    let menuClosed = await page.$eval('div[role="menu"]', (el) => window.getComputedStyle(el).opacity === '0' || window.getComputedStyle(el).pointerEvents === 'none').catch(() => true);
    recordTest('Accessibility', 'Escape key dismisses open Profile dropdown', menuVisible && menuClosed, { menuVisible, menuClosed });

    // 5.2 Drawer dismiss via Escape
    const hamburger = await page.$('button[aria-label="Menu navigasi"]');
    await hamburger.click();
    await page.waitForTimeout(150);
    let drawerVisible = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    let drawerClosed = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    recordTest('Accessibility', 'Escape key dismisses open Mobile Drawer modal', drawerVisible && (!drawerClosed), { drawerVisible, drawerClosed: !drawerClosed });

    await context.close();
  }

  // --------------------------------------------------------------------------
  // SECTION 6: SAFE AREA PADDING & VIEWPORT BOUNDARY VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Safe Area Padding & Viewport Boundaries ---');

  {
    const context = await browser.newContext({
      viewport: { width: 360, height: 740 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 6.1 Drawer Safe Area style inspection
    const hamburger = await page.$('button[aria-label="Menu navigasi"]');
    await hamburger.click();
    await page.waitForTimeout(200);

    const drawerSafeArea = await page.$eval('#mobile-nav-drawer aside', (el) => {
      return {
        paddingTop: el.style.paddingTop,
        paddingBottom: el.style.paddingBottom,
      };
    });
    const drawerSafeOk = drawerSafeArea.paddingTop.includes('env(safe-area-inset-top') &&
                         drawerSafeArea.paddingBottom.includes('env(safe-area-inset-bottom');
    recordTest('SafeArea', 'Drawer sheet applies env(safe-area-inset-top/bottom) padding', drawerSafeOk, drawerSafeArea);

    // 6.2 Footer Safe Area style inspection
    const footerSafeArea = await page.$eval('footer', (el) => {
      return {
        paddingBottom: el.style.paddingBottom,
      };
    });
    const footerSafeOk = footerSafeArea.paddingBottom.includes('env(safe-area-inset-bottom');
    recordTest('SafeArea', 'Footer applies env(safe-area-inset-bottom) padding', footerSafeOk, footerSafeArea);

    // 6.3 Width budget on 360px viewport: zero horizontal overflow
    const overflowEvaluation = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const windowWidth = window.innerWidth;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      return {
        windowWidth,
        scrollWidth,
        hasLeak: scrollWidth > windowWidth,
      };
    });
    recordTest('ViewportBoundary', '360px viewport has zero document horizontal overflow', !overflowEvaluation.hasLeak, overflowEvaluation);

    // 6.4 Desktop resize behavior: resize from 360px with drawer open to 1024px
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(200);
    const drawerAutoClosed = await page.$eval('#mobile-nav-drawer', (el) => !!el).catch(() => false);
    const hamburgerHidden = await page.$eval('button[aria-label="Menu navigasi"]', (el) => window.getComputedStyle(el).display === 'none').catch(() => false);
    const desktopLinksVisible = await page.$eval('header nav, header .hidden.lg\\:flex', (el) => window.getComputedStyle(el).display !== 'none').catch(() => false);

    recordTest('DesktopBoundary', 'Resizing to desktop (1024px) automatically dismisses mobile drawer', !drawerAutoClosed, { drawerPresent: drawerAutoClosed });
    recordTest('DesktopBoundary', 'Hamburger button is hidden on desktop (lg:hidden)', hamburgerHidden, { hamburgerHidden });
    recordTest('DesktopBoundary', 'Desktop navigation links are visible on desktop (hidden lg:flex)', desktopLinksVisible, { desktopLinksVisible });

    await context.close();
  }

  await browser.close();

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('EMPIRICAL SUITE EXECUTION SUMMARY');
  console.log(`Total Assertions Run: ${RESULTS.total}`);
  console.log(`Passed:               ${RESULTS.passed}`);
  console.log(`Failed:               ${RESULTS.failed}`);
  console.log(`VERDICT:              ${RESULTS.failed === 0 ? 'APPROVE' : 'REQUEST_CHANGES'}`);
  console.log('================================================================\n');

  // Write measurements to a JSON artifact for handoff documentation
  const reportPath = path.join(__dirname, 'empirical_m1_2_results.json');
  fs.writeFileSync(reportPath, JSON.stringify(RESULTS, null, 2), 'utf8');
  console.log(`Detailed test report saved to: ${reportPath}`);

  return RESULTS;
}

runEmpiricalSuite().catch((err) => {
  console.error('Test harness execution error:', err);
  process.exit(1);
});
