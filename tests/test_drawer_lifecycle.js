const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const hamburger = page.locator('header button[aria-label="Menu navigasi"]');
  const closeBtn = page.locator('button[aria-label="Tutup menu navigasi"]');

  // Cycle 1: Open via Hamburger, close via Close (X) button
  await hamburger.click();
  await page.waitForTimeout(150);
  const s1 = await page.evaluate(() => ({
    open: !!document.getElementById('mobile-nav-drawer'),
    overflow: document.body.style.overflow,
  }));
  console.log('Cycle 1 (Opened):', s1);

  await closeBtn.click();
  await page.waitForTimeout(150);
  const s1Close = await page.evaluate(() => ({
    open: !!document.getElementById('mobile-nav-drawer'),
    overflow: document.body.style.overflow,
  }));
  console.log('Cycle 1 (Closed via X):', s1Close);

  // Cycle 2: Open via Hamburger, close via Backdrop
  await hamburger.click();
  await page.waitForTimeout(150);
  await page.mouse.click(345, 300); // click backdrop
  await page.waitForTimeout(150);
  const s2Close = await page.evaluate(() => ({
    open: !!document.getElementById('mobile-nav-drawer'),
    overflow: document.body.style.overflow,
  }));
  console.log('Cycle 2 (Closed via Backdrop):', s2Close);

  // Cycle 3: Open via Hamburger, close via Escape
  await hamburger.click();
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const s3Close = await page.evaluate(() => ({
    open: !!document.getElementById('mobile-nav-drawer'),
    overflow: document.body.style.overflow,
  }));
  console.log('Cycle 3 (Closed via Escape):', s3Close);

  const allPassed =
    s1.open && s1.overflow === 'hidden' &&
    !s1Close.open && s1Close.overflow !== 'hidden' &&
    !s2Close.open && s2Close.overflow !== 'hidden' &&
    !s3Close.open && s3Close.overflow !== 'hidden';

  console.log('DRAWER LIFECYCLE VERDICT:', allPassed ? 'PASS' : 'FAIL');

  await browser.close();
})();
