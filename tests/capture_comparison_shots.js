const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Var 1
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      document.querySelector('div.lg\\:flex').style.gap = '16px';
    });
    const header = await page.$('header');
    await header.screenshot({ path: path.join(__dirname, 'var1_gap4_only.png') });
    await page.close();
  }

  // Var 2: gap-4 + whitespace-nowrap
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const nav = document.querySelector('div.lg\\:flex');
      nav.style.gap = '16px';
      nav.style.whiteSpace = 'nowrap';
    });
    const header = await page.$('header');
    await header.screenshot({ path: path.join(__dirname, 'var2_gap4_nowrap.png') });
    await page.close();
  }

  // Var 5: Harmonized (gap-4 + nowrap + container lg:px-6 lg:gap-6)
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const nav = document.querySelector('div.lg\\:flex');
      nav.style.gap = '16px';
      nav.style.whiteSpace = 'nowrap';
      const container = document.querySelector('header .container');
      container.style.paddingLeft = '24px';
      container.style.paddingRight = '24px';
      container.style.gap = '24px';
    });
    const header = await page.$('header');
    await header.screenshot({ path: path.join(__dirname, 'var5_harmonized.png') });
    await page.close();
  }

  console.log('Screenshots captured successfully.');
  await browser.close();
})();
