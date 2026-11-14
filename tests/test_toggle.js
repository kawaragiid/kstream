const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const hamburger = page.locator('header button[aria-label="Menu navigasi"]');
  console.log('Initial body overflow:', await page.evaluate(() => document.body.style.overflow));

  for (let i = 1; i <= 6; i++) {
    await hamburger.click();
    await page.waitForTimeout(100);
    const state = await page.evaluate(() => ({
      drawerInDom: !!document.getElementById('mobile-nav-drawer'),
      bodyOverflow: document.body.style.overflow,
    }));
    console.log(`After click ${i}:`, state);
  }

  await browser.close();
})();
