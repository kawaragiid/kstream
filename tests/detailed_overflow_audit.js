const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Test states at 1024px:
  // 1. Current Baseline (gap-6)
  // 2. Nav links gap-4
  // 3. Container gap at lg: lg:gap-5 or lg:gap-6 vs md:gap-8
  // 4. Container px at lg: lg:px-6 vs lg:px-8
  // 5. Check both logged-out state (with Masuk/Daftar) and logged-in state (with profile avatar)

  const viewports = [1024, 1040, 1060, 1080, 1100, 1200, 1279, 1280, 1440];

  console.log('--- DETAILED NAVBAR SPACING & OVERFLOW AUDIT ---');

  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);

    // Baseline audit
    const base = await page.evaluate(() => {
      const header = document.querySelector('header');
      const container = header.querySelector('.container');
      const navLinks = header.querySelector('div.lg\\:flex');
      const rightGroup = header.querySelector('.ml-auto');
      const logo = container.querySelector('a');

      return {
        headerScroll: header.scrollWidth,
        headerClient: header.clientWidth,
        bodyScroll: document.body.scrollWidth,
        overflow: header.scrollWidth - window.innerWidth,
        navLinksWidth: navLinks ? navLinks.getBoundingClientRect().width : 0,
        rightGroupWidth: rightGroup ? rightGroup.getBoundingClientRect().width : 0,
        rightGroupRight: rightGroup ? rightGroup.getBoundingClientRect().right : 0,
        logoWidth: logo ? logo.getBoundingClientRect().width : 0,
      };
    });

    // Proposed audit: div.lg:flex gap-4 (or xl:gap-6 at >= 1280)
    const proposed = await page.evaluate((width) => {
      const header = document.querySelector('header');
      const container = header.querySelector('.container');
      const navLinks = header.querySelector('div.lg\\:flex');
      if (navLinks) {
        if (width >= 1024 && width < 1280) {
          navLinks.style.gap = '16px';
        } else if (width >= 1280) {
          navLinks.style.gap = '24px';
        }
      }
      const rightGroup = header.querySelector('.ml-auto');
      return {
        headerScroll: header.scrollWidth,
        headerClient: header.clientWidth,
        bodyScroll: document.body.scrollWidth,
        overflow: header.scrollWidth - window.innerWidth,
        navLinksWidth: navLinks ? navLinks.getBoundingClientRect().width : 0,
        rightGroupRight: rightGroup ? rightGroup.getBoundingClientRect().right : 0,
      };
    }, w);

    console.log(`[Viewport ${w}px]`);
    console.log(`  Baseline: headerScroll=${base.headerScroll}px, bodyScroll=${base.bodyScroll}px, overflow=${base.overflow > 0 ? '+' + base.overflow + 'px (FAIL)' : '0px (OK)'}, navWidth=${base.navLinksWidth.toFixed(1)}px, rightEdge=${base.rightGroupRight.toFixed(1)}px`);
    console.log(`  Proposed: headerScroll=${proposed.headerScroll}px, bodyScroll=${proposed.bodyScroll}px, overflow=${proposed.overflow > 0 ? '+' + proposed.overflow + 'px (FAIL)' : '0px (OK)'}, navWidth=${proposed.navLinksWidth.toFixed(1)}px, rightEdge=${proposed.rightGroupRight.toFixed(1)}px`);

    await page.close();
  }

  // Now, test logged-out worst-case scenario at 1024px:
  // What if the right group is the full logged-out group (Search button + Masuk + Daftar)?
  console.log('\n--- LOGGED-OUT WORST-CASE STRESS TEST AT 1024px ---');
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);

  const loggedOutSim = await page.evaluate(() => {
    const header = document.querySelector('header');
    const container = header.querySelector('.container');
    const navLinks = header.querySelector('div.lg\\:flex');

    // Simulate logged-out if not already
    let rightGroup = header.querySelector('.ml-auto');
    const hasAuthButtons = rightGroup.querySelector('a[href="/login"]');

    // Test with gap-4 on navLinks
    navLinks.style.gap = '16px';

    const resWithNavOnly = {
      name: 'Proposed Nav gap-4 ONLY',
      headerScroll: header.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflow: header.scrollWidth - 1024,
      navWidth: navLinks.getBoundingClientRect().width,
      rightEdge: rightGroup.getBoundingClientRect().right,
      hasLogin: !!hasAuthButtons,
    };

    // What if we also adjust container gap or padding slightly?
    // E.g. container lg:gap-5 (20px) vs md:gap-8 (32px), or lg:px-6 (24px) vs lg:px-8 (32px)
    container.style.gap = '20px'; // lg:gap-5
    const resWithContainerGap = {
      name: 'Proposed Nav gap-4 + Container gap-5',
      headerScroll: header.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflow: header.scrollWidth - 1024,
      navWidth: navLinks.getBoundingClientRect().width,
      rightEdge: rightGroup.getBoundingClientRect().right,
    };

    return { resWithNavOnly, resWithContainerGap };
  });

  console.log(JSON.stringify(loggedOutSim, null, 2));

  await page.close();
  await browser.close();
})();
